# Quick API test

After `npm start`:

## Health
GET http://localhost:3000/api/health

## Register
POST http://localhost:3000/api/auth/register

JSON:
{
  "name": "Demo Trader",
  "email": "demo@example.com",
  "password": "DemoPass123!"
}

The response contains a JWT token. Send it as:

Authorization: Bearer YOUR_TOKEN

## Markets
GET http://localhost:3000/api/markets

## Current account
GET http://localhost:3000/api/me

## Demo trade
POST http://localhost:3000/api/trades

{
  "instrument": "EUR/USD",
  "side": "BUY",
  "volume": 0.10
}
