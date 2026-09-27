require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const db = require("./db");
const { sign, requireAuth, requireAdmin } = require("./auth");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(x => x.trim()) : true
}));
app.use(express.json());

function log(userId, action, details = "") {
  db.prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)")
    .run(userId || null, action, details);
}

const prices = {
  "EUR/USD": 1.17420,
  "GBP/USD": 1.34210,
  "XAU/USD": 3745.20,
  "BTC/USD": 65420.00
};

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "Cana Markets API", mode: "demo" });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 6)
      return res.status(400).json({ error: "Name, email and password (6+ chars) are required" });

    const normalized = email.trim().toLowerCase();
    const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(normalized);
    if (exists) return res.status(409).json({ error: "Email already registered" });

    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)"
    ).run(name.trim(), normalized, hash);

    db.prepare("INSERT INTO accounts (user_id) VALUES (?)").run(result.lastInsertRowid);
    log(result.lastInsertRowid, "REGISTER", normalized);

    const user = db.prepare(
      "SELECT id,name,email,role,status,kyc_status,created_at FROM users WHERE id=?"
    ).get(result.lastInsertRowid);

    res.status(201).json({ user, token: sign(user) });
  } catch (e) {
    res.status(500).json({ error: "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email=?").get((email || "").trim().toLowerCase());
  if (!user || !(await bcrypt.compare(password || "", user.password_hash)))
    return res.status(401).json({ error: "Invalid email or password" });
  if (user.status !== "active") return res.status(403).json({ error: "Account is not active" });

  const safe = { id:user.id,name:user.name,email:user.email,role:user.role,status:user.status,kyc_status:user.kyc_status };
  log(user.id, "LOGIN");
  res.json({ user:safe, token:sign(safe) });
});

app.get("/api/me", requireAuth, (req,res) => {
  const user = db.prepare(
    "SELECT id,name,email,role,status,kyc_status,created_at FROM users WHERE id=?"
  ).get(req.user.id);
  const account = db.prepare("SELECT id,currency,balance,equity,created_at FROM accounts WHERE user_id=?").get(req.user.id);
  res.json({ user, account });
});

app.get("/api/markets", (req,res) => {
  res.json(Object.entries(prices).map(([instrument, price]) => ({
    instrument, price,
    change: instrument === "BTC/USD" ? -0.45 : instrument === "XAU/USD" ? 0.61 : instrument === "EUR/USD" ? 0.32 : 0.18
  })));
});

app.get("/api/trades", requireAuth, (req,res) => {
  res.json(db.prepare(
    "SELECT id,instrument,side,volume,price,status,created_at FROM trades WHERE user_id=? ORDER BY id DESC"
  ).all(req.user.id));
});

app.post("/api/trades", requireAuth, (req,res) => {
  const { instrument, side, volume } = req.body;
  if (!prices[instrument] || !["BUY","SELL"].includes(side) || !Number.isFinite(Number(volume)) || Number(volume) <= 0)
    return res.status(400).json({ error: "Invalid demo order" });

  const price = prices[instrument];
  const result = db.prepare(
    "INSERT INTO trades (user_id,instrument,side,volume,price) VALUES (?,?,?,?,?)"
  ).run(req.user.id, instrument, side, Number(volume), price);

  log(req.user.id, "DEMO_TRADE", JSON.stringify({ instrument,side,volume,price }));
  res.status(201).json({
    id: result.lastInsertRowid, instrument, side, volume:Number(volume), price, status:"OPEN",
    message:"Demo order created. No real order was executed."
  });
});

app.post("/api/wallet/demo-deposit", requireAuth, (req,res) => {
  const amount = Number(req.body.amount || 500);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100000)
    return res.status(400).json({ error:"Invalid demo amount" });

  db.prepare("UPDATE accounts SET balance=balance+?, equity=equity+? WHERE user_id=?")
    .run(amount, amount, req.user.id);
  log(req.user.id, "DEMO_DEPOSIT", String(amount));
  const account = db.prepare("SELECT * FROM accounts WHERE user_id=?").get(req.user.id);
  res.json({ account, message:"Demo funds only. No money was transferred." });
});

app.get("/api/admin/users", requireAuth, requireAdmin, (req,res) => {
  res.json(db.prepare(
    "SELECT id,name,email,role,status,kyc_status,created_at FROM users ORDER BY id DESC"
  ).all());
});

app.get("/api/admin/trades", requireAuth, requireAdmin, (req,res) => {
  res.json(db.prepare(
    "SELECT t.*,u.email FROM trades t JOIN users u ON u.id=t.user_id ORDER BY t.id DESC"
  ).all());
});

app.get("/api/admin/audit", requireAuth, requireAdmin, (req,res) => {
  res.json(db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500").all());
});

app.listen(PORT, () => console.log(`Cana Markets API running on http://localhost:${PORT}`));
