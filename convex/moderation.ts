import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";

// Type definitions for player roles
export type PlayerRole = "normal" | "limited" | "banned" | "mod" | "admin";

// Helper: Get player role
export async function getPlayerRole(
  ctx: any,
  playerId: Id<"players">
): Promise<PlayerRole> {
  const player = await ctx.db.get(playerId);
  return player?.role || "normal";
}

// Helper: Check if player has permission level
export async function hasPermission(
  ctx: any,
  playerId: Id<"players">,
  requiredRole: "mod" | "admin"
): Promise<boolean> {
  const role = await getPlayerRole(ctx, playerId);

  if (requiredRole === "admin") {
    return role === "admin";
  }

  if (requiredRole === "mod") {
    return role === "mod" || role === "admin";
  }

  return false;
}

// Helper: Check if player can perform actions
export async function canPerformActions(
  ctx: any,
  playerId: Id<"players">
): Promise<boolean> {
  const role = await getPlayerRole(ctx, playerId);
  return role !== "banned" && role !== "limited";
}

// Helper: Check if player can create content
export async function canCreateContent(
  ctx: any,
  playerId: Id<"players">
): Promise<boolean> {
  const role = await getPlayerRole(ctx, playerId);
  return role !== "banned" && role !== "limited";
}

// Query: Get current player with role info
export const getCurrentPlayer = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return null;

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    return player;
  },
});

// Query: Check if current user is mod or admin
export const checkModerationAccess = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { hasAccess: false, role: "normal" as PlayerRole };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return { hasAccess: false, role: "normal" as PlayerRole };
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    const role = player?.role || "normal";
    const hasAccess = role === "mod" || role === "admin";

    return { hasAccess, role };
  },
});

// Query: Get all players for moderation panel
export const getAllPlayersForModeration = query({
  args: {
    filterRole: v.optional(
      v.union(
        v.literal("normal"),
        v.literal("limited"),
        v.literal("banned"),
        v.literal("mod"),
        v.literal("admin")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    let players: Doc<"players">[];

    if (args.filterRole) {
      players = await ctx.db
        .query("players")
        .withIndex("by_role", (q) => q.eq("role", args.filterRole))
        .collect();
    } else {
      players = await ctx.db.query("players").collect();
    }

    // Enrich with user data
    const enrichedPlayers = await Promise.all(
      players.map(async (player) => {
        const userData = await ctx.db.get(player.userId);
        return {
          ...player,
          userName: userData?.name || "Unknown",
          userEmail: userData?.email || "N/A",
        };
      })
    );

    return enrichedPlayers;
  },
});

// Mutation: Limit player account
export const limitPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Prevent limiting admins or self
    const targetRole = targetPlayer.role || "normal";
    if (targetRole === "admin") {
      throw new Error("Cannot limit an admin");
    }
    if (args.targetPlayerId === currentPlayer._id) {
      throw new Error("Cannot limit yourself");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "limited",
      limitReason: args.reason,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player account limited successfully" };
  },
});

// Mutation: Unlimit player account
export const unlimitPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "normal",
      limitReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player account restored to normal" };
  },
});

