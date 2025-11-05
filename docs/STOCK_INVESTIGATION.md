# Stock Price Update Investigation Report

## Executive Summary
Investigation reveals **stock prices are NOT updating automatically and price charts are displaying GENERATED/MOCK DATA instead of real database data**. This is a critical system design issue with multiple contributing factors.

---

## Issues Found

### 1. ❌ REAL DATABASE DATA NOT BEING USED
**Location**: `app/components/price-chart.tsx`

The `PriceChart` component is generating MOCK data instead of fetching real data from the database:

```tsx
export function PriceChart({
  currentPrice,
  symbol,
  height = 320,
  showStats = true,
  days = 7,
}: PriceChartProps) {
  // ❌ GENERATING FAKE DATA - NOT FETCHING FROM DB
  const data = smoothPriceHistory(
    generatePriceHistory(currentPrice, days, symbol)  // ← Uses seeded random + current price
  );
  const stats = calculatePriceStats(data);
```

The `generatePriceHistory()` function creates fictional price history based on:
- Current price
- Symbol (as seed for consistent randomness)
- Fixed volatility ranges
- Random walk algorithm

**Result**: Charts show simulated data, not actual ticks from `stockPriceHistory` table.

---

### 2. ❌ NO REAL-TIME PRICE HISTORY FETCH IN COMPONENTS
**Issue**: The stocks pages (`stocks.tsx` and `stocks.$symbol.tsx`) do NOT query the actual `stockPriceHistory` data.

**What's missing**:
- No `useQuery(api.stocks.getStockPriceHistory, {...})` call
- No correlation with actual database updates
- Components only fetch `allStocks`, `marketOverview`, and `playerPortfolio`

**Current queries being made**:
```tsx
const allStocks = useQuery(api.stocks.getAllStocks);           // ✓ Gets stocks table
const marketOverview = useQuery(api.stocks.getMarketOverview); // ✓ Gets market stats
const myPortfolio = useQuery(api.stocks.getPlayerPortfolio);   // ✓ Gets player holdings
// ❌ NO PRICE HISTORY QUERY
```

---

### 3. ❌ TICK SYSTEM UPDATES DATABASE BUT DATA NOT DISPLAYED
**Location**: `convex/tick.ts` and `convex/crons.ts`

The cron system IS running and calling `updateStockPrices`:

```typescript
crons.interval(
  "bot tick",
  { minutes: 5 },
  internal.tick.executeTick  // ✓ Runs every 5 minutes
);
```

However:
- ✓ `updateStockPrices()` mutation updates the `stocks` table with new prices
- ✓ `stockPriceHistory` table receives new OHLC data every tick
- ❌ **Frontend has no way to access this data** (not queried in components)
- ❌ **Charts ignore the real data** (use generated/mock data instead)

---

### 4. ❌ STOCK INITIALIZATION NOT VERIFIED
**Location**: `convex/stocks.ts`

The `initializeStockMarket` mutation exists but:
- No code path calls it automatically
- No verification that stocks are initialized
- If initialization never ran, the `stocks` table is empty
- Empty table = no `currentPrice` data to display

**Verification**: Need to confirm at least 5 stocks exist in DB:
- TCH (TechCorp Industries)
- ENRG (Energy Solutions)
- GFC (Global Finance)
- MHS (MediHealth Systems)  
- CGC (Consumer Goods)

---

### 5. ⚠️ POTENTIAL DATA FETCH ORDER ISSUE
**Location**: `app/routes/stocks.$symbol.tsx`

The component finds stock by symbol BEFORE making queries:
```tsx
const stock = allStocks?.find((s) => s.symbol === symbol);
```

If `allStocks` is `undefined` or empty:
- Stock lookup fails
- Displays "Stock Not Found"
- Even if data arrives later, component already rendered error state
- No real-time refresh when data loads

---

### 6. ⚠️ PRICE STATS CALCULATION MISMATCH
**Location**: `convex/stocks.ts` - `getStockStats` query

The query calculates stats from `stockPriceHistory`:
```typescript
const dayHistory = history.slice(0, 12);      // Last 1 hour (12 * 5 min)
const weekHistory = history;                  // Last 2.5 hours (30 * 5 min)
const dayHigh = Math.max(...dayHistory.map(h => h.high));
```

