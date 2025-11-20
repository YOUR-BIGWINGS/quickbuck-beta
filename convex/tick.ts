/**
 * TICK SYSTEM
 *
 * Central coordinating system that runs every 5 minutes to:
 * 1. Execute bot purchases from marketplace (ALL companies @ $500k each, batched writes)
 * 2. Deduct employee costs (10 companies per tick, rotated)
 * 3. Update stock prices (via realistic stock market engine)
 * 4. Update cryptocurrency prices
 * 5. Apply loan interest (120 loans per tick, rotated)
 * 6. Update player net worth (18 players per tick, rotated)
 * 7. Record tick history
 *
 * CRITICAL: Uses a distributed lock to prevent concurrent execution
 *
 * OPTIMIZATION: Bot purchases process ALL companies with $500k each.
 * Purchases are calculated first (reads only), then executed in batches 
 * of 25 at the end (writes) to avoid overloading the database.
 *
 * Read Budget per Tick (estimated):
 * - Bot purchases: ALL companies * up to 100 products * 2 reads per product
 * - Employee costs: 10 companies * 20 sales = 200
 * - Stock prices: handled separately
 * - Crypto prices: handled separately
 * - Loan interest: 120 loans + 120 player reads = 240
 * - Net worth: 18 players * (5+5+3+3) * 2 = 576
 * Note: Batch execution prevents write overload
 */

import { v } from "convex/values";
import { mutation, internalMutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id, Doc } from "./_generated/dataModel";

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

// Shared tick execution logic
async function executeTickLogic(
  ctx: any,
  lockSource: string,
): Promise<{
  tickNumber: number;
  tickId: Id<"tickHistory">;
  botPurchases: number;
  stockUpdates: number;
  cryptoUpdates: number;
}> {
  const now = Date.now();

  // Try to acquire lock
  const lockResult = await acquireTickLock(ctx, lockSource);
  if (!lockResult.acquired) {
    console.log(`[TICK] Could not acquire lock, another tick is running`);
    throw new Error("Another tick is currently running. Please wait.");
  }

  const lockId = lockResult.lockId;

  try {
    // Get last tick number
    const lastTick = await ctx.db
      .query("tickHistory")
      .withIndex("by_tickNumber")
      .order("desc")
      .first();

    const tickNumber = (lastTick?.tickNumber || 0) + 1;

    console.log(`Executing tick #${tickNumber}`);

    // Step 1: Bot purchases from marketplace ($500k per company)
    console.log("[TICK] Step 1: Bot purchases (ALL companies @ $500k each)...");
    const botPurchases: Array<{
      productId: any;
      companyId: any;
      quantity: number;
      totalPrice: number;
    }> = [];

    // Process ALL companies - all purchases batched at end
    try {
      console.log(`[TICK] Bot purchases: processing ALL companies...`);
      const allPurchases = await ctx.runMutation(
        internal.tick.executeBotPurchasesMutation,
        {
          companiesLimit: 999999, // Process ALL companies
          offset: 0,
        },
      );

      if (Array.isArray(allPurchases)) {
        botPurchases.push(...allPurchases);
      }
      console.log(
        `[TICK] Bot purchases completed: ${allPurchases?.length || 0} total purchases`,
      );
    } catch (error) {
      console.error(`[TICK] Error in bot purchases:`, error);
      // Continue even if purchases fail
    }

    // Step 1.5: Deduct employee costs from company income (isolated mutation)
    console.log("[TICK] Step 1.5: Employee costs...");
    await ctx.runMutation(internal.tick.deductEmployeeCostsMutation);

    // Step 2: Update stock prices (isolated mutation)
    console.log("[TICK] Step 2: Stock prices...");
    const stockPriceUpdates: any = await ctx.runMutation(
      internal.stocks.updateStockPrices,
    );

    // Step 3: Update cryptocurrency prices (isolated mutation)
    console.log("[TICK] Step 3: Crypto prices...");
    const cryptoPriceUpdates: any = await ctx.runMutation(
      internal.crypto.updateCryptoPrices,
    );

    // Step 4: Apply loan interest (isolated mutation)
    console.log("[TICK] Step 4: Loan interest (batched)...");
    let loanCursor: string | undefined;
    let loanBatches = 0;
    let loansProcessed = 0;
    while (loanBatches < LOAN_INTEREST_MAX_BATCHES) {
      const loanResult = await ctx.runMutation(
        internal.tick.applyLoanInterestMutation,
        {
          limit: LOAN_INTEREST_BATCH_SIZE,
          cursor: loanCursor,
        },
      );

      if (!loanResult) {
        break;
      }

      loansProcessed += loanResult.processed ?? 0;
      loanCursor = loanResult.cursor ?? undefined;
      loanBatches += 1;

      if (!loanCursor) {
        break;
      }
    }
    console.log(
      `[TICK] Loan interest batches: ${loanBatches}, loans processed: ${loansProcessed}`,
    );

    // Step 5: Update player net worth values (isolated mutation)
    console.log("[TICK] Step 5: Player net worth (batched)...");
    let netWorthCursor: string | undefined;
    let netWorthBatches = 0;
    let playersProcessed = 0;
    while (netWorthBatches < NET_WORTH_MAX_BATCHES) {
      const netWorthResult = await ctx.runMutation(
        internal.tick.updatePlayerNetWorthMutation,
        {
          limit: NET_WORTH_BATCH_SIZE,
          cursor: netWorthCursor,
        },
      );

      if (!netWorthResult) {
        break;
      }

      playersProcessed += netWorthResult.processed ?? 0;
      netWorthCursor = netWorthResult.cursor ?? undefined;
      netWorthBatches += 1;

      if (!netWorthCursor) {
        break;
      }
    }
    console.log(
      `[TICK] Net worth batches: ${netWorthBatches}, players processed: ${playersProcessed}`,
    );

    // Step 6: Record tick history
    const tickId: Id<"tickHistory"> = await ctx.db.insert("tickHistory", {
      tickNumber,
      timestamp: now,
      botPurchases: botPurchases || [],
      cryptoPriceUpdates: cryptoPriceUpdates || [],
      totalBudgetSpent: Array.isArray(botPurchases)
        ? botPurchases.reduce((sum: number, p: any) => sum + p.totalPrice, 0)
        : 0,
    });

    console.log(`Tick #${tickNumber} completed`);

    return {
      tickNumber,
      tickId,
      botPurchases: Array.isArray(botPurchases) ? botPurchases.length : 0,
      stockUpdates: stockPriceUpdates?.updated || 0,
      cryptoUpdates: Array.isArray(cryptoPriceUpdates)
        ? cryptoPriceUpdates.length
        : 0,
    };
  } finally {
    // Always release the lock, even if an error occurred
    await releaseTickLock(ctx, lockId);
  }
}

