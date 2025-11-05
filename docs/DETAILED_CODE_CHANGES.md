# Detailed Code Changes Reference

## 1. Schema Changes

### File: `convex/schema.ts`

**Before:**
```typescript
products: defineTable({
  companyId: v.id("companies"),
  name: v.string(),
  description: v.optional(v.string()),
  price: v.number(), // in cents
  productionCost: v.number(), // in cents - VULNERABLE
  image: v.optional(v.string()),
  // ...
})
```

**After:**
```typescript
products: defineTable({
  companyId: v.id("companies"),
  name: v.string(),
  description: v.optional(v.string()),
  price: v.number(), // in cents
  productionCostPercentage: v.number(), // 0-1, percentage of price (e.g., 0.35 = 35%)
  image: v.optional(v.string()),
  // ...
})
```

**Change:** Replaced absolute cost with percentage

---

## 2. Backend Changes

### File: `convex/products.ts`

#### Change 1: Product Creation (lines 59-83)

**Before:**
```typescript
// Calculate production cost (35%-67% of selling price)
const costPercentage = 0.35 + Math.random() * 0.32;
const productionCost = Math.floor(args.price * costPercentage);

const productId = await ctx.db.insert("products", {
  // ...
  productionCost: productionCost,  // VULNERABLE - fixed value
  // ...
});
```

**After:**
```typescript
// EXPLOIT FIX: Store production cost as percentage (35%-67%) instead of absolute value
// This prevents the exploit where users create cheap products then increase price
// while maintaining the original low production cost
const productionCostPercentage = 0.35 + Math.random() * 0.32; // 0.35 to 0.67

const productId = await ctx.db.insert("products", {
  // ...
  productionCostPercentage: productionCostPercentage,  // SECURE - percentage stored
  // ...
});
```

**Change:** Store percentage instead of fixed cost

#### Change 2: Batch Ordering (lines 118-124)

**Before:**
```typescript
// Calculate total production cost for this batch
const totalCost = product.productionCost * args.quantity;
```

**After:**
```typescript
// EXPLOIT FIX: Calculate production cost from percentage and CURRENT price
// This prevents the exploit where price is increased after creation
const productionCost = Math.floor(product.price * product.productionCostPercentage);

// Calculate total production cost for this batch
const totalCost = productionCost * args.quantity;
```

**Change:** Calculate cost dynamically from current price

---

## 3. Frontend Changes

### File: `app/routes/dashboard/company.$companyId.tsx`

#### Change 1: Dashboard Stats (lines 320-325)

**Before:**
```typescript
const totalProductionCosts =
  products?.reduce((sum, p) => sum + p.productionCost * p.totalSold, 0) || 0;
const totalProfit = totalRevenue - totalProductionCosts;
const totalStockValue =
  products?.reduce((sum, p) => sum + (p.stock || 0) * p.productionCost, 0) ||
  0;
```

**After:**
```typescript
const totalProductionCosts =
  products?.reduce((sum, p) => sum + Math.floor(p.price * p.productionCostPercentage) * p.totalSold, 0) || 0;
const totalProfit = totalRevenue - totalProductionCosts;
const totalStockValue =
  products?.reduce((sum, p) => sum + (p.stock || 0) * Math.floor(p.price * p.productionCostPercentage), 0) ||
  0;
```

**Change:** Use percentage-based calculation

#### Change 2: Product Table Display (line 661)

**Before:**
```tsx
{formatCurrency(product.productionCost)}
```

**After:**
```tsx
{formatCurrency(Math.floor(product.price * product.productionCostPercentage))}
```

**Change:** Calculate display value dynamically

#### Change 3: Batch Order Details (lines 877-915)

**Before:**
```typescript
const quantity = parseInt(batchQuantity) || 0;
const totalCost = product.productionCost * quantity;
const profit = (product.price - product.productionCost) * quantity;

// Display:
{formatCurrency(product.productionCost)}
{formatCurrency(product.price - product.productionCost)}
```