// Mutation: Ban player and clear all their data
export const banPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Prevent banning admins or self
    const targetRole = targetPlayer.role || "normal";
    if (targetRole === "admin") {
      throw new Error("Cannot ban an admin");
    }
    if (args.targetPlayerId === currentPlayer._id) {
      throw new Error("Cannot ban yourself");
    }

    // Delete all user companies and their products
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.targetPlayerId))
      .collect();

    for (const company of companies) {
      // Delete all products for this company
      const products = await ctx.db
        .query("products")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .collect();

      for (const product of products) {
        await ctx.db.delete(product._id);
      }

      // Marketplace listings
      const listings = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_sellerCompanyId", (q) =>
          q.eq("sellerCompanyId", company._id)
        )
        .collect();

      for (const listing of listings) {
        await ctx.db.delete(listing._id);
      }

      // Delete company sales
      const companySales = await ctx.db
        .query("companySales")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .collect();

      for (const sale of companySales) {
        await ctx.db.delete(sale._id);
      }

      // Delete the company
      await ctx.db.delete(company._id);
    }

    // Delete user cart and cart items
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .unique();

    if (cart) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
        .collect();

      for (const item of cartItems) {
        await ctx.db.delete(item._id);
      }

      await ctx.db.delete(cart._id);
    }

    // Delete all user transactions
    const transactionsFrom = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) =>
        q.eq("fromAccountId", args.targetPlayerId)
      )
      .collect();

    for (const tx of transactionsFrom) {
      await ctx.db.delete(tx._id);
    }

    const transactionsTo = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) =>
        q.eq("toAccountId", args.targetPlayerId)
      )
      .collect();

    for (const tx of transactionsTo) {
      await ctx.db.delete(tx._id);
    }

    // Delete all user loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const loan of loans) {
      await ctx.db.delete(loan._id);
    }

    // Delete all company shares owned by user
    const companyShares = await ctx.db
      .query("companyShares")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .collect();

    for (const share of companyShares) {
      await ctx.db.delete(share._id);
    }

    // Delete marketplace sales where user was involved (as purchaser)
    const purchaserSales = await ctx.db
      .query("marketplaceSales")
      .withIndex("by_purchaserId", (q) =>
        q.eq("purchaserId", args.targetPlayerId)
      )
      .collect();

    for (const sale of purchaserSales) {
      await ctx.db.delete(sale._id);
    }

    // Delete player inventory
    const inventory = await ctx.db
      .query("playerInventory")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const item of inventory) {
      await ctx.db.delete(item._id);
    }

    // Delete upgrades
    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const upgrade of upgrades) {
      await ctx.db.delete(upgrade._id);
    }

    // Delete gambling history
    const gamblingHistory = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const entry of gamblingHistory) {
      await ctx.db.delete(entry._id);
    }

    // Delete stock price history and trades where relevant (keep these as they're historical)
    // Actually, we should keep these for admin records. Skip.

    // Now set the player as banned
    await ctx.db.patch(args.targetPlayerId, {
      role: "banned",
      banReason: args.reason,
      balance: 0,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Player banned successfully and all data cleared",
    };
  },
});

// Mutation: Unban player
export const unbanPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "normal",
      banReason: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player unbanned successfully" };
  },
});