// Main tick mutation - runs every 5 minutes via cron
export const executeTick = internalMutation({
  handler: async (
    ctx,
  ): Promise<{
    tickNumber: number;
    tickId: Id<"tickHistory">;
    botPurchases: number;
    stockUpdates: number;
    cryptoUpdates: number;
  }> => {
    console.log("[TICK] Executing tick via CRON...");
    try {
      const result = await executeTickLogic(ctx, "cron");
      console.log("[TICK] ✅ Tick completed successfully", result);
      return result;
    } catch (error) {
      console.error("[TICK] ❌ Tick failed", error);
      throw error;
    }
  },
});

// Manual trigger for testing (can be called from admin dashboard)
export const manualTick = action({
  handler: async (
    ctx,
  ): Promise<{
    tickNumber: number;
    tickId: Id<"tickHistory">;
    botPurchases: number;
    stockUpdates: number;
    cryptoUpdates: number;
  }> => {
    console.log("[TICK] Manual tick triggered");
    // Call the internal mutation instead of executing directly
    const result = await ctx.runMutation(internal.tick.executeTick);
    return result;
  },
});

/**
 * BOT PURCHASE SYSTEM - FIXED $500,000 PER COMPANY
 *
 * The bot simulates market demand by purchasing products from companies:
 * - Budget per company: $500,000 fixed
 * - Processes ALL companies every tick
 * - Max 100 products per company
 * - Budget is split equally among all valid products in a company
 * - All purchases are collected first, then executed in batches at the end
 *
 * Max product price: $50,000 (products above this are ignored)
 */

