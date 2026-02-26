# Daily Buy API

Express.js API server for managing daily buy entries.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check server status

### Interest Rates (for chart)
- `GET /api/interest-rates?term=12&source=thebank`
  - Query:
    - `term`: `6` or `12` (default `12`)
    - `source`: `thebank | laodong | techcombank` (default `thebank`)
  - Response headers:
    - `X-Data-Source`
    - `X-Last-Crawl-At`
    - `X-Selected-Term`
    - `X-Selected-Source`

- `GET /api/history/summary?source=thebank`
  - Summary by source from `backend/data/interest_history.json`

### Daily Buys
- `GET /api/daily-buys` - Get all daily buy entries
- `POST /api/daily-buys` - Add one or more daily buy entries
  - Body: `DailyBuy | DailyBuy[]`
  - Headers: `X-Auth-Type: authenticated | anonymous` (required)

## Features

- **Rate Limiting**: 60 requests per minute per session
- **Authentication Middleware**: Requires `X-Auth-Type` header
- **CORS**: Configured for UI on port 5173
- **JSON Storage**: Data stored in `data/daily-buys.json`

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)