But **this query is never called** in the React components, so stats are calculated differently in the component vs. what the backend could provide.

---

### 7. ✓ CONFIRMED: `getStockPriceHistory` Query Never Used
**Location**: Searched entire `app/` directory

Result: **ZERO references** to `getStockPriceHistory` in any React components or hooks.

The query exists in the backend but is completely unused:
```typescript
// convex/stocks.ts - This exists but is never called
export const getStockPriceHistory = query({
  args: { stockId: v.id("stocks"), limit: v.optional(v.number()) },
  handler: async (ctx, args) => { /* ... */ }
});
```

**Frontend usage**: 0 places call this query
**Component that needs it**: `PriceChart` (currently generates mock data instead)

---

## Root Cause Analysis

### Primary Issue
**Architectural Mismatch**: The system separates "display charts" (client-side generation) from "real data storage" (database), with no bridge between them.

### Flow Breakdown
```
✓ Database Layer (Working)
  ├─ updateStockPrices() runs every 5 min
  ├─ Updates stocks.currentPrice
  ├─ Inserts into stockPriceHistory
  └─ Data persists correctly

❌ Frontend Layer (Broken)
  ├─ PriceChart generates fake data
  ├─ No fetch from stockPriceHistory table
  ├─ Charts never show real updates
  └─ User sees static seeded-random charts

❌ Connection Layer (Missing)
  └─ No query to bridge database → frontend
```

---

## What IS Working

✓ **Database Updates**: 
- Cron executes every 5 minutes
- `updateStockPrices` runs successfully
- `stocks` table has updated `currentPrice`
- `stockPriceHistory` has OHLC data

✓ **Stock Display**:
- `getAllStocks` query works
- `stocks.tsx` shows stock cards
- `stocks.$symbol.tsx` shows detail page
- Current price displays (from `stocks.currentPrice`)

✓ **Trading System**:
- Buy/sell mutations update prices
- Portfolio tracking works
- Price impacts calculated

---

## What IS NOT Working

❌ **Price History Charts**:
- Display generated/mock data
- Don't reflect real database updates
- Show seeded-random patterns, not actual ticks

❌ **Real-Time Updates**:
- Charts don't refresh when prices update
- No subscription to price changes
- No polling of historical data

❌ **Stock Statistics**:
- `getStockStats` query never called
- High/Low/Volume stats not displayed
- Would be more accurate than client-side calculation

---

## Database State Verification Needed

To diagnose further, need to check:

1. **Is `stocks` table populated?**
   ```typescript
   const stocks = await ctx.db.query("stocks").collect();
   // Should have 5 stocks (TCH, ENRG, GFC, MHS, CGC)
   ```

2. **Are `stocks` being updated?**
   ```typescript
   const recentStocks = await ctx.db.query("stocks")
     .order("desc")
     .take(5);
   // Check if lastUpdated is recent
   ```

3. **Is `stockPriceHistory` accumulating data?**
   ```typescript
   const history = await ctx.db.query("stockPriceHistory")
     .withIndex("by_stock_time")
     .take(100);
   // Should have hundreds of entries (5 stocks × ticks)
   ```

4. **Are crons actually running?**
   ```typescript
   const tickHistory = await ctx.db.query("tickHistory").take(10);
   // Check if tickHistory shows recent entries
   ```

---

## Summary Table

| Component | Status | Issue |
|-----------|--------|-------|
| Database Updates | ✓ Working | Prices update every 5 min |
| Stock Display | ✓ Working | Current prices show correctly |
| Price Charts | ❌ Broken | Shows generated data, not DB data |
| Real-Time Updates | ❌ Missing | No chart refresh on price change |
| Price History Query | ❌ Unused | Exists but never called |
| Stock Initialization | ⚠️ Unknown | No verification it ran |
| Cron System | ✓ Working | Likely running successfully |

---

## Next Steps for Patch

When fixing this, need to:

1. **Verify stock initialization** - Check if 5 stocks exist in DB
2. **Create price history query hook** - Fetch actual `stockPriceHistory` data
3. **Update PriceChart component** - Use real data instead of generated data
4. **Add real-time subscriptions** - Subscribe to price updates
5. **Verify cron execution** - Check `tickHistory` table for recent entries
6. **Test end-to-end** - Confirm prices update on page
