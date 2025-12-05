import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Rebirth threshold: 10T net worth
const REBIRTH_THRESHOLD = 10_000_000_000_000; // 10 trillion cents ($100 billion)

/**
 * Query: Check if player is eligible for rebirth
 */
export const checkRebirthEligibility = query({
  handler: async (ctx) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { eligible: false, netWorth: 0, threshold: REBIRTH_THRESHOLD, currentRebirth: 0 };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) return { eligible: false, netWorth: 0, threshold: REBIRTH_THRESHOLD, currentRebirth: 0 };

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) return { eligible: false, netWorth: 0, threshold: REBIRTH_THRESHOLD, currentRebirth: 0 };

    const eligible = player.netWorth >= REBIRTH_THRESHOLD;
    const currentRebirth = player.rebirthCount || 0;

    return {
      eligible,
      netWorth: player.netWorth,
      threshold: REBIRTH_THRESHOLD,
      currentRebirth,
      nextRebirth: currentRebirth + 1,
    };
  },
});

/**
 * Helper: Get rebirth rewards configuration (internal helper)
 */
async function getRebirthRewardsInternal(ctx: any) {
  // Fetch from gameConfig or return defaults
  const config = await ctx.db
    .query("gameConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "rebirthRewards"))
    .unique();

  if (config?.value) {
    return config.value;
  }

  // Default rebirth rewards
  return {
    1: {
      badge: {
        text: "R1",
        color: "#FFD700",
        description: "Rebirth 1 - First Ascension",
      },
      rewards: [
        "Rebirth 1 Badge",
        "Clerk account protection during wipes",
      ],
    },
    2: {
      badge: {
        text: "R2",
        color: "#C0C0C0",
        description: "Rebirth 2 - Second Ascension",
      },
      rewards: [
        "Rebirth 2 Badge (replaces R1)",
        "Unlock QuickBuck Pro theme",
        "Clerk account protection during wipes",
      ],
      unlockedTheme: "quickbuck-pro",
    },
    3: {
      badge: {
        text: "R3",
        color: "#CD7F32",
        description: "Rebirth 3 - Third Ascension",
      },
      rewards: [
        "Rebirth 3 Badge (replaces R2)",
        "5% total account boost",
        "QuickBuck Pro theme",
        "Clerk account protection during wipes",
      ],
      accountBoost: 0.05, // 5% boost
    },
    4: {
      badge: {
        text: "R4",
        color: "#9333EA",
        description: "Rebirth 4 - Fourth Ascension",
      },
      rewards: [
        "Rebirth 4 Badge (replaces R3)",
        "Purple username color",
        "5% total account boost",
        "QuickBuck Pro theme",
        "Clerk account protection during wipes",
      ],
      accountBoost: 0.05, // 5% boost
      usernameColor: "#9333EA", // Purple username
    },
    5: {
      badge: {
        text: "R5",
        color: "#EC4899",
        description: "Rebirth 5 - Fifth Ascension",
      },
      rewards: [
        "Rebirth 5 Badge (replaces R4)",
        "Custom hex username color",
        "5% discount on all items",
        "5% total account boost",
        "QuickBuck Pro theme",
        "Clerk account protection during wipes",
      ],
      accountBoost: 0.05, // 5% boost
      discount: 0.05, // 5% discount on all purchases
      customHexColor: true, // Can set custom username color
    },
  };
}

/**
 * Query: Get rebirth rewards configuration
 */
export const getRebirthRewards = query({
  handler: async (ctx) => {
    return await getRebirthRewardsInternal(ctx);
  },
});

/**
 * Query: Get player's current rebirth info
 */
export const getPlayerRebirthInfo = query({
  args: {
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, args) => {
    let player;

    if (args.playerId) {
      player = await ctx.db.get(args.playerId);
    } else {
      // Get current authenticated player
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) return null;

      const user = await ctx.db
        .query("users")
        .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
        .unique();
      if (!user) return null;

      player = await ctx.db
        .query("players")
        .withIndex("by_userId", (q) => q.eq("userId", user._id))
        .unique();
    }

    if (!player) return null;

    const rebirthCount = player.rebirthCount || 0;
    const hasClerkAccount = player.hasClerkAccount || false;

    // Get rebirth rewards config
    const rebirthRewards = await getRebirthRewardsInternal(ctx);

    let currentReward = null;
    if (rebirthCount > 0 && rebirthRewards[rebirthCount]) {
      currentReward = rebirthRewards[rebirthCount];
    }

    return {
      rebirthCount,
      hasClerkAccount,
      currentReward,
      accountBoost: rebirthCount >= 3 ? 0.05 : 0,
    };
  },
});

