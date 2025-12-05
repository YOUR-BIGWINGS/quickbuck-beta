import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper to get or create player from token
async function findPlayerByToken(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Find or create the user record
  let user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) =>
      q.eq("tokenIdentifier", identity.subject)
    )
    .unique();

  if (!user) {
    // Create new user if doesn't exist
    const userId = await ctx.db.insert("users", {
      name: identity.name ?? "Anonymous",
      email: identity.email ?? "",
      tokenIdentifier: identity.subject,
    });
    user = await ctx.db.get(userId);
  }

  // Find or create the player record
  let player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .unique();

  if (!player) {
    // Create new player if doesn't exist
    const now = Date.now();
    const playerId = await ctx.db.insert("players", {
      userId: user._id,
      balance: 1000000, // $10,000 in cents
      netWorth: 1000000,
      createdAt: now,
      updatedAt: now,
    });
    player = await ctx.db.get(playerId);
  }

  return player;
}

// Available upgrade types
const AVAILABLE_UPGRADES = [
  {
    upgradeType: "interest_boost",
    name: "+10% Daily Interest Rate",
    description: "Increase your daily interest rate on loans by 10%",
    cost: 50000000, // $500,000
    benefit: "+10% Daily Interest Rate",
  },
  {
    upgradeType: "stock_returns_boost",
    name: "+50% Stock Returns",
    description: "Boost your stock portfolio returns by 50%",
    cost: 100000000, // $1,000,000
    benefit: "+50% Stock Returns",
  },
  {
    upgradeType: "production_cost_reduction",
    name: "-20% Production Costs",
    description: "Reduce production costs for all your company products by 20%",
    cost: 75000000, // $750,000
    benefit: "-20% Production Costs",
  },
  {
    upgradeType: "marketplace_discount",
    name: "10% Marketplace Discount",
    description: "Get a 10% discount on all marketplace purchases",
    cost: 30000000, // $300,000
    benefit: "10% Marketplace Discount",
  },
  {
    upgradeType: "gambling_luck",
    name: "+5% Gambling Win Rate",
    description: "Increase your chances of winning at all gambling games",
    cost: 25000000, // $250,000
    benefit: "+5% Gambling Win Rate",
  },
  {
    upgradeType: "crypto_trading_fee",
    name: "Zero Crypto Trading Fees",
    description: "Eliminate all fees when trading cryptocurrencies",
    cost: 50000000, // $500,000
    benefit: "Zero Crypto Trading Fees",
  },
];

// Get all available upgrades
export const getAvailableUpgrades = query({
  handler: async (ctx) => {
    const player = await findPlayerByToken(ctx);

    // Get already purchased upgrades
    const purchasedUpgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .collect();

    const purchasedTypes = new Set(
      purchasedUpgrades.map((u) => u.upgradeType)
    );

    // Return all upgrades with purchased status
    return AVAILABLE_UPGRADES.map((upgrade) => ({
      ...upgrade,
      isPurchased: purchasedTypes.has(upgrade.upgradeType),
      canAfford: player.balance >= upgrade.cost,
    }));
  },
});

// Get player's purchased upgrades
export const getMyUpgrades = query({
  handler: async (ctx) => {
    const player = await findPlayerByToken(ctx);

    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .collect();

    return upgrades;
  },
});

