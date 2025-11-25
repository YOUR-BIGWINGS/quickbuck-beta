/**
 * TICK SYSTEM
 *
 * Central coordinating system that runs every 5 minutes to:
 * 1. Execute bot purchases from marketplace (ALL companies @ $500k each, in batches of 31,999 operations)
 * 2. Deduct employee costs (10 companies per tick, rotated)
 * 3. Update stock prices (via realistic stock market engine)
 * 4. Update cryptocurrency prices
 * 5. Apply loan interest (120 loans per tick, rotated)
 * 6. Update player net worth (18 players per tick, rotated)
 * 7. Record tick history
 *
 * CRITICAL: Uses a distributed lock to prevent concurrent execution
 *
 * NEW BOT ARCHITECTURE: Dynamic batch system that prevents overload failures
 * - Purchases are grouped into batches of 31,999 operations (each purchase ~5 ops)
 * - Batches are built dynamically each tick based on all companies and products
 * - All batches execute sequentially before the 5-minute timer resets
 * - System scales automatically as companies and products are added
 * - $500,000 budget per company, split equally among valid products
 */

import { v } from "convex/values";
import { mutation, internalMutation, query, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { type Id, type Doc } from "./_generated/dataModel";

const LOAN_INTEREST_BATCH_SIZE = 40;
const LOAN_INTEREST_MAX_BATCHES = 3;
const NET_WORTH_BATCH_SIZE = 6;
const NET_WORTH_MAX_BATCHES = 3;

type TickLockAcquireResult =
  | { acquired: true; lockId: Id<"tickLock"> }
  | { acquired: false };

// Acquire distributed lock for tick execution
async function acquireTickLock(
  ctx: any,
  lockSource: string,
): Promise<TickLockAcquireResult> {
  const lock = await ctx.db
    .query("tickLock")
    .withIndex("by_lockId", (q: any) => q.eq("lockId", "singleton"))
    .first();

  const now = Date.now();

  if (!lock) {
    // Create the lock for the first time
    const lockId = await ctx.db.insert("tickLock", {
      lockId: "singleton",
      isLocked: true,
      lockedAt: now,
      lockedBy: lockSource,
    });
    return { acquired: true, lockId };
  }

  // Check if lock is stale (older than 10 minutes - should never happen)
  if (lock.isLocked && lock.lockedAt && now - lock.lockedAt > 10 * 60 * 1000) {
    console.log(`[TICK] Stale lock detected, forcing release`);
    await ctx.db.patch(lock._id, {
      isLocked: true,
      lockedAt: now,
      lockedBy: lockSource,
    });
    return { acquired: true, lockId: lock._id };
  }

  // If already locked, cannot acquire
  if (lock.isLocked) {
    console.log(`[TICK] Lock already held by ${lock.lockedBy}, skipping`);
    return { acquired: false };
  }

  // Acquire the lock
  await ctx.db.patch(lock._id, {
    isLocked: true,
    lockedAt: now,
    lockedBy: lockSource,
  });
  return { acquired: true, lockId: lock._id };
}

// Release distributed lock
async function releaseTickLock(ctx: any, lockId?: Id<"tickLock">) {
  if (lockId) {
    await ctx.db.patch(lockId, {
      isLocked: false,
      lockedAt: undefined,
      lockedBy: undefined,
    });
    return;
  }

  const lock = await ctx.db
    .query("tickLock")
    .withIndex("by_lockId", (q: any) => q.eq("lockId", "singleton"))
    .first();

  if (lock) {
    await ctx.db.patch(lock._id, {
      isLocked: false,
      lockedAt: undefined,
      lockedBy: undefined,
    });
  }
}

// Shared tick execution logic - DEPRECATED
// Replaced by executeTick Action
// async function executeTickLogic(...) { ... }

// ============================================================================
// HELPER MUTATIONS FOR ACTION-BASED TICK
// ============================================================================

export const acquireTickLockMutation = internalMutation({
  args: { lockSource: v.string() },
  handler: async (ctx, args) => {
    return await acquireTickLock(ctx, args.lockSource);
  },
});

export const releaseTickLockMutation = internalMutation({
  args: { lockId: v.optional(v.id("tickLock")) },
  handler: async (ctx, args) => {
    await releaseTickLock(ctx, args.lockId);
  },
});

export const recordTickHistoryMutation = internalMutation({
  args: {
    tickNumber: v.number(),
    botPurchases: v.any(), // Array or number
    cryptoPriceUpdates: v.any(), // Array or number
    totalBudgetSpent: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const tickId = await ctx.db.insert("tickHistory", {
      tickNumber: args.tickNumber,
      timestamp: now,
      botPurchases: args.botPurchases,
      cryptoPriceUpdates: args.cryptoPriceUpdates,
      totalBudgetSpent: args.totalBudgetSpent,
    });
    return tickId;
  },
});

export const getNextTickNumber = internalQuery({
  handler: async (ctx) => {
    const lastTick = await ctx.db
      .query("tickHistory")
      .withIndex("by_tickNumber")
      .order("desc")
      .first();
    return (lastTick?.tickNumber || 0) + 1;
  },
});

// ============================================================================
// BOT LOGIC - ACTION BASED
// ============================================================================

export const planBotPurchases = internalQuery({
  args: { seed: v.number() },
  handler: async (ctx, args) => {
    console.log("[BOT] Planning purchase batches...");

    // Fetch all companies
    const allCompanies = await ctx.db.query("companies").collect();
    console.log(`[BOT] Found ${allCompanies.length} companies`);

    if (allCompanies.length === 0) {
      return [];
    }

    // Calculate all operations across all companies
    const allOperations: Array<any> = [];

    for (const company of allCompanies) {
      try {
        // Fetch products for this company
        const products = await ctx.db
          .query("products")
          .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
          .collect();

        // Calculate purchases for this company
        const { purchases, newAccumulator } = await calculateCompanyPurchases(ctx, company, products, args.seed);
        
        if (purchases.length > 0) {
          allOperations.push(...purchases);
        }
        
        // Add accumulator update operation
        if (newAccumulator !== (company.botPurchaseAccumulator || 0)) {
            allOperations.push({
                type: "accumulator",
                companyId: company._id,
                newAccumulator
            });
        }
      } catch (error) {
        console.error(`[BOT] Error processing company ${company.name}:`, error);
      }
    }

    console.log(`[BOT] Total operations calculated: ${allOperations.length}`);
    return allOperations;
  },
});

export const executePurchaseBatchMutation = internalMutation({
  args: { operations: v.any() },
  handler: async (ctx, args) => {
    return await executePurchaseBatch(ctx, args.operations);
  },
});

export const runBotPurchasesAction = internalAction({
  handler: async (ctx) => {
    console.log("[BOT] Starting bot purchase action...");
    
    const seed = Math.random();
    // 1. Plan purchases (Query)
    const allOperations = await ctx.runQuery(internal.tick.planBotPurchases, { seed });
    
    if (!allOperations || allOperations.length === 0) {
      console.log("[BOT] No operations to execute");
      return { batchesExecuted: 0, totalPurchases: 0, purchases: [] };
    }

    // 2. Split into batches
    const batches: Array<Array<any>> = [];
    for (let i = 0; i < allOperations.length; i += OPERATIONS_PER_BATCH) {
      const batch = allOperations.slice(i, i + OPERATIONS_PER_BATCH);
      batches.push(batch);
    }

    console.log(`[BOT] Created ${batches.length} batches (max ${OPERATIONS_PER_BATCH} operations per batch)`);

    // 3. Execute batches sequentially (Mutations)
    let totalPurchases = 0;
    const allExecutedPurchases: Array<any> = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[BOT] Executing batch ${i + 1}/${batches.length} (${batch.length} operations)...`);

      try {
        const result: any = await ctx.runMutation(internal.tick.executePurchaseBatchMutation, {
          operations: batch,
        });
        
        totalPurchases += result.executedCount;
        allExecutedPurchases.push(...result.purchases);

        console.log(`[BOT] Batch ${i + 1} completed: ${result.executedCount} purchases executed`);
      } catch (error) {
        console.error(`[BOT] Error executing batch ${i + 1}:`, error);
      }
    }

    return {
      batchesExecuted: batches.length,
      totalPurchases,
      purchases: allExecutedPurchases,
    };
  },
});

// Main tick action - runs every 5 minutes via cron
export const executeTick = internalAction({
  handler: async (ctx): Promise<void> => {
    console.log("[TICK] Executing tick via CRON (Action)...");
    
    // Try to acquire lock
    const lockResult = await ctx.runMutation(internal.tick.acquireTickLockMutation, { lockSource: "cron" });
    if (!lockResult.acquired) {
      console.log(`[TICK] Could not acquire lock, another tick is running`);
      return; // Exit silently
    }

    const lockId = lockResult.lockId;

    try {
      // Get tick number
      const tickNumber = await ctx.runQuery(internal.tick.getNextTickNumber);
      console.log(`Executing tick #${tickNumber}`);

      // Step 1: Bot purchases
      console.log("[TICK] Step 1: Bot purchases...");
      const botResult = await ctx.runAction(internal.tick.runBotPurchasesAction);
      const botPurchases = botResult.purchases || [];

      // Step 1.5: Deduct employee costs
      console.log("[TICK] Step 1.5: Employee costs...");
      await ctx.runMutation(internal.tick.deductEmployeeCostsMutation);

      // Step 2: Stock prices
      console.log("[TICK] Step 2: Stock prices...");
      const stockPriceUpdates: any = await ctx.runMutation(internal.stocks.updateStockPrices);

      // Step 3: Crypto prices
      console.log("[TICK] Step 3: Crypto prices...");
      const cryptoPriceUpdates: any = await ctx.runMutation(internal.crypto.updateCryptoPrices);

      // Step 4: Loan interest
      console.log("[TICK] Step 4: Loan interest...");
      let loanCursor: string | undefined;
      for (let i = 0; i < LOAN_INTEREST_MAX_BATCHES; i++) {
        const result: any = await ctx.runMutation(internal.tick.applyLoanInterestMutation, {
          limit: LOAN_INTEREST_BATCH_SIZE,
          cursor: loanCursor,
        });
        if (!result || !result.cursor) break;
        loanCursor = result.cursor;
      }

      // Step 5: Net worth
      console.log("[TICK] Step 5: Net worth...");
      let netWorthCursor: string | undefined;
      for (let i = 0; i < NET_WORTH_MAX_BATCHES; i++) {
        const result: any = await ctx.runMutation(internal.tick.updatePlayerNetWorthMutation, {
          limit: NET_WORTH_BATCH_SIZE,
          cursor: netWorthCursor,
        });
        if (!result || !result.cursor) break;
        netWorthCursor = result.cursor;
      }

      // Step 6: Record history
      await ctx.runMutation(internal.tick.recordTickHistoryMutation, {
        tickNumber,
        botPurchases: botPurchases,
        cryptoPriceUpdates: cryptoPriceUpdates || [],
        totalBudgetSpent: botPurchases.reduce((sum: any, p: any) => sum + p.totalPrice, 0),
      });

      console.log(`[TICK] Tick #${tickNumber} completed successfully`);

    } catch (error) {
      console.error("[TICK] ❌ Tick failed", error);
    } finally {
      // Always release lock
      await ctx.runMutation(internal.tick.releaseTickLockMutation, { lockId });
    }
  },
});