// Mutation: Permanently delete banned player and blacklist email (admin only)
export const permanentlyDeleteBannedPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    // Only admins can permanently delete
    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Only admins can permanently delete accounts");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Verify player is banned
    if (targetPlayer.role !== "banned") {
      throw new Error("Can only permanently delete banned accounts");
    }

    // Get target user info
    const targetUser = await ctx.db.get(targetPlayer.userId);
    if (!targetUser) throw new Error("Target user not found");

    // Blacklist the email if it exists
    if (targetUser.email) {
      const existingBlacklist = await ctx.db
        .query("emailBlacklist")
        .withIndex("by_email", (q) => q.eq("email", targetUser.email!))
        .unique();

      if (!existingBlacklist) {
        await ctx.db.insert("emailBlacklist", {
          email: targetUser.email,
          reason: targetPlayer.banReason || "Permanently banned",
          bannedByAdminId: currentPlayer._id,
          bannedAt: Date.now(),
          originalPlayerName: targetUser.name || "Unknown",
        });
      }
    }

    // Delete all player's companies and their products
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.targetPlayerId))
      .collect();

    for (const company of companies) {
      // Delete all products for this company
      const products = await ctx.db
        .query("products")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .collect();

      for (const product of products) {
        await ctx.db.delete(product._id);
      }

      // Delete marketplace listings
      const listings = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_sellerCompanyId", (q) =>
          q.eq("sellerCompanyId", company._id)
        )
        .collect();

      for (const listing of listings) {
        await ctx.db.delete(listing._id);
      }

      // Delete company sales
      const companySales = await ctx.db
        .query("companySales")
        .withIndex("by_companyId", (q) => q.eq("companyId", company._id))
        .collect();

      for (const sale of companySales) {
        await ctx.db.delete(sale._id);
      }

      // Delete the company
      await ctx.db.delete(company._id);
    }

    // Delete cart and cart items
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q) => q.eq("userId", args.targetPlayerId))
      .unique();

    if (cart) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cartId", (q) => q.eq("cartId", cart._id))
        .collect();

      for (const item of cartItems) {
        await ctx.db.delete(item._id);
      }

      await ctx.db.delete(cart._id);
    }

    // Delete stock portfolios and transactions
    const portfolios = await ctx.db
      .query("playerStockPortfolios")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const portfolio of portfolios) {
      await ctx.db.delete(portfolio._id);
    }

    const stockTransactions = await ctx.db
      .query("stockTransactions")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const transaction of stockTransactions) {
      await ctx.db.delete(transaction._id);
    }

    // Delete crypto wallets and transactions
    const cryptoWallets = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_player_crypto")
      .collect();
    
    for (const wallet of cryptoWallets) {
      if (wallet.playerId === args.targetPlayerId) {
        await ctx.db.delete(wallet._id);
      }
    }

    const cryptoTransactions = await ctx.db
      .query("cryptoTransactions")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const transaction of cryptoTransactions) {
      await ctx.db.delete(transaction._id);
    }

    // Delete loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const loan of loans) {
      await ctx.db.delete(loan._id);
    }

    // Delete upgrades
    const upgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const upgrade of upgrades) {
      await ctx.db.delete(upgrade._id);
    }

    // Delete gambling history
    const gamblingHistory = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const record of gamblingHistory) {
      await ctx.db.delete(record._id);
    }

    // Delete blackjack games
    const blackjackGames = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .collect();

    for (const game of blackjackGames) {
      await ctx.db.delete(game._id);
    }

    // Delete subscriptions (by userId not playerId)
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => q.eq(q.field("userId"), targetUser._id))
      .collect();

    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }

    // Delete the player
    await ctx.db.delete(args.targetPlayerId);

    // Delete the user
    await ctx.db.delete(targetPlayer.userId);

    return {
      success: true,
      message: `Player permanently deleted and email ${targetUser.email || "N/A"} blacklisted`,
    };
  },
});

