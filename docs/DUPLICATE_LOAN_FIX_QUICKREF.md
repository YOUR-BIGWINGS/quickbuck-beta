# Duplicate Loan Fix - Quick Reference

## What Was Fixed

**Problem:** Race condition allowed players to receive duplicate loan credits, causing negative balances.

**Example:** Player was credited $100,000 twice (2 transactions at same timestamp) but only 1 loan record existed.

**Result:** After spending the $100,000, balance went negative because the duplicate credit wasn't tracked.

---

## Key Changes

### 1. Code Changes (`convex/loans.ts`)
- Enhanced duplicate detection (2-second window)
- Idempotency key support
- Better atomic operations
- Balance validation

### 2. Schema Changes (`convex/schema.ts`)
- Added `idempotencyKey` to loans table
- Added `linkedLoanId` to transactions table
- New indices for efficient querying

### 3. Admin Tools (`convex/moderation.ts`)
- `detectDuplicateLoanCredits()` - Find duplicates
- `repairDuplicateLoanTransactions()` - Fix duplicates
- `auditPlayerBalance()` - Full financial audit
- `checkAndReportNegativeBalances()` - Hourly monitoring

### 4. Monitoring (`convex/crons.ts`)
- Hourly check for negative balances
- Automatic logging of issues

---

## How to Use

### Check for Duplicate Issues

```bash
npx convex run moderation:detectDuplicateLoanCredits '{"playerId":"player_id_here"}'
```

### Audit Player Balance

```bash
npx convex run moderation:auditPlayerBalance '{"playerId":"player_id_here"}'
```

### Fix Duplicate Transactions (Admin Only)

```bash
npx convex run moderation:repairDuplicateLoanTransactions '{
  "playerId":"player_id_here",
  "loanAmount":10000000,
  "reason":"Fixed duplicate loan transactions from race condition"
}'
```

---

## Test Case: Affected Player

**Player ID:** `nh7bpj2xf1b9qw7x3gx803gr7h7tfqk7`

**Issue:** Received 2 duplicate loan credits ($100,000 each) at same timestamp

**Result:**
- Balance: -$347.68
- Active Loans: $100,347.68 (including interest)
- Company Assets: $233,181.10
- Net Worth: $132,485.74 (POSITIVE)

**Status:** Financially solvent despite negative cash balance

---

## Protection Layers

| Layer | How It Works |
|-------|------------|
| Request Deduplication | Idempotency keys on client side |
| 2-Second Window | Catches concurrent identical requests |
| Atomic Operations | Loan created before balance credited |
| Validation | Balance calculations checked for overflow |
| Audit Trail | All transactions linked to loans |
| Hourly Monitoring | Automated check for negative balances |
| Repair Tools | Admin functions to fix issues |

---

## Deployment Checklist

- [ ] Run `npx convex deploy`
- [ ] Run `npx convex codegen`
- [ ] Wait 5 minutes for cron to register
- [ ] Check logs for "check negative balances" cron
- [ ] Verify admin functions work

---

## Monitoring

### View Monitoring Alerts

```bash
# Watch for negative balance alerts
npx convex logs --tail | grep "NEGATIVE BALANCE ALERT"

# View financial audit issues
npx convex logs --tail | grep "FINANCIAL AUDIT"
```

### Expected Log Output

```
[NEGATIVE BALANCE ALERT] Found 0 players with negative balances
[FINANCIAL AUDIT] Found 0 players with issues
```

---

## Success Criteria

✅ No duplicate loans in system  
✅ All balances reconcile with transactions  
✅ Hourly monitoring alerts on any issues  
✅ Admin can detect and repair duplicates  
✅ Player's net worth is protected  

---

## Related Documentation

- `docs/NEGATIVE_BALANCE_FIX.md` - Previous fix (similar issue, different cause)
- `convex/loans.ts` - Loan creation logic
- `convex/moderation.ts` - Admin tools and monitoring

