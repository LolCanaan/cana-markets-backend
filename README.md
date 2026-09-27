# Cana Markets V2 — Backend Foundation

This is the next technical layer for the Cana Markets website.

## Included
- Node.js + Express API
- SQLite database for development
- Secure password hashing with bcrypt
- JWT authentication
- User registration/login
- Demo trading endpoints
- Demo wallet endpoint
- Market-data placeholder endpoint
- Admin endpoints
- Audit log foundation

## Run locally

1. Install Node.js (LTS).
2. Open a terminal in this folder.
3. Run:
   npm install
4. Copy `.env.example` to `.env`.
5. Change `JWT_SECRET` and the admin credentials.
6. Run:
   npm start

API:
http://localhost:3000

Health check:
GET /api/health

## Important production note

This is a development/MVP backend foundation. It is NOT ready to hold real client funds or execute real financial orders.

Before production use, add:
- PostgreSQL or another production database
- HTTPS and secure secrets management
- robust session/token strategy and MFA
- rate limiting and abuse protection
- validation and security headers
- production logging/monitoring
- KYC/AML workflows and approved provider
- real market-data provider
- broker/liquidity/execution integration
- double-entry ledger and reconciliation
- deposits/withdrawals/payment controls
- risk/margin engine
- permissions and admin controls
- backups/disaster recovery
- legal/regulatory review for each target market

The current trade endpoint deliberately creates DEMO orders only.