// Mutation: Warn player
export const warnPlayer = mutation({
  args: {
    targetPlayerId: v.id("players"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    // Prevent warning admins or self
    const targetRole = targetPlayer.role || "normal";
    if (targetRole === "admin") {
      throw new Error("Cannot warn an admin");
    }
    if (args.targetPlayerId === currentPlayer._id) {
      throw new Error("Cannot warn yourself");
    }

    // Add warning to list
    const existingWarnings = targetPlayer.warnings || [];
    const newWarnings = [
      ...existingWarnings,
      {
        reason: args.reason,
        createdAt: Date.now(),
      },
    ];

    await ctx.db.patch(args.targetPlayerId, {
      warnings: newWarnings,
      warningCount: newWarnings.length,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Player warned successfully (${
        newWarnings.length
      } total warning${newWarnings.length !== 1 ? "s" : ""})`,
      warningCount: newWarnings.length,
    };
  },
});

// Mutation: Clear warnings for a player (mod and admin can do this)
export const clearWarnings = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    // Mods and admins can clear warnings
    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    await ctx.db.patch(args.targetPlayerId, {
      warnings: [],
      warningCount: 0,
      updatedAt: Date.now(),
    });

    return { success: true, message: "All warnings cleared for player" };
  },
});

// Mutation: Remove a specific warning (mod and admin can do this)
export const removeWarning = mutation({
  args: {
    targetPlayerId: v.id("players"),
    warningIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    // Mods and admins can remove warnings
    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    const warnings = targetPlayer.warnings || [];
    if (args.warningIndex < 0 || args.warningIndex >= warnings.length) {
      throw new Error("Invalid warning index");
    }

    // Remove the specific warning
    const newWarnings = warnings.filter(
      (_, index) => index !== args.warningIndex
    );

    await ctx.db.patch(args.targetPlayerId, {
      warnings: newWarnings,
      warningCount: newWarnings.length,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Warning removed successfully",
      remainingWarnings: newWarnings.length,
    };
  },
});

// Mutation: Assign moderator role (admin only)
export const assignModerator = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    const currentRole = targetPlayer.role || "normal";
    if (currentRole === "banned") {
      throw new Error("Cannot promote a banned player");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "mod",
      updatedAt: Date.now(),
    });

    return { success: true, message: "Player promoted to moderator" };
  },
});

// Mutation: Remove moderator role (admin only)
export const removeModerator = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) throw new Error("Target player not found");

    const currentRole = targetPlayer.role || "normal";
    if (currentRole === "admin") {
      throw new Error("Cannot demote an admin");
    }
    if (currentRole !== "mod") {
      throw new Error("Target player is not a moderator");
    }

    await ctx.db.patch(args.targetPlayerId, {
      role: "normal",
      updatedAt: Date.now(),
    });

    return { success: true, message: "Moderator demoted to normal user" };
  },
});

// Mutation: Delete company (mod action)
export const deleteCompanyAsMod = mutation({
  args: {
    companyId: v.id("companies"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // Archive all products
    const products = await ctx.db
      .query("products")
      .withIndex("by_companyId", (q) => q.eq("companyId", args.companyId))
      .collect();

    for (const product of products) {
      await ctx.db.patch(product._id, {
        isActive: false,
        isArchived: true,
        updatedAt: Date.now(),
      });
    }

    // Delete the company
    await ctx.db.delete(args.companyId);

    return {
      success: true,
      message: `Company deleted by moderator. Reason: ${args.reason}`,
    };
  },
});

// Mutation: Delete product (mod action)
export const deleteProductAsMod = mutation({
  args: {
    productId: v.id("products"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Actually delete the product
    await ctx.db.delete(args.productId);

    return {
      success: true,
      message: `Product deleted by moderator. Reason: ${args.reason}`,
    };
  },
});

// Mutation: Bulk delete products (mod/admin)
export const bulkDeleteProducts = mutation({
  args: {
    productIds: v.array(v.id("products")),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - mod or admin required");
    }

    if (args.productIds.length === 0) {
      throw new Error("No products selected for deletion");
    }

    if (args.productIds.length > 100) {
      throw new Error("Cannot delete more than 100 products at once");
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (const productId of args.productIds) {
      try {
        const product = await ctx.db.get(productId);
        if (!product) {
          errors.push(`Product ${productId} not found`);
          continue;
        }

        await ctx.db.delete(productId);
        deletedCount++;
      } catch (error: any) {
        errors.push(`Failed to delete product ${productId}: ${error.message}`);
      }
    }

    const message =
      errors.length > 0
        ? `Deleted ${deletedCount} of ${
            args.productIds.length
          } products. Errors: ${errors.join(", ")}`
        : `Successfully deleted ${deletedCount} products. Reason: ${args.reason}`;

    return {
      success: true,
      message,
      deletedCount,
      totalRequested: args.productIds.length,
      errors,
    };
  },
});

// Mutation: Set player balance (admin only)
export const setPlayerBalance = mutation({
  args: {
    targetPlayerId: v.id("players"),
    newBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    if (args.newBalance < 0 || !Number.isSafeInteger(args.newBalance)) {
      throw new Error("Invalid balance value");
    }

    await ctx.db.patch(args.targetPlayerId, {
      balance: args.newBalance,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Player balance set to $${(args.newBalance / 100).toFixed(2)}`,
    };
  },
});

// Mutation: Set company balance (admin only)
export const setCompanyBalance = mutation({
  args: {
    companyId: v.id("companies"),
    newBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Insufficient permissions - admin required");
    }

    if (args.newBalance < 0 || !Number.isSafeInteger(args.newBalance)) {
      throw new Error("Invalid balance value");
    }

    await ctx.db.patch(args.companyId, {
      balance: args.newBalance,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Company balance set to $${(args.newBalance / 100).toFixed(2)}`,
    };
  },
});

// Query: Get all companies for moderation
export const getAllCompaniesForModeration = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    const companies = await ctx.db.query("companies").collect();

    // Enrich with owner data
    const enrichedCompanies = await Promise.all(
      companies.map(async (company) => {
        const owner = await ctx.db.get(company.ownerId);
        const ownerUser = owner ? await ctx.db.get(owner.userId) : null;
        return {
          ...company,
          ownerName: ownerUser?.name || "Unknown",
        };
      })
    );

    return enrichedCompanies;
  },
});

// Query: Get all products for moderation
export const getAllProductsForModeration = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasAccess) {
      throw new Error("Insufficient permissions");
    }

    // Fetch all products without pagination
    const products = await ctx.db.query("products").collect();

    // Enrich with company data
    const enrichedProducts = await Promise.all(
      products.map(async (product) => {
        const company = await ctx.db.get(product.companyId);
        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          image: product.image,
          stock: product.stock,
          isActive: product.isActive,
          isArchived: product.isArchived,
          totalSold: product.totalSold,
          totalRevenue: product.totalRevenue,
          createdAt: product.createdAt,
          companyId: product.companyId,
          companyName: company?.name || "Unknown",
        };
      })
    );

    return {
      products: enrichedProducts,
      total: enrichedProducts.length,
    };
  },
});

// Internal mutation: Grant admin role (no auth check - for bootstrapping first admin)
export const grantAdminRole = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.userEmail))
      .unique();

    if (!user) {
      throw new Error("User not found with email: " + args.userEmail);
    }

    // Find player
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) {
      throw new Error("Player not found for this user");
    }

    // Grant admin role
    await ctx.db.patch(player._id, {
      role: "admin",
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Admin role granted to ${user.name || user.email}`,
      playerId: player._id,
    };
  },
});

// ===============================
// ADMIN FIX FUNCTIONS
// ===============================

/**
 * ADMIN FUNCTION: Fix player balance after duplicate loan issue
 *
 * This function corrects the balance of players who received duplicate loan credits
 * due to a race condition that has now been fixed.
 */
export const fixDuplicateLoanBalance = mutation({
  args: {
    playerId: v.id("players"),
    adjustmentAmount: v.number(), // Amount to add (in cents)
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if current user is admin
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) throw new Error("Player not found");

    const hasAccess = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!hasAccess) {
      throw new Error("Insufficient permissions - admin required");
    }

    // Get the target player
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Target player not found");
    }

    console.log(`Admin ${currentPlayer._id} fixing player ${args.playerId}`);
    console.log(`Current balance: $${(player.balance / 100).toFixed(2)}`);
    console.log(`Adjustment: $${(args.adjustmentAmount / 100).toFixed(2)}`);
    console.log(`Reason: ${args.reason}`);

    const newBalance = player.balance + args.adjustmentAmount;

    await ctx.db.patch(args.playerId, {
      balance: newBalance,
      updatedAt: Date.now(),
    });

    // Create a transaction record for audit purposes
    await ctx.db.insert("transactions", {
      fromAccountId: args.playerId,
      fromAccountType: "player" as const,
      toAccountId: args.playerId,
      toAccountType: "player" as const,
      amount: args.adjustmentAmount,
      assetType: "cash" as const,
      description: `Admin adjustment by ${user.email || user.name}: ${
        args.reason
      }`,
      createdAt: Date.now(),
    });

    console.log(`New balance: $${(newBalance / 100).toFixed(2)}`);

    return {
      oldBalance: player.balance,
      newBalance,
      adjustment: args.adjustmentAmount,
      message: "Balance fixed successfully",
    };
  },
});