/**
 * Mutation: Perform rebirth (reset player but keep rebirth count and add badge)
 */
export const performRebirth = mutation({
  handler: async (ctx) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) throw new Error("Player not found");

    // Check eligibility
    if (player.netWorth < REBIRTH_THRESHOLD) {
      throw new Error(`Net worth must be at least $${REBIRTH_THRESHOLD / 100} to rebirth`);
    }

    const currentRebirthCount = player.rebirthCount || 0;
    const newRebirthCount = currentRebirthCount + 1;

    // Get starting balance from game config
    const startingBalanceConfig = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "startingPlayerBalance"))
      .unique();
    const startingBalance = startingBalanceConfig?.value || 1000000; // $10,000 default

    // Update player - reset balance and net worth but keep rebirth data
    await ctx.db.patch(player._id, {
      balance: startingBalance,
      netWorth: startingBalance,
      rebirthCount: newRebirthCount,
      hasClerkAccount: true, // Grant clerk account protection
      updatedAt: Date.now(),
    });

    // Clear player's companies, products, inventory, etc.
    await clearPlayerAssets(ctx, player._id);

    // Update/create rebirth badge tag
    await updateRebirthBadge(ctx, player._id, newRebirthCount);

    // Get rebirth rewards
    const rebirthRewards = await getRebirthRewardsInternal(ctx);
    const reward = rebirthRewards[newRebirthCount];

    return {
      success: true,
      message: `Rebirth ${newRebirthCount} complete!`,
      newRebirthCount,
      reward,
    };
  },
});

/**
 * Helper: Clear all player assets (companies, inventory, portfolios, etc.)
 */
async function clearPlayerAssets(ctx: any, playerId: Id<"players">) {
  // Delete companies owned by player
  const companies = await ctx.db
    .query("companies")
    .withIndex("by_ownerId", (q: any) => q.eq("ownerId", playerId))
    .collect();

  for (const company of companies) {
    // Delete products
    const products = await ctx.db
      .query("products")
      .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
      .collect();
    for (const product of products) {
      await ctx.db.delete(product._id);
    }

    // Delete company stock portfolios
    const companyStocks = await ctx.db
      .query("companyStockPortfolios")
      .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
      .collect();
    for (const stock of companyStocks) {
      await ctx.db.delete(stock._id);
    }

    // Delete company
    await ctx.db.delete(company._id);
  }

  // Delete player inventory
  const inventory = await ctx.db
    .query("playerInventory")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();
  for (const item of inventory) {
    await ctx.db.delete(item._id);
  }

  // Delete player cart
  const cart = await ctx.db
    .query("carts")
    .withIndex("by_userId", (q: any) => q.eq("userId", playerId))
    .unique();
  if (cart) {
    const cartItems = await ctx.db
      .query("cartItems")
      .withIndex("by_cartId", (q: any) => q.eq("cartId", cart._id))
      .collect();
    for (const item of cartItems) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.delete(cart._id);
  }

  // Delete loans
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();
  for (const loan of loans) {
    await ctx.db.delete(loan._id);
  }

  // Delete upgrades
  const upgrades = await ctx.db
    .query("upgrades")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();
  for (const upgrade of upgrades) {
    await ctx.db.delete(upgrade._id);
  }

  // Delete stock portfolios
  const stockPortfolios = await ctx.db
    .query("playerStockPortfolios")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();
  for (const portfolio of stockPortfolios) {
    await ctx.db.delete(portfolio._id);
  }

  // Delete crypto wallets
  const cryptoWallets = await ctx.db
    .query("playerCryptoWallets")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();
  for (const wallet of cryptoWallets) {
    await ctx.db.delete(wallet._id);
  }

  // Delete blackjack games
  const blackjackGames = await ctx.db
    .query("blackjackGames")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();
  for (const game of blackjackGames) {
    await ctx.db.delete(game._id);
  }

  // Delete tax evasion records
  const taxEvasion = await ctx.db
    .query("taxEvasion")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .unique();
  if (taxEvasion) {
    await ctx.db.delete(taxEvasion._id);
  }
}