// Legacy mutation - kept for reference but replaced by action
// export const executeTickLegacy = internalMutation({ ... });


// Manual trigger for testing (can be called from admin dashboard)
export const manualTick = action({
  handler: async (ctx) => {
    console.log("[TICK] Manual tick triggered from client");
    try {
      await ctx.runAction(internal.tick.executeTick);
      console.log("[TICK] ✅ Manual tick completed successfully");
      return { success: true };
    } catch (error) {
      console.error("[TICK] ❌ Manual tick failed", error);
      throw error;
    }
  },
});

/**
 * BOT PURCHASE SYSTEM - BATCH-BASED WITH 31,999 OPERATION LIMIT
 *
 * New architecture to prevent overload failures:
 * - Budget per company: $500,000 fixed
 * - Processes ALL companies every tick
 * - Operations are grouped into batches of 31,999 max to prevent failures
 * - Dynamically manages batches as companies/products are added
 * - Executes all batches sequentially before timer resets
 *
 * Batch structure stored in database for persistence:
 * - Each batch contains up to 31,999 purchase operations
 * - New products fill existing batches before creating new ones
 * - All batches execute one after another each tick
 */

const OPERATIONS_PER_BATCH = 32000; // Max operations per batch to prevent overload
const BUDGET_PER_COMPANY = 50000000; // $500,000 in cents
const MAX_PRODUCT_PRICE = 5000000; // $50,000 max