/**
 * ADMIN FUNCTION: Check player's financial state
 * Use this to verify balances and investigate issues
 */
export const checkPlayerFinances = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Get all loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Get all transactions
    const sentTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) =>
        q.eq("fromAccountId", args.playerId)
      )
      .collect();

    const receivedTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) => q.eq("toAccountId", args.playerId))
      .collect();

    const totalReceived = receivedTransactions.reduce(
      (sum, tx) => sum + tx.amount,
      0
    );
    const totalSent = sentTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      playerId: args.playerId,
      currentBalance: player.balance,
      loans: loans.map((loan) => ({
        amount: loan.amount,
        remaining: loan.remainingBalance,
        status: loan.status,
        created: new Date(loan.createdAt).toISOString(),
      })),
      transactionSummary: {
        totalReceived,
        totalSent,
        net: totalReceived - totalSent,
      },
      calculatedBalance: {
        startingBalance: 1000000, // Default starting balance
        plusReceived: totalReceived,
        minusSent: totalSent,
        expected: 1000000 + totalReceived - totalSent,
        actual: player.balance,
        difference: player.balance - (1000000 + totalReceived - totalSent),
      },
    };
  },
});

/**
 * Query: Get all cryptocurrencies for moderation
 */
export const getAllCryptosForModeration = query({
  handler: async (ctx) => {
    // Check mod access
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

    const role = player.role || "normal";
    if (role !== "mod" && role !== "admin") {
      throw new Error("Not authorized");
    }

    // Get all cryptos
    const cryptos = await ctx.db.query("cryptocurrencies").collect();

    return cryptos;
  },
});