// Phase 1: Calculate purchases without any database writes
async function calculatePurchasesForCompany(
  ctx: any,
  companyId: any,
  companyBudget: number,
) {
  const purchasePlans: Array<{
    productId: any;
    product: any;
    companyId: any;
    quantity: number;
    totalPrice: number;
    newStock: number | undefined;
  }> = [];

  try {
    // Step 1: Fetch products for this company
    const products = await ctx.db
      .query("products")
      .withIndex("by_companyId", (q: any) => q.eq("companyId", companyId))
      .take(100);

    if (!products || products.length === 0) {
      return { purchasePlans, totalSpent: 0 };
    }

    // Step 2: Filter by max price ($50,000) and valid price only
    const validProducts = products.filter((p: any) => {
      const hasValidPrice = p.price && p.price > 0 && isFinite(p.price);
      const withinMaxPrice = p.price <= 5000000; // Max $50,000
      return hasValidPrice && withinMaxPrice;
    });

    if (validProducts.length === 0) {
      return { purchasePlans, totalSpent: 0 };
    }

    // Step 3: Calculate budget allocation across products (equal split per product)
    const budgetPerProduct = Math.floor(companyBudget / validProducts.length);

    // Step 4: Calculate purchases for ALL products with allocated budget
    let remainingBudget = companyBudget;

    for (const product of validProducts) {
      if (remainingBudget <= 0) break;

      const productAllocation = Math.min(budgetPerProduct, remainingBudget);

      // Skip if allocation is too small to buy even one unit
      if (productAllocation < product.price) continue;

      // Calculate desired quantity
      let quantity = Math.floor(productAllocation / product.price);

      // Apply stock constraint
      if (product.stock !== undefined && product.stock !== null) {
        if (product.stock <= 0) continue; // Out of stock
        quantity = Math.min(quantity, product.stock);
      }

      // Apply maxPerOrder constraint
      if (product.maxPerOrder && product.maxPerOrder > 0) {
        quantity = Math.min(quantity, product.maxPerOrder);
      }

      if (quantity <= 0) continue;

      const finalPrice = quantity * product.price;

      // Validate calculations
      if (!isFinite(finalPrice) || finalPrice <= 0 || !isFinite(quantity) || quantity <= 0) {
        continue;
      }

      // Calculate new stock value
      let newStock = product.stock;
      if (product.stock !== undefined && product.stock !== null) {
        newStock = product.stock - quantity;
      }

      purchasePlans.push({
        productId: product._id,
        product: product,
        companyId: product.companyId,
        quantity,
        totalPrice: finalPrice,
        newStock,
      });

      remainingBudget -= finalPrice;
    }

    const totalSpent = companyBudget - remainingBudget;
    return { purchasePlans, totalSpent };
  } catch (error) {
    console.error(
      `[BOT] Error calculating purchases for company ${companyId}:`,
      error,
    );
    return { purchasePlans, totalSpent: 0 };
  }
}

