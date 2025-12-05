import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Tax rate tiers based on net worth
const WEALTH_TAX_TIERS = [
  { min: 0, max: 10000000, rate: 0.005 }, // $0-$100k: 0.5% daily
  { min: 10000000, max: 100000000, rate: 0.02 }, // $100k-$1M: 2% daily
  { min: 100000000, max: 1000000000, rate: 0.05 }, // $1M-$10M: 5% daily
  { min: 1000000000, max: 10000000000, rate: 0.1 }, // $10M-$100M: 10% daily
  { min: 10000000000, max: 100000000000, rate: 0.1 }, // $100M-$1B: 10% daily
  { min: 100000000000, max: Infinity, rate: 0.5 }, // $1B+: 50% daily
];

const TRANSACTION_TAX_RATE = 0.02; // 2% on all purchases and sales
const EVASION_SUCCESS_RATE = 0.6; // 60% success rate (40% caught rate)
const EVASION_FINE_RATE = 0.5; // 50% of net worth if caught
const EVASION_PROTECTION_DURATION = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

/**
 * Calculate wealth tax based on net worth tier
 */
function calculateWealthTaxAmount(netWorth: number): { amount: number; rate: number } {
  for (const tier of WEALTH_TAX_TIERS) {
    if (netWorth >= tier.min && netWorth < tier.max) {
      const taxAmount = Math.floor(netWorth * tier.rate);
      return { amount: taxAmount, rate: tier.rate };
    }
  }
  // Fallback to highest tier
  const highestTier = WEALTH_TAX_TIERS[WEALTH_TAX_TIERS.length - 1];
  return {
    amount: Math.floor(netWorth * highestTier.rate),
    rate: highestTier.rate,
  };
}

/**
 * Apply transaction tax (2% on purchases/sales)
 */
export const applyTransactionTax = mutation({
  args: {
    playerId: v.id("players"),
    transactionAmount: v.number(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const taxAmount = Math.floor(args.transactionAmount * TRANSACTION_TAX_RATE);

    // Get player and deduct tax
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    if (player.balance < taxAmount) {
      throw new Error("Insufficient funds to pay transaction tax");
    }

    // Deduct tax from balance
    await ctx.db.patch(args.playerId, {
      balance: player.balance - taxAmount,
      updatedAt: Date.now(),
    });

    // Record tax
    await ctx.db.insert("taxes", {
      playerId: args.playerId,
      taxType: "transaction",
      amount: taxAmount,
      taxRate: TRANSACTION_TAX_RATE,
      description: args.description,
      timestamp: Date.now(),
    });

    return { taxAmount, remainingBalance: player.balance - taxAmount };
  },
});

/**
 * Calculate the tax bracket for a given net worth
 */
export const getTaxBracket = query({
  args: {
    netWorth: v.number(),
  },
  handler: async (ctx, args) => {
    for (const tier of WEALTH_TAX_TIERS) {
      if (args.netWorth >= tier.min && args.netWorth < tier.max) {
        return {
          min: tier.min,
          max: tier.max,
          rate: tier.rate,
          dailyTax: Math.floor(args.netWorth * tier.rate),
        };
      }
    }
    const highestTier = WEALTH_TAX_TIERS[WEALTH_TAX_TIERS.length - 1];
    return {
      min: highestTier.min,
      max: highestTier.max,
      rate: highestTier.rate,
      dailyTax: Math.floor(args.netWorth * highestTier.rate),
    };
  },
});

/**
 * Check if player is currently evading taxes
 */
export const isEvadingTaxes = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const evasionRecord = await ctx.db
      .query("taxEvasion")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    if (!evasionRecord) {
      return { isEvading: false, evadingUntil: null };
    }

    const now = Date.now();
    const isCurrentlyEvading = evasionRecord.evadingUntil > now;

    return {
      isEvading: isCurrentlyEvading,
      evadingUntil: evasionRecord.evadingUntil,
      successfulEvasions: evasionRecord.successfulEvasions,
      failedEvasions: evasionRecord.failedEvasions,
    };
  },
});

/**
 * Attempt to evade taxes
 */