**After:**
```typescript
const quantity = parseInt(batchQuantity) || 0;
const productionCost = Math.floor(product.price * product.productionCostPercentage);
const totalCost = productionCost * quantity;
const profit = (product.price - productionCost) * quantity;

// Display:
{formatCurrency(productionCost)}
{formatCurrency(product.price - productionCost)}
```

**Change:** Use local calculated variable

---

## 4. Net Worth Changes

### File: `convex/players.ts`

#### Update: calculateNetWorth() function (lines 42-59)

**Before:**
```typescript
for (const company of companies) {
  // Add company balance (cash)
  netWorth += company.balance;
  // Add company market cap for public companies
  if (company.isPublic && company.marketCap) {
    netWorth += company.marketCap;
  }
}

return netWorth;
```

**After:**
```typescript
for (const company of companies) {
  // Add company balance (cash)
  netWorth += company.balance;
  // Add company market cap for public companies
  if (company.isPublic && company.marketCap) {
    netWorth += company.marketCap;
  }
}

// LOAN IMPACT: Subtract unpaid loans from net worth
// This reflects the player's true financial position including debt obligations
const activeLoans = await ctx.db
  .query("loans")
  .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
  .filter((q: any) => q.eq(q.field("status"), "active"))
  .collect();

for (const loan of activeLoans) {
  netWorth -= loan.remainingBalance;
}

return netWorth;
```

**Change:** Subtract active loan balances from net worth

---

## 5. Test Updates

### File: `convex/__tests__/exploit-part2.test.ts`

#### Change 1: Exploit detection test (lines 331-336)

**Before:**
```typescript
if (product && product.productionCost < 0) {
  console.error("⚠️  EXPLOIT DETECTED: Negative production cost");
}

if (product && product.productionCost >= product.price) {
  console.warn("⚠️  WARNING: Production cost >= selling price");
}
```

**After:**
```typescript
if (product && product.productionCostPercentage < 0) {
  console.error("⚠️  EXPLOIT DETECTED: Negative production cost percentage");
}

if (product && product.productionCostPercentage >= 1) {
  console.warn("⚠️  WARNING: Production cost percentage >= 100%");
}
```

#### Changes 2-6: Test fixtures (6 instances)

**Before:**
```typescript
productionCost: 500,
```

**After:**
```typescript
productionCostPercentage: 0.5, // 50%
```

### File: `convex/__tests__/exploit.test.ts`

#### Change: Test fixture (1 instance)

**Before:**
```typescript
productionCost: 300,
```

**After:**
```typescript
productionCostPercentage: 0.5, // 50%
```

---

## Summary of Changes

| File | Change Type | Count | Details |
|------|------------|-------|---------|
| `schema.ts` | Schema | 1 | Field renamed + type change |
| `products.ts` | Logic | 2 | Creation + batch ordering |
| `company.$companyId.tsx` | Frontend | 3 | Stats + display + batch dialog |
| `players.ts` | Logic | 1 | Net worth calculation |
| `exploit-part2.test.ts` | Tests | 6 | Fixture updates |
| `exploit.test.ts` | Tests | 1 | Fixture update |

**Total Changes:** 14 code modifications  
**New Documentation:** 4 files created  
**Compile Status:** ✅ No errors  

---

## Backward Compatibility

⚠️ **Schema Change Required**

Existing products in database need migration:
```typescript
// One-time migration (if needed)
for (each existing product):
  productionCostPercentage = productionCost / price
  delete productionCost
```

However, since this is a breaking change, it's recommended to:
1. Add new field `productionCostPercentage` to schema
2. Update code to use new field
3. Run migration on existing data
4. Remove old `productionCost` field

---

## Testing Verification

Run tests to confirm everything works:
```bash
npm run test
```

Expected results:
- ✅ All existing tests pass
- ✅ Production cost calculations work
- ✅ Revenue metrics accurate
- ✅ Loan impact on net worth verified

---

## Deployment Checklist

- [ ] Review schema changes
- [ ] Deploy schema update
- [ ] Run data migration (if using existing data)
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Monitor leaderboard changes
- [ ] Verify profit calculations
- [ ] Confirm loan impact visible in UI
- [ ] Monitor player feedback