// Calculate purchases for a single company
async function calculateCompanyPurchases(
  ctx: any,
  company: any,
  products: any[],
  seed: number,
) {
  const purchases: Array<{
    type: "purchase";
    productId: any;
    companyId: any;
    quantity: number;
    totalPrice: number;
    newStock: number | undefined;
    productTotalSold: number;
    productTotalRevenue: number;
  }> = [];

  // Filter valid products
  const validProducts = products.filter((p: any) => {
    const hasValidPrice = p.price && p.price > 0 && isFinite(p.price);
    // const withinMaxPrice = p.price <= MAX_PRODUCT_PRICE;
    return hasValidPrice; // && withinMaxPrice;
  });

  // Calculate budget: (balance / ratio) + accumulated value
  // Generate pseudo-random ratio between 15 and 30 using seed and company ID
  const str = seed.toString() + company._id;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const randomVal = Math.abs(hash) / 2147483647;
  const ratio = Math.floor(randomVal * (30 - 15 + 1)) + 15;

  const balance = company.balance || 0;
  const accumulator = company.botPurchaseAccumulator || 0;
  const budget = Math.floor(balance / ratio) + accumulator;

  if (validProducts.length === 0) {
    return { purchases, newAccumulator: budget };
  }

  let remainingBudget = budget;

  // Try to buy products with the available budget
  for (const product of validProducts) {
    if (remainingBudget < product.price) continue;

    // Calculate max quantity we can afford
    let quantity = Math.floor(remainingBudget / product.price);

    // Apply stock constraint
    if (product.stock !== undefined && product.stock !== null) {
      if (product.stock <= 0) continue;
      quantity = Math.min(quantity, product.stock);
    }

    // Apply maxPerOrder constraint
    if (product.maxPerOrder && product.maxPerOrder > 0) {
      quantity = Math.min(quantity, product.maxPerOrder);
    }

    if (quantity <= 0) continue;

    const totalPrice = quantity * product.price;
    if (!isFinite(totalPrice) || totalPrice <= 0) continue;

    // Calculate new stock
    let newStock = product.stock;
    if (product.stock !== undefined && product.stock !== null) {
      newStock = product.stock - quantity;
    }

    purchases.push({
      type: "purchase",
      productId: product._id,
      companyId: company._id,
      quantity,
      totalPrice,
      newStock,
      productTotalSold: product.totalSold || 0,
      productTotalRevenue: product.totalRevenue || 0,
    });

    remainingBudget -= totalPrice;
  }

  return { purchases, newAccumulator: remainingBudget };
}