export const attemptTaxEvasion = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if already evading
    const existingEvasion = await ctx.db
      .query("taxEvasion")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    const now = Date.now();

    if (existingEvasion && existingEvasion.evadingUntil > now) {
      throw new Error("You are already evading taxes!");
    }

    // Roll the dice - 60% success, 40% caught
    const random = Math.random();
    const success = random < EVASION_SUCCESS_RATE;

    if (success) {
      // Successfully evaded!
      const evadingUntil = now + EVASION_PROTECTION_DURATION;

      if (existingEvasion) {
        await ctx.db.patch(existingEvasion._id, {
          evadingUntil,
          successfulEvasions: existingEvasion.successfulEvasions + 1,
          lastAttemptTimestamp: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("taxEvasion", {
          playerId: args.playerId,
          evadingUntil,
          successfulEvasions: 1,
          failedEvasions: 0,
          lastAttemptTimestamp: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        success: true,
        message: "Successfully evaded taxes! You won't pay taxes for 1 week.",
        evadingUntil,
      };
    } else {
      // Caught! Pay 50% fine
      const fineAmount = Math.floor(player.netWorth * EVASION_FINE_RATE);
      const newBalance = Math.max(0, player.balance - fineAmount);

      await ctx.db.patch(args.playerId, {
        balance: newBalance,
        updatedAt: now,
      });

      // Record the fine
      await ctx.db.insert("taxes", {
        playerId: args.playerId,
        taxType: "evasion_fine",
        amount: fineAmount,
        netWorthAtTime: player.netWorth,
        taxRate: EVASION_FINE_RATE,
        description: "Tax evasion fine (caught)",
        timestamp: now,
      });

      // Update evasion record
      if (existingEvasion) {
        await ctx.db.patch(existingEvasion._id, {
          failedEvasions: existingEvasion.failedEvasions + 1,
          lastAttemptTimestamp: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("taxEvasion", {
          playerId: args.playerId,
          evadingUntil: 0,
          successfulEvasions: 0,
          failedEvasions: 1,
          lastAttemptTimestamp: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      return {
        success: false,
        message: `You were caught evading taxes! You paid a fine of $${(fineAmount / 100).toFixed(2)}`,
        fineAmount,
        remainingBalance: newBalance,
      };
    }
  },
});

/**
 * Get player's tax statistics
 */
export const getPlayerTaxStats = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      return null;
    }

    // Get all taxes paid
    const allTaxes = await ctx.db
      .query("taxes")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    const transactionTaxes = allTaxes.filter((t) => t.taxType === "transaction");
    const wealthTaxes = allTaxes.filter((t) => t.taxType === "wealth");
    const evasionFines = allTaxes.filter((t) => t.taxType === "evasion_fine");

    const totalTransactionTax = transactionTaxes.reduce((sum, t) => sum + t.amount, 0);
    const totalWealthTax = wealthTaxes.reduce((sum, t) => sum + t.amount, 0);
    const totalFines = evasionFines.reduce((sum, t) => sum + t.amount, 0);
    const totalTaxesPaid = totalTransactionTax + totalWealthTax + totalFines;

    // Get evasion stats
    const evasionRecord = await ctx.db
      .query("taxEvasion")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    const now = Date.now();
    const isCurrentlyEvading = evasionRecord ? evasionRecord.evadingUntil > now : false;

    // Calculate current tax bracket
    const taxBracket = calculateWealthTaxAmount(player.netWorth);

    return {
      totalTaxesPaid,
      totalTransactionTax,
      totalWealthTax,
      totalFines,
      transactionTaxCount: transactionTaxes.length,
      wealthTaxCount: wealthTaxes.length,
      fineCount: evasionFines.length,
      successfulEvasions: evasionRecord?.successfulEvasions ?? 0,
      failedEvasions: evasionRecord?.failedEvasions ?? 0,
      isCurrentlyEvading,
      evadingUntil: evasionRecord?.evadingUntil ?? null,
      currentTaxBracket: {
        rate: taxBracket.rate,
        dailyTax: taxBracket.amount,
      },
      netWorth: player.netWorth,
    };
  },
});

/**
 * Get recent tax history for a player
 */
export const getRecentTaxHistory = query({
  args: {
    playerId: v.id("players"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    const taxes = await ctx.db
      .query("taxes")
      .withIndex("by_player_timestamp", (q) => q.eq("playerId", args.playerId))
      .order("desc")
      .take(limit);

    return taxes;
  },
});

/**
 * Internal mutation to collect daily wealth tax
 * Called by cron job
 */
export const collectDailyWealthTax = internalMutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      return { success: false, reason: "Player not found" };
    }

    // Skip banned or limited players
    if (player.role === "banned" || player.role === "limited") {
      return { success: false, reason: "Player is banned or limited" };
    }

    // Check if player is evading taxes
    const evasionRecord = await ctx.db
      .query("taxEvasion")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .first();

    const now = Date.now();
    const isEvading = evasionRecord && evasionRecord.evadingUntil > now;

    if (isEvading) {
      return { success: false, reason: "Player is evading taxes" };
    }

    // Check if we already collected tax today
    if (evasionRecord && evasionRecord.lastDailyTaxTimestamp) {
      const hoursSinceLastTax = (now - evasionRecord.lastDailyTaxTimestamp) / (1000 * 60 * 60);
      if (hoursSinceLastTax < 24) {
        return { success: false, reason: "Tax already collected today" };
      }
    }

    // Calculate wealth tax
    const { amount: taxAmount, rate } = calculateWealthTaxAmount(player.netWorth);

    if (taxAmount <= 0) {
      return { success: false, reason: "No tax owed" };
    }

    // Deduct tax from balance (but don't go negative)
    const newBalance = Math.max(0, player.balance - taxAmount);
    const actualTaxCollected = player.balance - newBalance;

    await ctx.db.patch(args.playerId, {
      balance: newBalance,
      updatedAt: now,
    });

    // Record tax
    await ctx.db.insert("taxes", {
      playerId: args.playerId,
      taxType: "wealth",
      amount: actualTaxCollected,
      netWorthAtTime: player.netWorth,
      taxRate: rate,
      description: `Daily wealth tax (${(rate * 100).toFixed(1)}% of net worth)`,
      timestamp: now,
    });

    // Update last tax collection timestamp
    if (evasionRecord) {
      await ctx.db.patch(evasionRecord._id, {
        lastDailyTaxTimestamp: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("taxEvasion", {
        playerId: args.playerId,
        evadingUntil: 0,
        successfulEvasions: 0,
        failedEvasions: 0,
        lastAttemptTimestamp: 0,
        lastDailyTaxTimestamp: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      taxAmount: actualTaxCollected,
      rate,
      netWorth: player.netWorth,
      remainingBalance: newBalance,
    };
  },
});

/**
 * Get all players who need daily tax collection
 * Called by cron job
 */
export const getPlayersForDailyTax = query({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.neq(q.field("role"), "banned"),
          q.neq(q.field("role"), "limited")
        )
      )
      .collect();

    const now = Date.now();
    const playersNeedingTax = [];

    for (const player of players) {
      // Check if evading
      const evasionRecord = await ctx.db
        .query("taxEvasion")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .first();

      const isEvading = evasionRecord && evasionRecord.evadingUntil > now;

      if (isEvading) {
        continue;
      }

      // Check if already taxed today
      if (evasionRecord && evasionRecord.lastDailyTaxTimestamp) {
        const hoursSinceLastTax =
          (now - evasionRecord.lastDailyTaxTimestamp) / (1000 * 60 * 60);
        if (hoursSinceLastTax < 24) {
          continue;
        }
      }

      playersNeedingTax.push(player._id);
    }

    return playersNeedingTax;
  },
});

