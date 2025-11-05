# Stock Market Engine - Technical Implementation

## Overview
Complete rewrite of stock market simulation with realistic price dynamics, volatility modeling, and fairness controls.

## Core Features Implemented

### 1. Price Calculation Algorithm
- **Ornstein-Uhlenbeck Process**: Mean-reverting stochastic model for realistic price movements
- **Fair Value Calculation**: Based on company fundamentals (revenue, multiples, earnings)
- **Volatility Clustering**: Increased volatility after large price moves (mimics real markets)
- **Sector Correlations**: Stocks in same sector move together with correlated drift
- **Momentum Effects**: Short-term price continuation patterns

### 2. Trade Execution
- **Bid/Ask Spread**: 0.1% spread between buy and sell prices
- **Price Impact**: Instant price updates based on trade volume relative to total shares
- **Impact Caps**: Maximum 2% price change per trade (fairness control)
- **Validation**: Comprehensive checks for NaN, overflow, and invalid states

### 3. Automated Tick Updates (Every 5 Minutes)
- **Sub-Tick Simulation**: 5 sub-intervals per tick for realistic OHLC candlestick data
- **Random Events**: 10% probability of market events (earnings, news, analyst changes)
- **Volume Tracking**: Aggregates all trades within tick interval
- **Multi-Sector Processing**: Each sector gets correlated drift factor

### 4. Data Models
All existing schema preserved, utilizing:
- `stocks`: Current price, market cap, total shares
- `stockPriceHistory`: OHLC data with timestamps for charting
- `stockTrades`: Buy/sell records with price impact tracking
- `userStockHoldings`: Portfolio management with average cost basis

### 5. Fairness & Security
- Maximum price changes capped per trade and per tick
- Minimum price floor ($1.00 = 100 cents)
- Safe integer validation throughout
- Atomic transactions with rollback on failure
- No insider advantages - all players see same real-time data

## Implementation Details

### Constants (CONFIG object)
```typescript
MAX_TRADE_IMPACT: 0.02      // 2% max per trade
MAX_TICK_CHANGE: 0.10       // 10% max per tick
BID_ASK_SPREAD: 0.001       // 0.1%
BASE_VOLATILITY: 0.03       // 3% daily
THETA: 0.01                 // Mean reversion speed
SUB_TICKS: 5                // OHLC granularity
EVENT_PROBABILITY: 0.10     // 10% chance per tick
MIN_PRICE: 100              // $1.00 floor
```

### Key Functions

#### `buyStock()`
- Validates shares and calculates ask price with spread
- Deducts funds from buyer, credits company
- Updates holdings with weighted average cost
- Applies instant buy pressure (price increase)
- Records transaction and trade history
- Maximum 2% impact per trade

#### `sellStock()`
- Validates holdings and calculates bid price with spread
- Checks company liquidity before executing
- Credits seller, deducts from company
- Applies instant sell pressure (price decrease)
- Cannot short-sell (must own shares)

#### `tickUpdate()` [Internal Mutation]
- Groups stocks by sector for correlation
- Calculates global market trend
- For each stock:
  - Calculates fair value from fundamentals
  - Applies Ornstein-Uhlenbeck drift + noise
  - Simulates 5 sub-ticks for realistic OHLC
  - Random event injection (10% probability)
  - Volatility clustering based on recent moves
  - Records complete OHLC candlestick data

### Random Number Generation
- `randomNormal()`: Box-Muller transform for Gaussian distribution
- `randomUniform()`: Standard uniform distribution
- Both used for realistic market noise

### Price Calculation Flow
```
Current Price
  → Fair Value (from company fundamentals)
  → Ornstein-Uhlenbeck drift (mean reversion)
  → Sector correlation (group movements)
  → Volatility noise (random walk)
  → Momentum factor (short-term trend)
  → Random events (10% probability)
  → Sub-tick simulation (5 intervals)
  → OHLC extraction (open, high, low, close)
  → Validation & capping
  → Database update
```

## Integration Points

### Cron System (`convex/crons.ts`)
- Triggers every 5 minutes
- Calls `internal.tick.executeTick()`

### Tick Coordinator (`convex/tick.ts`)
- Step 2: Calls `internal.stocks.tickUpdate()`
- Returns results to tick history

### Client Queries
- `getAllStocks()`: Real-time stock list
- `getStockPriceHistory()`: Historical data for charting (1H, 1D, 1W, 1M, 1Y, ALL)
- `getPlayerStockHoldings()`: Portfolio with unrealized gains/losses
- `getRecentStockTrades()`: Recent buy/sell activity

## Testing & Admin Tools

### `updateStockPrice()`
Manual price override for testing/admin purposes with validation.

### `fixBrokenStock()`
Recovery mechanism for stocks in invalid states:
- Calculates recovery price from fundamentals
- Resets to safe values
- Records in price history

### `getBrokenStocks()`
Query to identify stocks with NaN or invalid prices.

## Chart Compatibility
OHLC data format matches standard financial charting libraries:
- Timestamp (Unix milliseconds)
- Open, High, Low, Close prices (in cents)
- Volume (number of shares traded)

Compatible with Chart.js, D3.js, TradingView, etc.

## Performance Considerations
- Sector grouping reduces redundant calculations
- Historical queries use indexed timestamps
- Price history limited by timeframe (no full table scans)
- Sub-tick simulation kept to 5 intervals (balance between realism and performance)

## Realism Features Achieved
✅ Non-linear price movements with volatility clustering
✅ Sector correlations (tech, finance, energy, etc.)
✅ Mean reversion to fundamental values
✅ Random market events (earnings, news)
✅ Bid/ask spreads
✅ Price impact from large trades
✅ OHLC candlestick patterns
✅ Volume tracking
✅ Momentum and trends
✅ Fairness controls (no exploitation possible)

## Migration from Old System
Old system: Simple price impact formula with random walks
New system: Full Ornstein-Uhlenbeck process with multi-factor modeling

**No schema changes required** - seamlessly integrated with existing tables.

All existing API endpoints preserved for backward compatibility.

## Future Extensions (Not Implemented)
- Market hours simulation (9:30 AM - 4:00 PM)
- Dividends and stock splits
- Index funds (S&P 500-style)
- Order book with limit orders
- Short selling mechanics
- Options trading
- 52-week high/low tracking

These can be added incrementally without breaking existing functionality.