/**
 * Mutation: Delete cryptocurrency (mod/admin)
 */
export const deleteCryptoAsMod = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    // Check mod access
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

    const role = player.role || "normal";
    if (role !== "mod" && role !== "admin") {
      throw new Error("Not authorized");
    }

    // Delete the crypto
    await ctx.db.delete(args.cryptoId);

    console.log(
      `[MODERATION] Crypto ${args.cryptoId} deleted by ${
        user.name || user.email
      } (${role}). Reason: ${args.reason}`
    );
  },
});

/**
 * ADMIN FUNCTION: Detect duplicate loan credits
 * Identifies cases where a player has multiple loan records created at the same timestamp
 * or has multiple loan transactions with identical amounts within a short time window
 */
export const detectDuplicateLoanCredits = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Get all loans for this player
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Get all transactions for this player related to loans
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) =>
        q.eq("fromAccountId", args.playerId)
      )
      .collect();

    const loanTransactions = transactions.filter(
      (tx) =>
        tx.assetType === "cash" &&
        tx.description.includes("Loan received") &&
        tx.fromAccountId === args.playerId &&
        tx.toAccountId === args.playerId
    );

    // Detection 1: Multiple loans with same amount and timestamp
    const loansByAmountAndTime = new Map<string, typeof loans>();
    for (const loan of loans) {
      const key = `${loan.amount}@${loan.createdAt}`;
      if (!loansByAmountAndTime.has(key)) {
        loansByAmountAndTime.set(key, []);
      }
      loansByAmountAndTime.get(key)!.push(loan);
    }

    const duplicateLoansByTimestamp = Array.from(loansByAmountAndTime.entries())
      .filter(([_, loansInGroup]) => loansInGroup.length > 1)
      .map(([key, loansInGroup]) => ({
        key,
        count: loansInGroup.length,
        loans: loansInGroup,
      }));

    // Detection 2: Multiple loan transactions with same amount and timestamp
    const txByAmountAndTime = new Map<string, typeof loanTransactions>();
    for (const tx of loanTransactions) {
      const key = `${tx.amount}@${tx.createdAt}`;
      if (!txByAmountAndTime.has(key)) {
        txByAmountAndTime.set(key, []);
      }
      txByAmountAndTime.get(key)!.push(tx);
    }

    const duplicateTransactionsByTimestamp = Array.from(
      txByAmountAndTime.entries()
    )
      .filter(([_, txsInGroup]) => txsInGroup.length > 1)
      .map(([key, txsInGroup]) => ({
        key,
        count: txsInGroup.length,
        transactions: txsInGroup,
      }));

    // Detection 3: Check for loans without corresponding transactions
    const transactionLoanIds = new Set<string>();
    loanTransactions.forEach((tx) => {
      if (tx.linkedLoanId) {
        transactionLoanIds.add(tx.linkedLoanId);
      }
    });

    const loansWithoutTransactions = loans.filter(
      (loan) => !transactionLoanIds.has(loan._id)
    );

    return {
      playerId: args.playerId,
      totalLoans: loans.length,
      totalLoanTransactions: loanTransactions.length,
      duplicateLoansByTimestamp,
      duplicateTransactionsByTimestamp,
      loansWithoutTransactions,
      hasIssues:
        duplicateLoansByTimestamp.length > 0 ||
        duplicateTransactionsByTimestamp.length > 0 ||
        loansWithoutTransactions.length > 0,
    };
  },
});