/**
 * Get tax rate tiers (for UI display)
 */
export const getTaxTiers = query({
  args: {},
  handler: async () => {
    return WEALTH_TAX_TIERS.map((tier) => ({
      min: tier.min,
      max: tier.max === Infinity ? "∞" : tier.max,
      rate: tier.rate,
      ratePercent: (tier.rate * 100).toFixed(1) + "%",
    }));
  },
});

/**
 * Internal mutation to collect daily taxes for all players
 * Called by cron job
 */
export const collectAllDailyTaxes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const players = await ctx.db
      .query("players")
      .filter((q) =>
        q.and(
          q.neq(q.field("role"), "banned"),
          q.neq(q.field("role"), "limited")
        )
      )
      .collect();

    const now = Date.now();
    let taxesCollected = 0;
    let playersProcessed = 0;
    let totalTaxAmount = 0;

    for (const player of players) {
      // Check if evading
      const evasionRecord = await ctx.db
        .query("taxEvasion")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .first();

      const isEvading = evasionRecord && evasionRecord.evadingUntil > now;

      if (isEvading) {
        continue;
      }

      // Check if already taxed today
      if (evasionRecord && evasionRecord.lastDailyTaxTimestamp) {
        const hoursSinceLastTax =
          (now - evasionRecord.lastDailyTaxTimestamp) / (1000 * 60 * 60);
        if (hoursSinceLastTax < 24) {
          continue;
        }
      }

      // Calculate wealth tax
      const { amount: taxAmount, rate } = calculateWealthTaxAmount(player.netWorth);

      if (taxAmount <= 0) {
        continue;
      }

      // Deduct tax from balance (but don't go negative)
      const newBalance = Math.max(0, player.balance - taxAmount);
      const actualTaxCollected = player.balance - newBalance;

      if (actualTaxCollected > 0) {
        await ctx.db.patch(player._id, {
          balance: newBalance,
          updatedAt: now,
        });

        // Record tax
        await ctx.db.insert("taxes", {
          playerId: player._id,
          taxType: "wealth",
          amount: actualTaxCollected,
          netWorthAtTime: player.netWorth,
          taxRate: rate,
          description: `Daily wealth tax (${(rate * 100).toFixed(1)}% of net worth)`,
          timestamp: now,
        });

        taxesCollected++;
        totalTaxAmount += actualTaxCollected;
      }

      // Update last tax collection timestamp
      if (evasionRecord) {
        await ctx.db.patch(evasionRecord._id, {
          lastDailyTaxTimestamp: now,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("taxEvasion", {
          playerId: player._id,
          evadingUntil: 0,
          successfulEvasions: 0,
          failedEvasions: 0,
          lastAttemptTimestamp: 0,
          lastDailyTaxTimestamp: now,
          createdAt: now,
          updatedAt: now,
        });
      }

      playersProcessed++;
    }

    console.log(
      `[TAX COLLECTION] Processed ${playersProcessed} players, collected ${taxesCollected} taxes totaling $${(totalTaxAmount / 100).toFixed(2)}`
    );

    return {
      playersProcessed,
      taxesCollected,
      totalTaxAmount,
    };
  },
});