// Build or rebuild all purchase batches dynamically
async function buildPurchaseBatches(ctx: any) {
  console.log("[BOT] Building purchase batches...");

  // Fetch all companies
  const allCompanies = await ctx.db.query("companies").collect();
  console.log(`[BOT] Found ${allCompanies.length} companies`);

  if (allCompanies.length === 0) {
    return [];
  }

  // Calculate all operations across all companies
  const allOperations: Array<any> = [];

  for (const company of allCompanies) {
    try {
      // Fetch products for this company
      const products = await ctx.db
        .query("products")
        .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
        .collect();

      // Calculate purchases for this company
      const { purchases, newAccumulator } = await calculateCompanyPurchases(ctx, company, products, Date.now());
      
      if (purchases.length > 0) {
        allOperations.push(...purchases);
      }
      
      // Add accumulator update operation
      if (newAccumulator !== (company.botPurchaseAccumulator || 0)) {
          allOperations.push({
              type: "accumulator",
              companyId: company._id,
              newAccumulator
          });
      }

      console.log(`[BOT] Company ${company.name}: ${purchases.length} purchases, accumulator: ${newAccumulator}`);
    } catch (error) {
      console.error(`[BOT] Error processing company ${company.name}:`, error);
    }
  }

  console.log(`[BOT] Total operations calculated: ${allOperations.length}`);

  // Split into batches of OPERATIONS_PER_BATCH
  const batches: Array<Array<any>> = [];

  for (let i = 0; i < allOperations.length; i += OPERATIONS_PER_BATCH) {
    const batch = allOperations.slice(i, i + OPERATIONS_PER_BATCH);
    batches.push(batch);
  }

  console.log(`[BOT] Created ${batches.length} batches (max ${OPERATIONS_PER_BATCH} operations per batch)`);

  return batches;
}

