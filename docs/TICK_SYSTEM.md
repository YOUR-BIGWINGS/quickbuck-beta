# Tick System - Game Economy Updates

## Overview

The tick system is the core of the Quickbuck game economy. Every tick (currently every 5 minutes):

1. **Bot purchases** marketplace products based on attractiveness scoring
2. **Stock prices** update based on company fundamentals and market sentiment  
3. **Crypto prices** update with random walk and volatility
4. **Loan interest** is applied to active loans
5. **Tick history** is recorded for analysis

## How to Run Ticks

### Option 1: Manual Trigger via Admin Dashboard (Development)
1. Navigate to `/admin/tick`
2. Click "Execute Tick" button
3. View recent tick history and results

### Option 2: HTTP API Endpoint (External Scheduler)
```bash
curl -X POST https://your-deployment.convex.cloud/api/tick
```

Response:
```json
{
  "success": true,
  "data": {
    "tickNumber": 42,
    "tickId": "...",
    "botPurchases": 5,
    "stockUpdates": 12,
    "cryptoUpdates": 8
  }
}
```

You can set up external schedulers (AWS Lambda, Vercel Cron, Zapier, etc.) to call this endpoint every 5 minutes.

### Option 3: Automatic Crons (Production Only)
If deployed to Convex production with a Pro plan, the cron job is automatically configured:
- Defined in `convex/crons.ts`
- Runs every 5 minutes
- Calls `internal.tick.executeTick`

**Note**: Convex crons only work in production deployments with Pro or higher plan.

## Development Mode

In development mode (`npx convex dev`), crons do NOT run automatically. Use one of the first two options above.

To test the tick system during development:
1. Use the `/admin/tick` page for manual testing
2. Or set up a local scheduler (like `node-cron`) to call the HTTP endpoint

## Tick History

View recent tick executions:
- **Admin Dashboard**: `/admin/tick` shows last 10 ticks
- **Database**: Check `tickHistory` table for full history with:
  - `tickNumber`: Sequential tick ID
  - `timestamp`: When tick ran
  - `botPurchases`: Array of bot purchase records
  - `stockPriceUpdates`: Stock price changes
  - `cryptoPriceUpdates`: Crypto price changes
  - `totalBudgetSpent`: Total bot spending in cents

## Algorithms

### Bot Purchase Algorithm
- Scores each product by:
  - Quality rating
  - Price preference (favors $100-500 range)
  - Demand score (recent sales)
  - Unit price penalty
- Allocates bot budget proportionally to attractiveness
- See `convex/docs/AUTO_PRODUCT_ALGO.md` for details

### Stock Price Algorithm  
- Updates based on:
  - Company fundamentals (revenue × multiple)
  - Growth rate and sentiment
  - Mean reversion (moves toward fundamental price)
  - Random volatility
  - Max 20% change per tick
- Updates company market cap
- Records price history for charts
- See `convex/docs/STOCK_MARKET_ALGO.md` for details

### Crypto Price Algorithm
- Higher volatility than stocks (default 1.2 volatility)
- Random walk with no mean reversion (more speculative)
- Max 30% change per tick
- Records price history for charts
- See `convex/docs/CRYPTO_MARKET_ALGO.md` for details

### Loan Interest
- Applied every 5 minutes (20-minute tick converted to 5-minute)
- Formula: `interestAmount = remainingBalance × (5% / 72)`
- 72 intervals per day = 24 hours ÷ 20 minutes
- Deducted from player balance immediately
- Recorded in `loans` table

## Troubleshooting

### Ticks aren't running automatically
- **In dev mode**: Normal behavior. Use `/admin/tick` to manually trigger.
- **In production**: Check Convex dashboard for cron job status.

### Ticks are failing
1. Check Convex deployment logs
2. Verify all required data exists (companies, stocks, cryptos, products)
3. Try manual trigger from `/admin/tick` to see error message
4. Check tick history in database for details

### Ticks running too slowly
- Reduce the number of stocks/cryptos being updated
- Optimize database queries
- Consider increasing bot budget to process fewer products

## Configuration

### Change Tick Frequency
Edit `convex/crons.ts`:
```typescript
// Change from 5 minutes to 1 minute
crons.interval("bot tick", { minutes: 1 }, internal.tick.executeTick);
```

### Change Bot Budget
Edit bot budget in game config:
```typescript
// In admin panel or database, set gameConfig.botBudget (in cents)
// Default: 10,000,000 cents = $100,000
```

### Change Price Algorithms
Edit `convex/tick.ts` functions:
- `updateStockPrices()`: Stock price logic
- `updateCryptoPrices()`: Crypto price logic
- `applyLoanInterest()`: Interest calculation
- `executeBotPurchases()`: Product scoring

## Next Steps

1. **Monitor tick performance**: Track how many purchases/updates per tick
2. **Adjust parameters**: Fine-tune algorithm parameters based on game state
3. **Add analytics**: Dashboard to visualize tick impact on economy
4. **Implement tick multiplier**: During rush hours, run ticks more frequently
5. **Add external data**: Integrate real market feeds (optional)