/**
 * ADMIN FUNCTION: Repair duplicate loan credits
 * Removes duplicate transaction records that occurred within the same millisecond
 * Returns the details of what was cleaned up
 */
export const repairDuplicateLoanTransactions = mutation({
  args: {
    playerId: v.id("players"),
    loanAmount: v.number(), // The amount that was duplicated
    reason: v.string(), // Admin reason for repair
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!currentPlayer) throw new Error("Player not found");

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) {
      throw new Error("Admin access required");
    }

    // Get all loan transactions for this player with the specified amount
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) =>
        q.eq("fromAccountId", args.playerId)
      )
      .collect();

    const duplicateTransactions = transactions.filter(
      (tx) =>
        tx.assetType === "cash" &&
        tx.description.includes("Loan received") &&
        tx.amount === args.loanAmount &&
        tx.fromAccountId === args.playerId &&
        tx.toAccountId === args.playerId
    );

    // Group by timestamp
    const txByTimestamp = new Map<number, typeof duplicateTransactions>();
    for (const tx of duplicateTransactions) {
      if (!txByTimestamp.has(tx.createdAt)) {
        txByTimestamp.set(tx.createdAt, []);
      }
      txByTimestamp.get(tx.createdAt)!.push(tx);
    }

    // Find duplicates (same timestamp, same amount)
    const toDelete: typeof duplicateTransactions = [];
    const report = {
      totalDuplicates: 0,
      deletedTransactionIds: [] as string[],
      groupsProcessed: 0,
    };

    for (const [timestamp, txsAtTime] of Array.from(txByTimestamp.entries())) {
      if (txsAtTime.length > 1) {
        report.groupsProcessed++;
        // Keep the first, delete the rest
        const toDeleteGroup = txsAtTime.slice(1);
        report.totalDuplicates += toDeleteGroup.length;

        for (const tx of toDeleteGroup) {
          await ctx.db.delete(tx._id);
          report.deletedTransactionIds.push(tx._id);
        }
      }
    }

    // Create audit log
    await ctx.db.insert("transactions", {
      fromAccountId: currentPlayer._id,
      fromAccountType: "player" as const,
      toAccountId: args.playerId,
      toAccountType: "player" as const,
      amount: 0,
      assetType: "cash" as const,
      description: `[ADMIN AUDIT] Cleaned up ${report.totalDuplicates} duplicate loan transactions. Reason: ${args.reason}`,
      createdAt: Date.now(),
    });

    console.log(
      `[ADMIN REPAIR] Removed ${report.totalDuplicates} duplicate loan transactions for player ` +
        `${args.playerId} (amount: $${(args.loanAmount / 100).toFixed(2)}). ` +
        `Reason: ${args.reason}`
    );

    return report;
  },
});

/**
 * INTERNAL: Cron job to check for negative balances and report issues
 * Runs hourly to detect financial anomalies
 */
export const checkAndReportNegativeBalances = internalMutation({
  handler: async (ctx) => {
    const players = await ctx.db.query("players").collect();

    const negativeBalancePlayers = [];
    const playersWithIssues = [];

    for (const player of players) {
      // Check for negative balance
      if (player.balance < 0) {
        negativeBalancePlayers.push({
          playerId: player._id,
          balance: player.balance,
          netWorth: player.netWorth,
        });
      }

      // Run full audit to check for other issues
      const audit = await auditPlayerBalanceInternal(ctx, player._id);

      if (audit.hasIssues) {
        playersWithIssues.push({
          playerId: player._id,
          issues: audit.issues,
          balance: audit.currentBalance,
          expectedBalance: audit.expectedBalance,
          difference: audit.balanceDifference,
        });
      }
    }

    // Log results
    if (negativeBalancePlayers.length > 0) {
      console.warn(
        `[NEGATIVE BALANCE ALERT] Found ${negativeBalancePlayers.length} players with negative balances:`
      );
      negativeBalancePlayers.forEach((p) => {
        console.warn(
          `  - Player ${p.playerId}: $${(p.balance / 100).toFixed(
            2
          )} (Net Worth: $${(p.netWorth / 100).toFixed(2)})`
        );
      });
    }

    if (playersWithIssues.length > 0) {
      console.warn(
        `[FINANCIAL AUDIT] Found ${playersWithIssues.length} players with issues:`
      );
      playersWithIssues.forEach((p) => {
        console.warn(`  - Player ${p.playerId}:`);
        p.issues.forEach((issue) => {
          console.warn(
            `    [${issue.severity}] ${issue.type}: ${issue.message}`
          );
        });
      });
    }

    return {
      timestamp: Date.now(),
      negativeBalanceCount: negativeBalancePlayers.length,
      issuesCount: playersWithIssues.length,
      negativeBalancePlayers,
      playersWithIssues,
    };
  },
});