// Execute a single batch of operations
async function executePurchaseBatch(ctx: any, operations: any[]) {
  const now = Date.now();
  let executedCount = 0;
  const executedPurchases: Array<{
    productId: any;
    companyId: any;
    quantity: number;
    totalPrice: number;
  }> = [];

  for (const op of operations) {
    try {
      if (op.type === "accumulator") {
        await ctx.db.patch(op.companyId, {
          botPurchaseAccumulator: op.newAccumulator,
          updatedAt: now,
        });
        continue;
      }

      // Handle purchase operation
      const purchase = op;

      // Verify company exists
      const company = await ctx.db.get(purchase.companyId);
      if (!company) continue;

      // Update product
      const updateData: any = {
        totalSold: purchase.productTotalSold + purchase.quantity,
        totalRevenue: purchase.productTotalRevenue + purchase.totalPrice,
        updatedAt: now,
      };

      if (purchase.newStock !== undefined) {
        updateData.stock = purchase.newStock;
      }

      await ctx.db.patch(purchase.productId, updateData);

      // Update company balance
      await ctx.db.patch(purchase.companyId, {
        balance: company.balance + purchase.totalPrice,
        updatedAt: now,
      });

      // Record sale
      await ctx.db.insert("marketplaceSales", {
        productId: purchase.productId,
        companyId: purchase.companyId,
        quantity: purchase.quantity,
        purchaserId: "bot" as const,
        purchaserType: "bot" as const,
        totalPrice: purchase.totalPrice,
        createdAt: now,
      });

      executedCount++;
      executedPurchases.push({
        productId: purchase.productId,
        companyId: purchase.companyId,
        quantity: purchase.quantity,
        totalPrice: purchase.totalPrice,
      });
    } catch (error) {
      console.error(`[BOT] Error executing operation:`, error);
    }
  }

  return { executedCount, purchases: executedPurchases };
}

// Stock market functionality has been removed

