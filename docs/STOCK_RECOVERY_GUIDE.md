# Stock Recovery Guide (NaN Fix)

## How to Fix the JEFF Stock (or any broken stock)

A stock can enter a "broken" state where its price becomes `NaN` (Not-a-Number). The system now includes automatic prevention measures, but if a stock is already in this state, you can recover it.

### Step 1: Access the Admin Panel

1. Navigate to your application's admin area
2. Go to: `/admin/tick`
3. You should see the "Fix Broken Stock (NaN Recovery)" section

### Step 2: Find the Stock ID

You need the stock's database ID. Here's how to find it:

#### Option A: Via Convex Dashboard
1. Go to [dashboard.convex.dev](https://dashboard.convex.dev)
2. Open your project deployment
3. Click on the "stocks" table
4. Find the stock by its ticker (e.g., "JEFF")
5. Copy the `_id` field value (it looks like: `k123456789abc...`)

#### Option B: Via Database Search
1. In the Convex dashboard, go to the stocks table
2. Use the search/filter to find ticker = "JEFF"
3. The ID will be shown in the document details

### Step 3: Execute the Fix

1. In the Admin Panel "Fix Broken Stock" section:
   - Paste the stock ID into the "Stock ID" input field
   - Click the "Recover Stock" button
   - Wait for the operation to complete

2. You should see a green success message showing:
   - Old Price (should be NaN or invalid)
   - New Price (calculated using fundamental pricing)
   - Recovery Method (should be "fundamental_pricing")

### Step 4: Verify Recovery

1. Navigate to the stock detail page
2. Verify the price is now displaying correctly (not NaN)
3. Check that the stock can be traded normally

## How the Recovery Works

When a stock is recovered, the system:

1. **Retrieves the broken stock** from the database
2. **Calculates a fair recovery price** using:
   - Company revenue (annual)
   - Fundamental valuation multiple
   - Total shares outstanding
   - Formula: `(Revenue × Multiple) / Total Shares`
3. **Enforces minimum price** of $1.00
4. **Updates the stock** with the new price
5. **Records the recovery** in price history

## Prevention: What Changed

The system now has multiple layers of NaN prevention:

1. **Input Validation**: All prices and calculations validated before use
2. **Intermediate Checks**: Math operations checked for NaN mid-calculation
3. **Division Guards**: Ensures divisors are never zero
4. **Try-Catch Blocks**: Graceful error handling in price update functions
5. **Value Clamping**: Ensures all factors stay within safe ranges
6. **Minimum Enforcement**: Prices never go below $1.00 (stocks) or $0.01 (crypto)

## If Multiple Stocks Are Broken

Repeat the process for each broken stock:
1. Find the stock ID in the database
2. Enter it into the recovery tool
3. Click "Recover Stock"

The system can recover unlimited stocks, one at a time.

## Troubleshooting

### "Stock not found" error
- Double-check the stock ID is correct
- Ensure you copied the entire ID (it's usually 25+ characters)

### Recovery failed error
- The stock may be missing required company data
- Check that the associated company exists in the database
- Contact support if the issue persists

### Price is still NaN after recovery
- Try the recovery again
- Check the browser console for detailed errors
- Clear your browser cache and refresh

## Technical Details

### Recovery Mutation
- Location: `convex/stocks.ts`
- Function: `fixBrokenStock(stockId)`
- Returns: Recovery details (oldPrice, newPrice, method)

### Helper Queries
- `getStockIdByTicker(ticker)`: Find stock by ticker name
- `getBrokenStocks()`: Find all stocks in broken state

### Database Changes
When a stock is recovered:
- `stocks.price` → updated to recovery price
- `stocks.marketCap` → recalculated (price × shares)
- `stocks.previousPrice` → retains the broken price for reference
- `stocks.updatedAt` → current timestamp
- `companies.marketCap` → updated to match
- `stockPriceHistory` → new entry recorded

## Prevention Best Practices

1. **Monitor Tick Results**: Check admin panel after each tick
2. **Watch for Warnings**: System logs warnings when suspicious calculations occur
3. **Regular Backups**: Maintain backups of critical database state
4. **Alert on Issues**: Set up monitoring for NaN values in price fields
5. **Test Edge Cases**: Verify system handles extreme inputs correctly

## Questions?

- Check TICKS_TROUBLESHOOTING.md for tick-related issues
- Review TICK_SYSTEM.md for system architecture
- Check error messages in browser console for details
