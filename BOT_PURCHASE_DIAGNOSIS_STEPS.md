# Bot Purchase Diagnosis - Step by Step Guide

## Step 1: Open the Diagnostics Page

1. Make sure your dev server is running (it should be already running)
2. Open your browser and go to: `http://localhost:5173/admin/diagnostics`
3. This page will automatically load and show you the database state

## Step 2: Check the "Products Summary" Card

Look at the three boxes at the top:

- **Total Products**: How many products exist in your database
- **Active & Not Archived**: How many are available for bot to purchase
- **Inactive or Archived**: How many are unavailable

### Possible Problems Here:

#### Problem 1: Total Products = 0

**Symptom**: "NO PRODUCTS EXIST IN DATABASE!"
**Fix**: You need to create products first

- Go to the company page and create products
- Or use the admin panel to seed test data

#### Problem 2: Active & Not Archived = 0 (but Total > 0)

**Symptom**: "All X products are either INACTIVE or ARCHIVED!"
**Fix**: You need to activate products

- Go to each product and set `isActive = true` and `isArchived = false`
- Or create a migration script to bulk update

## Step 3: Check the "Bot Product Query Simulation" Card

This shows what the bot actually sees when it tries to buy products.

Look at these numbers:

- **Products Found**: How many products pass the bot's filters
- **Eligible**: How many have valid price and stock

### Possible Problems Here:

#### Problem 3: Products Found = 0

**Symptom**: "Bot query returns 0 products!"
**Cause**: Products don't meet bot's criteria:

- Must have `isActive = true`
- Must have `isArchived = false`
- Must have `price ≤ $50,000` (5,000,000 cents)

**Fix**: Update products to meet these criteria

#### Problem 4: Products Found > 0 but Eligible = 0

**Symptom**: "Products found but none are eligible!"
**Cause**: Products fail validation:

- Price must be > 0
- Price must be a finite number
- Stock must be > 0 OR null/undefined (unlimited)

**Fix**: Check the red-highlighted products below and see which validation fails

## Step 4: Check Individual Products

Scroll down to see individual products listed. Each product shows:

- ✓ or ✗ for Active
- ✓ or ✗ for Not Archived
- ✓ or ✗ for Valid Price
- ✓ or ✗ for Has Stock

Look for red ✗ marks to see what's wrong with each product.

## Step 5: Check Companies

Scroll to the "Companies" card to verify:

- Companies exist in the database
- Companies are not deleted/missing

If products exist but companies don't, the bot will skip those products.

## Step 6: Check Recent Marketplace Sales

Look at the "Recent Marketplace Sales" card:

- If you see recent sales with `purchaserType: "bot"`, the bot IS working
- If all sales are from players, or there are no sales, the bot is not working

## Step 7: Based on Findings, Apply the Fix

Once you identify the problem from the diagnostics page, here are the fixes:

### Fix 1: No Products Exist

```typescript
// Create products via the UI or run a script to seed data
```

### Fix 2: All Products Inactive/Archived

Run this query in Convex dashboard or create a mutation:

```typescript
// Update all products to be active
const products = await ctx.db.query("products").collect();
for (const product of products) {
  await ctx.db.patch(product._id, {
    isActive: true,
    isArchived: false,
  });
}
```

### Fix 3: Products Have Stock = 0

Products need stock! Order inventory:

- Go to each company's products page
- Click "Order Batch" to add stock
- Or run a script to add stock to all products

### Fix 4: Products Too Expensive (> $50k)

Lower the price or increase the bot's price limit:

- Option A: Edit products to cost less than $50,000
- Option B: Increase the bot's max price in tick.ts (line ~348)

### Fix 5: Companies Missing

If products exist but companies don't:

```typescript
// This is a data integrity issue - clean up orphaned products
// Or restore missing companies
```

## Step 8: Verify the Fix

After applying the fix:

1. Refresh the diagnostics page
2. Check that "Products Found" and "Eligible" are both > 0
3. Go to `/admin/tick` page
4. Click "Execute Tick" to manually trigger a tick
5. Check the result shows "Bot Purchases: X" where X > 0
6. Return to diagnostics and check "Recent Marketplace Sales" for new bot purchases

## Quick Commands

If you need to check the Convex dashboard:

1. Run: `npx convex dashboard`
2. Go to the "Data" tab
3. Browse the `products` table
4. Check `isActive`, `isArchived`, `stock`, and `price` fields

## Still Not Working?

If the diagnostics show everything looks good but bot still doesn't purchase:

1. Check the browser console for errors when you trigger a manual tick
2. Check the Convex function logs in the dashboard
3. Look for specific error messages in the logs
4. Report back with the specific error message