// Deduct employee costs from companies based on their income
async function deductEmployeeCosts(ctx: any) {
  // CRITICAL: Process only 10 companies per tick to stay WELL under read limits
  // Even with 10 companies * 20 sales = 200 reads, plus overhead, we stay safe
  const COMPANIES_PER_TICK = 10;
  const SALES_PER_COMPANY = 20;

  // Use indexed query by updatedAt to process companies in rotation
  // This ensures all companies get processed eventually
  const allCompanies = await ctx.db
    .query("companies")
    .order("asc") // Order by _creationTime ascending (oldest first)
    .take(COMPANIES_PER_TICK);

  let companiesProcessed = 0;

  for (const company of allCompanies) {
    const employees = company.employees || [];

    if (employees.length === 0) {
      // Update timestamp even if no employees (mark as processed)
      await ctx.db.patch(company._id, {
        updatedAt: Date.now(),
      });
      continue;
    }

    // Calculate total tick cost percentage
    let totalTickCostPercentage = 0;
    for (const employee of employees) {
      totalTickCostPercentage += employee.tickCostPercentage;
    }

    if (totalTickCostPercentage === 0) {
      await ctx.db.patch(company._id, {
        updatedAt: Date.now(),
      });
      continue;
    }

    // Get recent sales (last tick's income) to calculate employee costs from
    // We'll use sales from the last 20 minutes (one tick cycle)
    const twentyMinutesAgo = Date.now() - 20 * 60 * 1000;

    const recentSales = await ctx.db
      .query("marketplaceSales")
      .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
      .filter((q: any) => q.gte(q.field("createdAt"), twentyMinutesAgo))
      .take(SALES_PER_COMPANY); // Reduced to 20 sales per company

    const tickIncome = recentSales.reduce(
      (sum: number, sale: any) => sum + sale.totalPrice,
      0,
    );

    if (tickIncome === 0) {
      await ctx.db.patch(company._id, {
        updatedAt: Date.now(),
      });
      continue;
    }

    // Calculate employee cost
    const employeeCost = Math.floor(
      tickIncome * (totalTickCostPercentage / 100),
    );

    if (employeeCost > 0 && employeeCost <= company.balance) {
      // Verify owner exists and is valid before processing
      if (!company.ownerId) {
        console.error(`[TICK] Company ${company._id} has no ownerId, skipping employee cost deduction`);
        await ctx.db.patch(company._id, {
          updatedAt: Date.now(),
        });
        continue;
      }

      const owner = await ctx.db.get(company.ownerId);
      if (!owner) {
        console.error(`[TICK] Company ${company._id} owner ${company.ownerId} not found, skipping employee cost deduction`);
        await ctx.db.patch(company._id, {
          updatedAt: Date.now(),
        });
        continue;
      }

      // Deduct from company balance
      await ctx.db.patch(company._id, {
        balance: company.balance - employeeCost,
        updatedAt: Date.now(),
      });

      // Record transaction for audit
      // Note: We deduct from company but this is operating cost (not transferred to player)
      try {
        await ctx.db.insert("transactions", {
          fromAccountId: company._id,
          fromAccountType: "company" as const,
          toAccountId: company.ownerId,
          toAccountType: "player" as const,
          amount: employeeCost,
          assetType: "cash" as const,
          description: `Employee costs for tick (${totalTickCostPercentage}% of income)`,
          createdAt: Date.now(),
        });
      } catch (error) {
        console.error(`[TICK] Failed to record transaction for company ${company._id}:`, error);
      }

      companiesProcessed++;
    } else {
      // Still update timestamp
      await ctx.db.patch(company._id, {
        updatedAt: Date.now(),
      });
    }
  }

  console.log(`Processed employee costs for ${companiesProcessed} companies`);
}

