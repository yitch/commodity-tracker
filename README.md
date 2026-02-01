# Commodity Tracker

A real-time tracker for stocks, cryptocurrencies, and commodities with a dashboard similar to financial terminals.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Real-time Data**: Prices update every 30 seconds via Massive.com API (formerly Polygon.io)
- **Ticker Autocomplete**: Search and find tickers as you type
- **Multi-Asset Support**: Track stocks, crypto, commodities, and ETFs
- **Comprehensive Metrics**:
  - Current price and market cap
  - P/E and P/S ratios
  - YTD and 1-year performance
  - 52-week high delta
  - Interactive 1-year sparkline charts
  - Moving average indicators (20/50/200 SMA)
  - Relative strength ranking
- **Color-Coded Performance**: Visual indicators from red (poor) to green (strong)
- **Sortable Columns**: Click any column header to sort
- **Persistent Watchlist**: Your assets are saved in the database

## Tech Stack

### Backend
- **Node.js** + **Express** + **TypeScript**
- **Prisma ORM** with PostgreSQL
- **Massive.com API** (formerly Polygon.io) for market data
- **Security**: Helmet, rate limiting, Zod validation

### Frontend
- **React 18** + **TypeScript**
- **Vite** for fast development
- **Tailwind CSS** for styling

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL database (or use [Neon](https://neon.tech) free tier)
- Massive.com API key (free tier available at [massive.com](https://massive.com))

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yitch/commodity-tracker.git
   cd commodity-tracker
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install

   # Create .env file with your PostgreSQL connection and API key
   echo 'DATABASE_URL="postgresql://user:password@localhost:5432/commodity_tracker"' > .env
   echo 'MASSIVE_API_KEY="your_api_key_here"' >> .env

   # Push database schema
   npx prisma db push

   # Start the server
   npm run dev
   ```

3. **Set up the frontend** (new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Open the app**

   Visit [http://localhost:5173](http://localhost:5173)

## Adding Assets

Use ticker symbols to add assets:

| Type | Examples |
|------|----------|
| Stocks | `AAPL`, `MSFT`, `TSLA`, `GOOGL` |
| Crypto | `BTC-USD`, `ETH-USD`, `SOL-USD` |
| Commodities | `GC=F` (Gold), `CL=F` (Oil), `SI=F` (Silver) |
| ETFs | `SPY`, `QQQ`, `VTI` |

## Deployment

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub

2. Click **"New Project"** → **"Deploy from GitHub repo"**

3. Select `yitch/commodity-tracker`

4. Configure the service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. Add PostgreSQL:
   - Click **"+ New"** → **"Database"** → **"PostgreSQL"**
   - Railway auto-sets `DATABASE_URL`

6. Add environment variables:
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://your-app.vercel.app` (add after Vercel deploy)

7. After deploy, go to **Settings** → **Networking** → **Generate Domain**

8. Run database migration (in Railway shell or deploy command):
   ```bash
   npx prisma db push
   ```

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub

2. Click **"Add New Project"** → Import `yitch/commodity-tracker`

3. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite

4. Add environment variable:
   - `VITE_API_URL` = `https://your-railway-backend.up.railway.app/api`

5. Click **Deploy**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assets` | List all tracked assets with live data |
| POST | `/api/assets` | Add asset `{ ticker, type }` |
| DELETE | `/api/assets/:ticker` | Remove asset from watchlist |
| GET | `/api/assets/:ticker` | Get single asset quote |
| GET | `/api/assets/search/:query` | Search for assets |
| GET | `/health` | Health check |

## Security Features

- **Rate Limiting**: 60 requests/min (10 for writes)
- **Input Validation**: Zod schemas for all inputs
- **Security Headers**: Helmet middleware
- **CORS**: Configured for production origins
- **Error Handling**: No sensitive data leakage

## Project Structure

```
commodity-tracker/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express app entry
│   │   ├── routes/assets.ts      # API routes
│   │   ├── services/yahooFinance.ts
│   │   ├── middleware/           # Validation & error handling
│   │   └── validation/           # Zod schemas
│   ├── prisma/schema.prisma      # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/           # React components
│   │   ├── hooks/                # Custom hooks
│   │   ├── services/api.ts       # API client
│   │   └── types/                # TypeScript types
│   └── package.json
└── README.md
```

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@host:5432/database
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
PORT=3001
MASSIVE_API_KEY=your_massive_api_key
```

### Frontend (.env)
```env
VITE_API_URL=https://your-backend.railway.app/api
```

## License

MIT

## Contributing

Pull requests are welcome. For major changes, please open an issue first.