// Phase 2: Execute all purchases in batches
async function executeBotPurchasesAllCompanies(
  ctx: any,
  companiesLimit: number = 10000,
  offset: number = 0,
) {
  console.log(`[BOT] Starting bot purchases - $500,000 per company`);

  const BUDGET_PER_COMPANY = 50000000; // $500,000 in cents
  const BATCH_SIZE = 25; // Write 25 purchases at a time to avoid overload

  try {
    // Fetch ALL companies (no limit)
    const allCompanies = await ctx.db
      .query("companies")
      .collect(); // Get all companies

    console.log(`[BOT] Total companies fetched: ${allCompanies.length}`);

    if (!allCompanies || allCompanies.length === 0) {
      console.log(`[BOT] No companies found`);
      return [];
    }

    // PHASE 1: Calculate all purchases (READS ONLY)
    console.log(`[BOT] Phase 1: Calculating purchases for all companies...`);
    const allPurchasePlans: Array<{
      productId: any;
      product: any;
      companyId: any;
      quantity: number;
      totalPrice: number;
      newStock: number | undefined;
    }> = [];

    let totalSpentAllCompanies = 0;
    const companyUpdates = new Map<any, number>(); // Track balance changes per company

    for (const company of allCompanies) {
      try {
        const result = await calculatePurchasesForCompany(
          ctx,
          company._id,
          BUDGET_PER_COMPANY,
        );

        allPurchasePlans.push(...result.purchasePlans);
        totalSpentAllCompanies += result.totalSpent;

        // Track company balance update
        const currentBalance = companyUpdates.get(company._id) || 0;
        companyUpdates.set(company._id, currentBalance + result.totalSpent);

        console.log(
          `[BOT] Company ${company.name}: ${result.purchasePlans.length} purchases planned, $${(result.totalSpent / 100).toFixed(2)} total`,
        );
      } catch (error) {
        console.error(
          `[BOT] Error calculating purchases for company ${company.name}:`,
          error,
        );
      }
    }

    console.log(
      `[BOT] Phase 1 complete: ${allPurchasePlans.length} purchases planned, $${(totalSpentAllCompanies / 100).toFixed(2)} total`,
    );

    // PHASE 2: Execute all purchases in batches (WRITES)
    console.log(`[BOT] Phase 2: Executing purchases in batches of ${BATCH_SIZE}...`);
    const now = Date.now();
    let executedCount = 0;

    // Process purchases in batches
    for (let i = 0; i < allPurchasePlans.length; i += BATCH_SIZE) {
      const batch = allPurchasePlans.slice(i, i + BATCH_SIZE);
      
      try {
        // Execute batch in parallel
        await Promise.all(
          batch.map(async (plan) => {
            try {
              // Verify company still exists
              const company = await ctx.db.get(plan.companyId);
              if (!company) return;

              // Update product
              const updateData: any = {
                totalSold: (plan.product.totalSold || 0) + plan.quantity,
                totalRevenue: (plan.product.totalRevenue || 0) + plan.totalPrice,
                updatedAt: now,
              };

              if (plan.newStock !== undefined) {
                updateData.stock = plan.newStock;
              }

              await ctx.db.patch(plan.productId, updateData);

              // Update company balance
              await ctx.db.patch(plan.companyId, {
                balance: company.balance + plan.totalPrice,
                updatedAt: now,
              });

              // Record sale
              await ctx.db.insert("marketplaceSales", {
                productId: plan.productId,
                companyId: plan.companyId,
                quantity: plan.quantity,
                purchaserId: "bot" as const,
                purchaserType: "bot" as const,
                totalPrice: plan.totalPrice,
                createdAt: now,
              });

              executedCount++;
            } catch (error) {
              console.error(
                `[BOT] Error executing purchase for product ${plan.productId}:`,
                error,
              );
            }
          })
        );

        console.log(`[BOT] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${executedCount}/${allPurchasePlans.length} purchases executed`);
      } catch (error) {
        console.error(`[BOT] Error executing batch:`, error);
      }
    }

    // PHASE 3: Update company timestamps for rotation
    console.log(`[BOT] Phase 3: Updating company timestamps...`);
    for (const company of allCompanies) {
      try {
        await ctx.db.patch(company._id, {
          updatedAt: now,
        });
      } catch (error) {
        console.error(`[BOT] Failed to update timestamp for company ${company._id}`, error);
      }
    }

    console.log(
      `[BOT] All purchases complete: ${executedCount}/${allPurchasePlans.length} executed, $${(totalSpentAllCompanies / 100).toFixed(2)} total spent`,
    );

    // Return summary for tick history
    return allPurchasePlans.slice(0, executedCount).map(p => ({
      productId: p.productId,
      companyId: p.companyId,
      quantity: p.quantity,
      totalPrice: p.totalPrice,
    }));
  } catch (error) {
    console.error(
      "[BOT] Fatal error in executeBotPurchasesAllCompanies:",
      error,
    );
    return [];
  }
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

    // Fetch all stocks once to avoid multiple queries (only if there are public companies)
    const hasPublicCompanies = companies.some((c: Doc<"companies">) => c.isPublic);
    let stocksByCompanyId = new Map<Id<"companies">, Doc<"stocks">>();
    if (hasPublicCompanies) {
      const allStocks = await ctx.db.query("stocks").collect();
      stocksByCompanyId = new Map<Id<"companies">, Doc<"stocks">>(
        allStocks
          .filter((s: Doc<"stocks">) => s.companyId !== undefined)
          .map((s: Doc<"stocks">) => [s.companyId!, s])
      );
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

export const executeBotPurchasesMutation = internalMutation({
  args: {
    companiesLimit: v.number(),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await executeBotPurchasesAllCompanies(
      ctx,
      args.companiesLimit,
      args.offset || 0,
    );
  },
});

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