// Update player net worth values for efficient leaderboard queries
// Update player net worth values
async function updatePlayerNetWorth(
  ctx: any,
  args: {
    limit?: number;
    cursor?: string;
  },
) {
  console.log(
    `[NET_WORTH] updatePlayerNetWorth called with raw args:`,
    JSON.stringify(args),
  );

  // CRITICAL: Only process a small number of players per batch to stay under read budget
  const MAX_HOLDINGS_PER_TYPE = 5; // Reduced from 20
  const MAX_COMPANIES = 3; // Reduced from 10
  const MAX_LOANS = 3; // Reduced from 10

  // Add defensive check for undefined limit
  const limit = args.limit;
  const cursor = args.cursor;
  const safeLimitInput = limit ?? 6;
  const safeLimitCalculated = Math.max(1, Math.min(safeLimitInput, 25));

  // Triple check that we have a valid finite positive number
  const safeLimit =
    typeof safeLimitCalculated === "number" &&
    isFinite(safeLimitCalculated) &&
    safeLimitCalculated > 0
      ? safeLimitCalculated
      : 6;

  console.log(
    `[NET_WORTH] Processing players with limit=${safeLimit} (input was ${limit}), cursor=${cursor ? "yes" : "no"}`,
  );

  // WORKAROUND: Use .take() instead of .paginate() since paginate is causing issues
  console.log(
    `[NET_WORTH] Using .take() instead of .paginate() with limit=${safeLimit}`,
  );

  const players = await ctx.db
    .query("players")
    .withIndex("by_lastNetWorthUpdate")
    .order("asc")
    .take(safeLimit);

  console.log(`[NET_WORTH] Successfully fetched ${players.length} players`);

  let playersUpdated = 0;

  for (const player of players) {
    let netWorth = player.balance;

    // Add stock holdings value
    const stockHoldings = await ctx.db
      .query("playerStockPortfolios")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .take(MAX_HOLDINGS_PER_TYPE || 5);

    for (const holding of stockHoldings) {
      const stock = await ctx.db.get(holding.stockId);
      if (stock) {
        netWorth += holding.shares * stock.currentPrice;
      }
    }

    // Add cryptocurrency holdings value
    const cryptoHoldings = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .take(MAX_HOLDINGS_PER_TYPE || 5);

    for (const holding of cryptoHoldings) {
      const crypto = await ctx.db.get(holding.cryptoId);
      if (crypto) {
        netWorth += holding.balance * crypto.currentPrice;
      }
    }

    // Add company equity (owned companies)
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q: any) => q.eq("ownerId", player._id))
      .take(MAX_COMPANIES || 3);

    // Fetch stocks for this player's public companies only
    const hasPublicCompanies = companies.some((c: Doc<"companies">) => c.isPublic);
    let stocksByCompanyId = new Map<Id<"companies">, Doc<"stocks">>();
    if (hasPublicCompanies) {
      // Query stocks for each public company individually to avoid .collect() overload
      for (const company of companies) {
        if (company.isPublic) {
          const stock = await ctx.db
            .query("stocks")
            .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
            .first();
          if (stock) {
            stocksByCompanyId.set(company._id, stock);
          }
        }
      }
    }

    for (const company of companies) {
      if (company.isPublic) {
        // For public companies, use market cap from stock's current price
        const stock = stocksByCompanyId.get(company._id);
        
        if (stock && stock.currentPrice) {
          // Market cap = current price * outstanding shares
          const marketCap = stock.currentPrice * (stock.outstandingShares ?? 1000000);
          netWorth += marketCap;
        } else if (company.marketCap) {
          // Fallback to stored market cap if stock not found
          netWorth += company.marketCap;
        }
      } else {
        // For private companies, use company balance as equity
        netWorth += company.balance;
      }
    }

    // Subtract unpaid loans from net worth
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .filter((q: any) => q.eq(q.field("status"), "active"))
      .take(MAX_LOANS || 3);

    for (const loan of activeLoans) {
      netWorth -= loan.remainingBalance;
    }

    // Always update to mark this player as processed (rotation)
    await ctx.db.patch(player._id, {
      netWorth,
      lastNetWorthUpdate: Date.now(),
      updatedAt: Date.now(),
    });

    playersUpdated++;
  }

  console.log(
    `Updated net worth for ${playersUpdated} players (batch limit ${safeLimit})`,
  );

  return {
    processed: playersUpdated,
    cursor: undefined, // No pagination cursor since we're using .take()
  };
}

