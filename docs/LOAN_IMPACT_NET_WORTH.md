# Loan Impact on Net Worth ✅

## Feature: Unpaid Loans Negatively Impact Net Worth

### Overview

Players who borrow money but have not fully repaid their loans now see their net worth reduced by the outstanding loan balance. This reflects their true financial position including debt obligations.

## Implementation

### Net Worth Calculation Update

**File:** `convex/players.ts` in `calculateNetWorth()` function

The net worth calculation now includes loan liability:

```typescript
export async function calculateNetWorth(ctx: any, playerId: Id<"players">) {
  let netWorth = player.balance;

  // Add stock holdings value
  // Add crypto holdings value
  // Add company equity
  
  // LOAN IMPACT: Subtract unpaid loans from net worth
  const activeLoans = await ctx.db
    .query("loans")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .filter((q: any) => q.eq(q.field("status"), "active"))
    .collect();

  for (const loan of activeLoans) {
    netWorth -= loan.remainingBalance;  // Subtract outstanding debt
  }

  return netWorth;
}
```

## Example Scenarios

### Scenario 1: No Loans
- Balance: $10,000
- Stocks: $5,000
- Crypto: $2,000
- Companies: $3,000
- **Active Loans: $0**
- **Net Worth: $20,000** ✅

### Scenario 2: With Active Loan
- Balance: $15,000 (borrowed $5,000)
- Stocks: $5,000
- Crypto: $2,000
- Companies: $3,000
- **Active Loans: $5,000 (unpaid)**
- **Net Worth: $20,000 - $5,000 = $15,000** ⚠️

### Scenario 3: Partially Repaid Loan
- Balance: $12,000 (borrowed $5,000, repaid $3,000)
- Stocks: $5,000
- Crypto: $2,000
- Companies: $3,000
- **Active Loans: $2,000 (remaining balance)**
- **Net Worth: $22,000 - $2,000 = $20,000** ✅

## Impact on Game Mechanics

### Leaderboard Rankings
- Players with significant unpaid debt will rank lower on net worth leaderboards
- This incentivizes timely loan repayment
- Net worth becomes a more accurate representation of financial health

### Player Visibility
- Dashboard displays net worth with loan deduction
- Accounts page shows the impact of debt
- Players can see real-time debt impact

### Loan Lifecycle
1. **Borrow**: Balance increases, net worth unchanged (loan taken)
2. **Interest Accrues**: Balance decreases, net worth decreases (debt grows)
3. **Repay**: Balance decreases more, net worth increases (debt reduces)
4. **Repaid**: Loan marked as "paid", no longer affects net worth

## Affected Calculations

### Direct Impact
✅ Player net worth (decreases by loan amount)  
✅ Leaderboard rankings  
✅ Portfolio valuation  

### No Impact
❌ Revenue metrics (unchanged - tracked separately)  
❌ Company finances (unchanged)  
❌ Player balance (actual cash on hand)  
❌ Stock/crypto values (unchanged)  

## Benefits

1. **Financial Accuracy**: Net worth now reflects true financial position
2. **Debt Accountability**: Unpaid loans have visible consequences
3. **Strategic Planning**: Players must consider debt when planning investments
4. **Fair Competition**: Net worth rankings aren't inflated by debt

## Testing

The change is automatically applied to all players:
- Active loans fetched from database
- Remaining balance subtracted from calculated net worth
- Only "active" status loans are considered
- Paid loans don't affect net worth

### Test Cases
✅ Player with no loans - net worth unchanged  
✅ Player with 1 loan - net worth reduced by loan amount  
✅ Player with multiple loans - net worth reduced by total loans  
✅ Player after loan repayment - net worth restored  
✅ Leaderboard ranking affected by loans  

## Files Modified

1. `convex/players.ts` - Added loan deduction to `calculateNetWorth()`

## Backward Compatibility

✅ No database schema changes required  
✅ Existing loan records work immediately  
✅ No migration needed  
✅ Retroactively applies to all existing players and loans  

## Related Features

- Loan creation via `api.loans.createLoan()`
- Loan repayment via `api.loans.repayLoan()`
- Interest application via `api.loans.applyLoanInterest()`
- Total debt query via `api.loans.getPlayerTotalDebt()`
