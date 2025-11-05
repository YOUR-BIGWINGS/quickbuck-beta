# Cryptocurrency System Setup

## Overview
The cryptocurrency system is now fully implemented and integrated into the game. This guide explains how to get started.

## Initial Setup

### 1. Create Cryptocurrencies
Use the Admin Panel (`/panel`) to create cryptocurrencies:

1. Navigate to the **Cryptocurrencies** tab
2. Click **➕ Create Cryptocurrency**
3. Fill in the details:
   - **Name**: e.g., "GameCoin", "QuickCoin"
   - **Symbol**: e.g., "GMC", "QCK" (uppercase)
   - **Initial Supply**: Total coins available (e.g., 1,000,000)
   - **Initial Price**: Starting price in USD (e.g., 1.00)
   - **Liquidity** (optional): Pool size for trades. Default = 10% of supply
   - **Base Volatility** (optional): Daily volatility factor (0.05-0.2 recommended, default 0.1)

### 2. Access the Trading Interface
Players can access the crypto market at `/crypto` which includes:
- **Market View**: Browse all cryptocurrencies with real-time prices
- **Portfolio View**: View personal holdings, P&L, and transaction history
- **Trading**: Buy and sell cryptocurrencies with live price updates

## Architecture

### Database Tables
- **cryptocurrencies**: Coin metadata and current market data
- **cryptoPriceHistory**: OHLC data for charting (5-minute intervals)
- **playerCryptoWallets**: Player holdings and investment tracking
- **cryptoTransactions**: Complete audit trail of all trades

### Price Algorithm
The system uses a Geometric Brownian Motion (GBM) inspired model:
- **Volatility**: Configurable daily volatility with clustering
- **Momentum**: Trend following based on recent price history
- **Random Events**: 5% chance per tick of ±10-30% movements
- **Price Impact**: Trades instantly move prices based on liquidity
- **Bounds**: ±50% per tick maximum, minimum $0.01

### Update Schedule
- **Every 5 minutes**: Automated tick updates all crypto prices
- **Instantly**: Player trades update prices immediately
- **Real-time**: Client updates via Convex subscriptions

## Key Features

### For Players
✅ Real-time price updates and live charts
✅ Buy/sell with instant execution
✅ Portfolio tracking with profit/loss calculations
✅ Complete transaction history
✅ Crypto holdings included in net worth

### For Admins
✅ Create unlimited cryptocurrencies
✅ Configure volatility and liquidity parameters
✅ Monitor all market activity
✅ Delete cryptocurrencies (with audit logging)
✅ View comprehensive market statistics

## API Endpoints

### Mutations (Player)
- `buyCrypto(cryptoId, amount)` - Buy coins
- `sellCrypto(cryptoId, amount)` - Sell coins

### Mutations (Admin)
- `createCryptocurrency(...)` - Create new coin
- `updateCryptoParameters(...)` - Adjust volatility/liquidity

### Queries (All Players)
- `getAllCryptos()` - List all cryptocurrencies
- `getCryptoBySymbol(symbol)` - Get specific coin
- `getPriceHistory(cryptoId, limit)` - Get OHLC data
- `getMarketStats()` - Total market cap, volume, count
- `getMyPortfolio()` - Player's holdings with values
- `getMyTransactions(...)` - Trade history
- `getPlayerCryptoValue(playerId)` - Calculate total value

## Net Worth Integration

Crypto holdings are automatically included in:
- Player net worth calculations
- Leaderboard rankings
- Portfolio summaries

Formula: `netWorth = cash + stocks + crypto + companies - loans`

## Security

✅ **Atomic Transactions**: All trades are atomic and validated
✅ **Balance Checks**: Players can't spend more than they have
✅ **Supply Limits**: Can't buy more coins than available
✅ **Price Bounds**: Prevents extreme single-tick movements
✅ **Admin Only**: Only admins can create cryptocurrencies
✅ **Role-based**: Banned/limited players can't trade

## Troubleshooting

### Prices not updating?
- Check that cron jobs are running: `Executing tick #` in logs
- Verify `updateCryptoPrices` is called in tick.ts

### Can't create crypto?
- Ensure you're logged in as an admin
- Check that symbol is unique and not empty

### Trade failed?
- Verify sufficient balance for buys
- Verify wallet balance for sells
- Check for network connectivity

## Examples

### Create a cryptocurrency via API
```typescript
const cryptoId = await mutation(api.crypto.createCryptocurrency, {
  name: "MyGameCoin",
  symbol: "MGC",
  initialSupply: 5000000,
  initialPrice: 0.50,
  baseVolatility: 0.15,
  liquidity: 500000,
});
```

### Buy cryptocurrency
```typescript
const result = await mutation(api.crypto.buyCrypto, {
  cryptoId: "...",
  amount: 100,
});
// result.newPrice, result.totalCost, result.priceImpact
```

### Get portfolio
```typescript
const portfolio = await query(api.crypto.getMyPortfolio);
// portfolio[].currentValue, portfolio[].profitLoss, portfolio[].profitLossPercent
```

## Performance Considerations

- Queries use optimized Convex indexes
- Price history limited to 100 records by default (configurable)
- Transactions calculated on-the-fly for accuracy
- All operations optimized for real-time updates

## Future Enhancements

Potential additions:
- Staking/yield farming
- Market limit orders
- Advanced charting (candlestick, volume indicators)
- Price alerts/notifications
- Social trading features
- Cross-coin trading pairs