// Apply daily loan interest
async function applyLoanInterest(
  ctx: any,
  args: {
    limit?: number;
    cursor?: string;
  },
) {
  console.log(
    `[LOAN] applyLoanInterest called with raw args:`,
    JSON.stringify(args),
  );

  // OPTIMIZED: Process loans in small batches to avoid read explosion
  // Add defensive check for undefined limit - EXTREMELY defensive
  const limit = typeof args.limit === "number" ? args.limit : 40;
  const cursor = args.cursor;
  const safeLimitInput = limit;
  const safeLimitCalculated = Math.max(1, Math.min(safeLimitInput, 100));

  // Triple check that we have a valid finite positive number
  const safeLimit =
    typeof safeLimitCalculated === "number" &&
    isFinite(safeLimitCalculated) &&
    safeLimitCalculated > 0
      ? safeLimitCalculated
      : 40;

  console.log(
    `[LOAN] Processing loans with limit=${safeLimit} (input was ${limit}), cursor=${cursor ? "yes" : "no"}`,
  );

  // WORKAROUND: Use .take() instead of .paginate() since paginate is causing issues
  // This means we lose pagination but at least it will work
  console.log(
    `[LOAN] Using .take() instead of .paginate() with limit=${safeLimit}`,
  );

  // CRITICAL: Final validation before .take() - must be a concrete number
  const takeLimitValue = Number(safeLimit);
  if (!isFinite(takeLimitValue) || takeLimitValue <= 0) {
    console.error(
      `[LOAN] CRITICAL: Invalid take limit: ${takeLimitValue}, using 40`,
    );
    throw new Error(`Invalid take limit: ${takeLimitValue}`);
  }

  const activeLoans = await ctx.db
    .query("loans")
    .withIndex("by_status", (q: any) => q.eq("status", "active"))
    .order("asc")
    .take(takeLimitValue);

  console.log(`[LOAN] Successfully fetched ${activeLoans.length} loans`);

  const now = Date.now();
  const twentyMinutesMs = 20 * 60 * 1000;

  let loansProcessed = 0;

  for (const loan of activeLoans) {
    const timeSinceLastInterest = now - loan.lastInterestApplied;

    // Apply interest proportionally for 20-minute intervals
    // 5% daily = 5% / 72 per 20-minute interval (72 intervals per day)
    if (timeSinceLastInterest >= twentyMinutesMs) {
      const dailyRate = loan.interestRate / 100; // 5% = 0.05
      const intervalRate = dailyRate / 72; // 72 twenty-minute intervals per day

      const interestAmount = Math.floor(loan.remainingBalance * intervalRate);

      if (interestAmount > 0) {
        const newBalance = loan.remainingBalance + interestAmount;
        const newAccruedInterest = loan.accruedInterest + interestAmount;

        await ctx.db.patch(loan._id, {
          remainingBalance: newBalance,
          accruedInterest: newAccruedInterest,
          lastInterestApplied: now,
        });

        // Deduct from player balance (allow negative)
        const player = await ctx.db.get(loan.playerId);
        if (player) {
          await ctx.db.patch(loan.playerId, {
            balance: player.balance - interestAmount,
            updatedAt: now,
          });
        }
        loansProcessed++;
      }
    }
  }

  console.log(
    `Applied interest to ${loansProcessed} loans (batch limit ${safeLimit})`,
  );

  return {
    processed: loansProcessed,
    cursor: undefined, // No pagination cursor since we're using .take()
  };
}

// ============================================================================
// INTERNAL MUTATIONS - Each step isolated to prevent read limit accumulation
// ============================================================================

// Main mutation to execute all bot purchases in batches - DEPRECATED
// Replaced by runBotPurchasesAction
// export const executeBotPurchasesInBatches = ...

export const deductEmployeeCostsMutation = internalMutation({
  handler: async (ctx) => {
    await deductEmployeeCosts(ctx);
    return { success: true };
  },
});

export const applyLoanInterestMutation = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(
      `[MUTATION] applyLoanInterestMutation called with:`,
      JSON.stringify(args),
    );

    // Defensive: Ensure limit is always a valid number
    const safeArgs = {
      limit: args.limit ?? 40,
      cursor: args.cursor,
    };

    console.log(
      `[MUTATION] Calling applyLoanInterest with safeArgs:`,
      JSON.stringify(safeArgs),
    );

    return await applyLoanInterest(ctx, safeArgs);
  },
});

export const updatePlayerNetWorthMutation = internalMutation({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log(
      `[MUTATION] updatePlayerNetWorthMutation called with:`,
      JSON.stringify(args),
    );

    // Defensive: Ensure limit is always a valid number
    const safeArgs = {
      limit: args.limit ?? 6,
      cursor: args.cursor,
    };

    console.log(
      `[MUTATION] Calling updatePlayerNetWorth with safeArgs:`,
      JSON.stringify(safeArgs),
    );

    return await updatePlayerNetWorth(ctx, safeArgs);
  },
});

// ============================================================================
// QUERIES
// ============================================================================

// Query: Get tick history
export const getTickHistory = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("tickHistory")
      .withIndex("by_tickNumber")
      .order("desc")
      .take(100);
  },
});

// Query: Get last tick timestamp
export const getLastTick = query({
  handler: async (ctx) => {
    const lastTick = await ctx.db
      .query("tickHistory")
      .withIndex("by_tickNumber")
      .order("desc")
      .first();

    return lastTick
      ? {
          tickNumber: lastTick.tickNumber,
          timestamp: lastTick.timestamp,
        }
      : null;
  },
});
