# Solana Pyth API

<p align="center">

[![Demo](https://img.shields.io/badge/Demo-Solana%20Pyth%20API%20live%20app-c2410c?style=for-the-badge&logo=googlechrome&logoColor=white)](https://solana-pyth-api.vybenetwork.com?utm_source=pyth-api-readme&utm_medium=referral)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-5b21b6?style=for-the-badge&logo=github&logoColor=white)](https://github.com/vybenetwork/solana-pyth-api)
[![API Key](https://img.shields.io/badge/Vybe-API%20key-1e3a8a?style=for-the-badge&logo=gitbook&logoColor=white)](https://vybe.fyi/api-pricing?utm_source=pyth-api-readme&utm_medium=referral)
[![X](https://img.shields.io/badge/X-Vybe__Network-000000?style=for-the-badge&logo=x)](https://x.com/Vybe_Network)
</p>

Explore Solana Pyth API price feeds with the Vybe Solana API: live USD prices, OHLC candles, historical price series, product metadata and oracle tools.

Try the live demo: [`https://solana-pyth-api.vybenetwork.com`](https://solana-pyth-api.vybenetwork.com?utm_source=pyth-api-readme&utm_medium=referral)

![Solana Pyth API app](screenshots/solana-pyth-api-app-demo.jpg)

---

## Endpoints used

| Vybe API | Local proxy |
|----------|-------------|
| `GET /v4/oracle/pyth/pricefeeds` | `GET /api/pyth/pricefeeds` |
| `GET /v4/oracle/pyth/pricefeeds/{priceFeedAddress}/price` | `GET /api/pyth/pricefeeds/:feed/price` |
| `GET /v4/oracle/pyth/pricefeeds/{priceFeedAddress}/candles` | `GET /api/pyth/pricefeeds/:feed/candles` |
| `GET /v4/oracle/pyth/pricefeeds/{priceFeedAddress}/price-ts` | `GET /api/pyth/pricefeeds/:feed/price-ts` |
| `GET /v4/oracle/pyth/products/{productAddress}` | `GET /api/pyth/products/:product` |

## Prerequisites

- **Node.js** ≥ 20
- A [Vybe Data API key](https://vybe.fyi/api-pricing?utm_source=pyth-api-readme&utm_medium=referral)

## Quick start

```bash
cp .env.example .env
# set VYBE_DATA_API_KEY in .env

npm install
npm run dev
```

Open http://localhost:3009

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` / `npm start` | Run the API + demo UI |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run typecheck` | Typecheck only |

## Related demos

- [Solana OHLC API](https://github.com/vybenetwork/solana-ohlc-api) — DEX token/market candles
- [Solana Trades API](https://github.com/vybenetwork/solana-trades-api) — historical trade data
- [Solana Balances API](https://github.com/vybenetwork/solana-balances-api) — wallet holdings

This repo focuses on **Pyth oracle** data only (not DEX OHLC/trades).