// Helper function (used by both query and mutation)
async function auditPlayerBalanceInternal(ctx: any, playerId: Id<"players">) {
  const player = await ctx.db.get(playerId);
  if (!player) {
    throw new Error("Player not found");
  }

  // Get all transactions
  const sentTransactions = await ctx.db
    .query("transactions")
    .withIndex("by_fromAccountId", (q: any) => q.eq("fromAccountId", playerId))
    .collect();

  const receivedTransactions = await ctx.db
    .query("transactions")
    .withIndex("by_toAccountId", (q: any) => q.eq("toAccountId", playerId))
    .collect();

  // Get all loans
  const loans = await ctx.db
    .query("loans")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .collect();

  // Calculate expected balance
  const totalReceived = receivedTransactions
    .filter((tx: any) => tx.assetType === "cash")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const totalSent = sentTransactions
    .filter((tx: any) => tx.assetType === "cash")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const expectedBalance = 1000000 + totalReceived - totalSent; // Default starting balance
  const actualBalance = player.balance;
  const balanceDifference = actualBalance - expectedBalance;

  // Identify issues
  const issues = [];

  if (Math.abs(balanceDifference) > 100) {
    // More than $1 difference
    issues.push({
      type: "BALANCE_MISMATCH",
      severity: "HIGH",
      message: `Balance mismatch of $${(balanceDifference / 100).toFixed(
        2
      )}. Expected: $${(expectedBalance / 100).toFixed(2)}, Actual: $${(
        actualBalance / 100
      ).toFixed(2)}`,
    });
  }

  if (actualBalance < 0) {
    issues.push({
      type: "NEGATIVE_BALANCE",
      severity: "MEDIUM",
      message: `Player has negative balance of $${(actualBalance / 100).toFixed(
        2
      )}`,
    });
  }

  // Check for duplicate loan transactions
  const loanTransactions = receivedTransactions.filter((tx: any) =>
    tx.description.includes("Loan received")
  );
  const txByTimestamp = new Map<number, typeof loanTransactions>();
  for (const tx of loanTransactions) {
    if (!txByTimestamp.has(tx.createdAt)) {
      txByTimestamp.set(tx.createdAt, []);
    }
    txByTimestamp.get(tx.createdAt)!.push(tx);
  }

  for (const [_, txsAtTime] of Array.from(txByTimestamp.entries())) {
    if (txsAtTime.length > 1) {
      issues.push({
        type: "DUPLICATE_LOAN_TRANSACTIONS",
        severity: "HIGH",
        message: `Found ${txsAtTime.length} loan transactions at the same timestamp`,
      });
    }
  }

  return {
    playerId,
    currentBalance: actualBalance,
    expectedBalance,
    balanceDifference,
    transactionSummary: {
      totalReceived,
      totalSent,
      netFlowPositive: totalReceived - totalSent,
    },
    loans: {
      total: loans.length,
      active: loans.filter((l: any) => l.status === "active").length,
      totalDebt: loans
        .filter((l: any) => l.status === "active")
        .reduce((sum: number, l: any) => sum + l.remainingBalance, 0),
    },
    issues,
    hasIssues: issues.length > 0,
  };
}

/**
 * ADMIN FUNCTION: Audit player's balance and transactions
 * Provides comprehensive report of financial state with potential issues flagged
 */
export const auditPlayerBalance = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await auditPlayerBalanceInternal(ctx, args.playerId);
  },
});