/**
 * Helper: Update or create rebirth badge for player
 */
async function updateRebirthBadge(ctx: any, playerId: Id<"players">, rebirthCount: number) {
  // Get rebirth rewards config
  const rebirthRewards = await getRebirthRewardsInternal(ctx);
  const reward = rebirthRewards[rebirthCount];

  if (!reward || !reward.badge) return;

  // Check if player already has a rebirth tag
  const existingTag = await ctx.db
    .query("playerTags")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .unique();

  const now = Date.now();

  // Find or create a system admin ID for rebirth system
  let systemAdminId = playerId; // Default to player ID if no admin found

  const admins = await ctx.db
    .query("players")
    .withIndex("by_role", (q: any) => q.eq("role", "admin"))
    .first();
  if (admins) {
    systemAdminId = admins._id;
  }

  // Determine username color based on rebirth level
  let usernameColor = undefined;
  if (reward.usernameColor) {
    // Tier 4: purple username color
    usernameColor = reward.usernameColor;
  } else if (reward.customHexColor && existingTag?.usernameColor) {
    // Tier 5: keep existing custom color if set, otherwise undefined (will be set later)
    usernameColor = existingTag.usernameColor;
  }

  if (existingTag) {
    // Update existing tag
    await ctx.db.patch(existingTag._id, {
      tagText: reward.badge.text,
      tagColor: reward.badge.color,
      usernameColor: usernameColor,
      updatedAt: now,
    });
  } else {
    // Create new tag
    await ctx.db.insert("playerTags", {
      playerId,
      tagText: reward.badge.text,
      tagColor: reward.badge.color,
      usernameColor: usernameColor,
      createdByAdminId: systemAdminId,
      createdAt: now,
      updatedAt: now,
    });
  }
}

/**
 * Mutation: Update rebirth rewards configuration (admin only)
 */
export const updateRebirthRewards = mutation({
  args: {
    rewards: v.any(), // Full rewards object
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) throw new Error("Player not found");

    // Check if admin
    if (player.role !== "admin") {
      throw new Error("Only admins can update rebirth rewards");
    }

    // Update or create config
    const existing = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "rebirthRewards"))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.rewards,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameConfig", {
        key: "rebirthRewards",
        value: args.rewards,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Helper: Apply rebirth boost to an amount (for earnings)
 * Returns the boosted amount if player has rebirth 3+
 */
export const applyRebirthBoost = async (ctx: any, playerId: Id<"players">, amount: number): Promise<number> => {
  const player = await ctx.db.get(playerId);
  if (!player) return amount;

  const rebirthCount = player.rebirthCount || 0;
  if (rebirthCount >= 3) {
    // 5% boost for rebirth 3+
    return Math.floor(amount * 1.05);
  }

  return amount;
};

/**
 * Helper: Apply rebirth discount to a price (for purchases)
 * Returns the discounted price if player has rebirth 5+
 */
export const applyRebirthDiscount = async (ctx: any, playerId: Id<"players">, price: number): Promise<number> => {
  const player = await ctx.db.get(playerId);
  if (!player) return price;

  const rebirthCount = player.rebirthCount || 0;
  const rebirthRewards = await getRebirthRewardsInternal(ctx);
  const reward = rebirthRewards[rebirthCount];

  if (reward?.discount) {
    // Apply discount (e.g., 5% off for tier 5)
    return Math.floor(price * (1 - reward.discount));
  }

  return price;
};

/**
 * Mutation: Set custom username color (Tier 5 only)
 */
export const setCustomUsernameColor = mutation({
  args: {
    hexColor: v.string(),
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) throw new Error("Player not found");

    // Check if player is rebirth 5+
    const rebirthCount = player.rebirthCount || 0;
    if (rebirthCount < 5) {
      throw new Error("You must be Rebirth 5 or higher to set a custom username color");
    }

    // Validate hex color format
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexColorRegex.test(args.hexColor)) {
      throw new Error("Invalid hex color format. Use format: #RRGGBB");
    }

    // Get player's tag
    const tag = await ctx.db
      .query("playerTags")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .unique();

    if (!tag) {
      throw new Error("Player tag not found");
    }

    // Update username color
    await ctx.db.patch(tag._id, {
      usernameColor: args.hexColor,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Custom username color set successfully",
      hexColor: args.hexColor,
    };
  },
});