// Purchase an upgrade
export const purchaseUpgrade = mutation({
  args: {
    upgradeType: v.string(),
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    // Find the upgrade definition
    const upgrade = AVAILABLE_UPGRADES.find(
      (u) => u.upgradeType === args.upgradeType
    );

    if (!upgrade) {
      throw new Error("Invalid upgrade type");
    }

    // Check if already purchased
    const existingUpgrade = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .filter((q) => q.eq(q.field("upgradeType"), args.upgradeType))
      .first();

    if (existingUpgrade) {
      throw new Error("Upgrade already purchased");
    }

    // Apply rebirth 5 discount
    const rebirthCount = player.rebirthCount || 0;
    const hasRebirthDiscount = rebirthCount >= 5;
    const finalCost = hasRebirthDiscount 
      ? Math.floor(upgrade.cost * 0.95) // 5% discount
      : upgrade.cost;

    // Check balance
    if (player.balance < finalCost) {
      throw new Error("Insufficient balance");
    }

    // Deduct cost from balance
    await ctx.db.patch(player._id, {
      balance: player.balance - finalCost,
      updatedAt: Date.now(),
    });

    // Create upgrade record
    const upgradeId = await ctx.db.insert("upgrades", {
      playerId: player._id,
      upgradeType: upgrade.upgradeType,
      name: upgrade.name,
      description: upgrade.description,
      cost: finalCost,
      benefit: upgrade.benefit,
      isActive: true,
      purchasedAt: Date.now(),
    });

    // Create transaction record
    const description = hasRebirthDiscount
      ? `Purchased upgrade: ${upgrade.name} (5% rebirth discount applied)`
      : `Purchased upgrade: ${upgrade.name}`;
    
    await ctx.db.insert("transactions", {
      fromAccountId: player._id,
      fromAccountType: "player" as const,
      toAccountId: player._id,
      toAccountType: "player" as const,
      amount: finalCost,
      assetType: "cash" as const,
      description: description,
      createdAt: Date.now(),
    });

    return {
      success: true,
      upgradeId,
      newBalance: player.balance - upgrade.cost,
    };
  },
});

// Toggle upgrade active status
export const toggleUpgrade = mutation({
  args: {
    upgradeId: v.id("upgrades"),
  },
  handler: async (ctx, args) => {
    const player = await findPlayerByToken(ctx);

    const upgrade = await ctx.db.get(args.upgradeId);

    if (!upgrade) {
      throw new Error("Upgrade not found");
    }

    if (upgrade.playerId !== player._id) {
      throw new Error("Not your upgrade");
    }

    await ctx.db.patch(args.upgradeId, {
      isActive: !upgrade.isActive,
    });

    return {
      success: true,
      isActive: !upgrade.isActive,
    };
  },
});

// Get upgrade multipliers for a player (helper for other systems)
export const getPlayerUpgradeMultipliers = query({
  handler: async (ctx) => {
    const player = await findPlayerByToken(ctx);

    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const multipliers = {
      interestRateBoost: 0,
      stockReturnsBoost: 0,
      productionCostReduction: 0,
      marketplaceDiscount: 0,
      gamblingLuckBoost: 0,
      cryptoTradingFee: 1, // 1 = normal fees, 0 = no fees
    };

    for (const upgrade of upgrades) {
      switch (upgrade.upgradeType) {
        case "interest_boost":
          multipliers.interestRateBoost = 0.1; // 10%
          break;
        case "stock_returns_boost":
          multipliers.stockReturnsBoost = 0.5; // 50%
          break;
        case "production_cost_reduction":
          multipliers.productionCostReduction = 0.2; // 20%
          break;
        case "marketplace_discount":
          multipliers.marketplaceDiscount = 0.1; // 10%
          break;
        case "gambling_luck":
          multipliers.gamblingLuckBoost = 0.05; // 5%
          break;
        case "crypto_trading_fee":
          multipliers.cryptoTradingFee = 0; // No fees
          break;
      }
    }

    return multipliers;
  },
});

// Get upgrade stats
export const getUpgradeStats = query({
  handler: async (ctx) => {
    const player = await findPlayerByToken(ctx);

    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", player._id))
      .collect();

    const totalSpent = upgrades.reduce((sum, u) => sum + u.cost, 0);
    const activeUpgrades = upgrades.filter((u) => u.isActive).length;
    const totalUpgrades = upgrades.length;

    return {
      totalUpgrades,
      activeUpgrades,
      totalSpent,
    };
  },
});
