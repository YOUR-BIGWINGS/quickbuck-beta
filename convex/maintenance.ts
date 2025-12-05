import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hasPermission } from "./moderation";
import type { Id } from "./_generated/dataModel";

// Query: Get current maintenance mode status
export const getMaintenanceStatus = query({
  handler: async (ctx) => {
    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .unique();

    return {
      isEnabled: config?.value?.enabled || false,
      message: config?.value?.message || "The server is under maintenance. Please try again later.",
      startedAt: config?.value?.startedAt || null,
      reason: config?.value?.reason || "",
    };
  },
});

// Mutation: Enable maintenance mode (admin only)
export const enableMaintenanceMode = mutation({
  args: {
    message: v.optional(v.string()),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) {
      throw new Error("Player not found");
    }

    // Check admin permission
    const isAdmin = await hasPermission(ctx, player._id, "admin");
    if (!isAdmin) {
      throw new Error("Only admins can enable maintenance mode");
    }

    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .unique();

    const maintenanceConfig = {
      enabled: true,
      message: args.message || "The server is under maintenance. Please try again later.",
      reason: args.reason || "",
      startedAt: Date.now(),
      enabledBy: player._id,
    };

    if (config) {
      await ctx.db.patch(config._id, {
        value: maintenanceConfig,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameConfig", {
        key: "maintenance_mode",
        value: maintenanceConfig,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Maintenance mode enabled",
      maintenanceConfig,
    };
  },
});

// Mutation: Disable maintenance mode (admin only)
export const disableMaintenanceMode = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) {
      throw new Error("Player not found");
    }

    // Check admin permission
    const isAdmin = await hasPermission(ctx, player._id, "admin");
    if (!isAdmin) {
      throw new Error("Only admins can disable maintenance mode");
    }

    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .unique();

    if (config) {
      await ctx.db.patch(config._id, {
        value: {
          enabled: false,
          disabledAt: Date.now(),
          disabledBy: player._id,
        },
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Maintenance mode disabled",
    };
  },
});

// Helper function to check if current user is admin
async function getCurrentAdminPlayer(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  const player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .unique();

  if (!player) {
    throw new Error("Player not found");
  }

  const isAdmin = await hasPermission(ctx, player._id, "admin");
  if (!isAdmin) {
    throw new Error("Admin access required");
  }

  return player;
}

// Helper to check maintenance mode is enabled
async function requireMaintenanceMode(ctx: any) {
  const config = await ctx.db
    .query("gameConfig")
    .withIndex("by_key", (q: any) => q.eq("key", "maintenance_mode"))
    .unique();

  if (!config?.value?.enabled) {
    throw new Error("Wipe operations require maintenance mode to be enabled");
  }
}

// Mutation: Wipe all game data (admin only, maintenance mode required)
export const wipeAllData = mutation({
  handler: async (ctx) => {
    const adminPlayer = await getCurrentAdminPlayer(ctx);
    await requireMaintenanceMode(ctx);

    let deletedCounts: Record<string, number> = {};

    // Delete all transactions
    const transactions = await ctx.db.query("transactions").collect();
    for (const t of transactions) {
      await ctx.db.delete(t._id);
    }
    deletedCounts.transactions = transactions.length;

    // Delete all loans
    const loans = await ctx.db.query("loans").collect();
    for (const l of loans) {
      await ctx.db.delete(l._id);
    }
    deletedCounts.loans = loans.length;

    // Delete all cart items
    const cartItems = await ctx.db.query("cartItems").collect();
    for (const ci of cartItems) {
      await ctx.db.delete(ci._id);
    }
    deletedCounts.cartItems = cartItems.length;

    // Delete all carts
    const carts = await ctx.db.query("carts").collect();
    for (const c of carts) {
      await ctx.db.delete(c._id);
    }
    deletedCounts.carts = carts.length;

    // Delete all marketplace sales
    const marketplaceSales = await ctx.db.query("marketplaceSales").collect();
    for (const ms of marketplaceSales) {
      await ctx.db.delete(ms._id);
    }
    deletedCounts.marketplaceSales = marketplaceSales.length;

    // Delete all marketplace listings
    const marketplaceListings = await ctx.db.query("marketplaceListings").collect();
    for (const ml of marketplaceListings) {
      await ctx.db.delete(ml._id);
    }
    deletedCounts.marketplaceListings = marketplaceListings.length;

    // Delete all products
    const products = await ctx.db.query("products").collect();
    for (const p of products) {
      await ctx.db.delete(p._id);
    }
    deletedCounts.products = products.length;

    // Delete all company shares
    const companyShares = await ctx.db.query("companyShares").collect();
    for (const cs of companyShares) {
      await ctx.db.delete(cs._id);
    }
    deletedCounts.companyShares = companyShares.length;

    // Delete all company sales
    const companySales = await ctx.db.query("companySales").collect();
    for (const cs of companySales) {
      await ctx.db.delete(cs._id);
    }
    deletedCounts.companySales = companySales.length;

    // Delete all companies
    const companies = await ctx.db.query("companies").collect();
    for (const c of companies) {
      await ctx.db.delete(c._id);
    }
    deletedCounts.companies = companies.length;

    // Delete all stock portfolios and transactions
    const playerStockPortfolios = await ctx.db.query("playerStockPortfolios").collect();
    for (const psp of playerStockPortfolios) {
      await ctx.db.delete(psp._id);
    }
    deletedCounts.playerStockPortfolios = playerStockPortfolios.length;

    const stockTransactions = await ctx.db.query("stockTransactions").collect();
    for (const st of stockTransactions) {
      await ctx.db.delete(st._id);
    }
    deletedCounts.stockTransactions = stockTransactions.length;

    const companyStockPortfolios = await ctx.db.query("companyStockPortfolios").collect();
    for (const csp of companyStockPortfolios) {
      await ctx.db.delete(csp._id);
    }
    deletedCounts.companyStockPortfolios = companyStockPortfolios.length;

    const companyStockTransactions = await ctx.db.query("companyStockTransactions").collect();
    for (const cst of companyStockTransactions) {
      await ctx.db.delete(cst._id);
    }
    deletedCounts.companyStockTransactions = companyStockTransactions.length;

    // Delete all crypto wallets and transactions
    const playerCryptoWallets = await ctx.db.query("playerCryptoWallets").collect();
    for (const pcw of playerCryptoWallets) {
      await ctx.db.delete(pcw._id);
    }
    deletedCounts.playerCryptoWallets = playerCryptoWallets.length;

    const cryptoTransactions = await ctx.db.query("cryptoTransactions").collect();
    for (const ct of cryptoTransactions) {
      await ctx.db.delete(ct._id);
    }
    deletedCounts.cryptoTransactions = cryptoTransactions.length;

    // Delete all player inventory
    const playerInventory = await ctx.db.query("playerInventory").collect();
    for (const pi of playerInventory) {
      await ctx.db.delete(pi._id);
    }
    deletedCounts.playerInventory = playerInventory.length;

    // Delete all gambling history
    const gamblingHistory = await ctx.db.query("gamblingHistory").collect();
    for (const gh of gamblingHistory) {
      await ctx.db.delete(gh._id);
    }
    deletedCounts.gamblingHistory = gamblingHistory.length;

    // Delete all blackjack games
    const blackjackGames = await ctx.db.query("blackjackGames").collect();
    for (const bg of blackjackGames) {
      await ctx.db.delete(bg._id);
    }
    deletedCounts.blackjackGames = blackjackGames.length;

    // Delete all upgrades
    const upgrades = await ctx.db.query("upgrades").collect();
    for (const u of upgrades) {
      await ctx.db.delete(u._id);
    }
    deletedCounts.upgrades = upgrades.length;

    // Delete all messages
    const messages = await ctx.db.query("messages").collect();
    for (const m of messages) {
      await ctx.db.delete(m._id);
    }
    deletedCounts.messages = messages.length;

    // Delete all moderator messages
    const moderatorMessages = await ctx.db.query("moderatorMessages").collect();
    for (const mm of moderatorMessages) {
      await ctx.db.delete(mm._id);
    }
    deletedCounts.moderatorMessages = moderatorMessages.length;

    // Delete all global alerts
    const globalAlerts = await ctx.db.query("globalAlerts").collect();
    for (const ga of globalAlerts) {
      await ctx.db.delete(ga._id);
    }
    deletedCounts.globalAlerts = globalAlerts.length;

    // Delete all tick history
    const tickHistory = await ctx.db.query("tickHistory").collect();
    for (const th of tickHistory) {
      await ctx.db.delete(th._id);
    }
    deletedCounts.tickHistory = tickHistory.length;

    // Reset all players (except admin) to starting balance
    const players = await ctx.db.query("players").collect();
    for (const p of players) {
      if (p._id !== adminPlayer._id) {
        await ctx.db.patch(p._id, {
          balance: 100000, // $1000.00 starting balance
          netWorth: 100000,
          warnings: [],
          warningCount: 0,
          role: "normal",
          limitReason: undefined,
          banReason: undefined,
          updatedAt: Date.now(),
        });
      }
    }
    deletedCounts.playersReset = players.length - 1;

    return {
      success: true,
      message: "All game data has been wiped",
      deletedCounts,
    };
  },
});

// Mutation: Wipe specific player data (admin only, maintenance mode required)
export const wipePlayerData = mutation({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await getCurrentAdminPlayer(ctx);
    await requireMaintenanceMode(ctx);

    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    let deletedCounts: Record<string, number> = {};

    // Delete player's transactions
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q: any) => q.eq("fromAccountId", args.playerId))
      .collect();
    for (const t of transactions) {
      await ctx.db.delete(t._id);
    }
    const toTransactions = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q: any) => q.eq("toAccountId", args.playerId))
      .collect();
    for (const t of toTransactions) {
      await ctx.db.delete(t._id);
    }
    deletedCounts.transactions = transactions.length + toTransactions.length;

    // Delete player's loans
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const l of loans) {
      await ctx.db.delete(l._id);
    }
    deletedCounts.loans = loans.length;

    // Delete player's cart items and carts
    const carts = await ctx.db
      .query("carts")
      .withIndex("by_userId", (q: any) => q.eq("userId", args.playerId))
      .collect();
    for (const c of carts) {
      const cartItems = await ctx.db
        .query("cartItems")
        .withIndex("by_cartId", (q: any) => q.eq("cartId", c._id))
        .collect();
      for (const ci of cartItems) {
        await ctx.db.delete(ci._id);
      }
      await ctx.db.delete(c._id);
    }
    deletedCounts.carts = carts.length;

    // Get player's companies
    const companies = await ctx.db
      .query("companies")
      .withIndex("by_ownerId", (q: any) => q.eq("ownerId", args.playerId))
      .collect();

    // Delete products from player's companies
    for (const company of companies) {
      const products = await ctx.db
        .query("products")
        .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
        .collect();
      for (const p of products) {
        await ctx.db.delete(p._id);
      }
      deletedCounts.products = (deletedCounts.products || 0) + products.length;

      // Delete marketplace listings for company
      const listings = await ctx.db
        .query("marketplaceListings")
        .withIndex("by_sellerCompanyId", (q: any) => q.eq("sellerCompanyId", company._id))
        .collect();
      for (const l of listings) {
        await ctx.db.delete(l._id);
      }

      // Delete company sales
      const sales = await ctx.db
        .query("companySales")
        .withIndex("by_sellerId", (q: any) => q.eq("sellerId", args.playerId))
        .collect();
      for (const s of sales) {
        await ctx.db.delete(s._id);
      }

      // Delete company shares
      const shares = await ctx.db
        .query("companyShares")
        .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
        .collect();
      for (const s of shares) {
        await ctx.db.delete(s._id);
      }

      await ctx.db.delete(company._id);
    }
    deletedCounts.companies = companies.length;

    // Delete player's stock holdings
    const stockPortfolios = await ctx.db
      .query("playerStockPortfolios")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const sp of stockPortfolios) {
      await ctx.db.delete(sp._id);
    }
    deletedCounts.stockPortfolios = stockPortfolios.length;

    // Delete player's stock transactions
    const stockTxns = await ctx.db
      .query("stockTransactions")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const st of stockTxns) {
      await ctx.db.delete(st._id);
    }
    deletedCounts.stockTransactions = stockTxns.length;

    // Delete player's crypto wallets
    const cryptoWallets = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const cw of cryptoWallets) {
      await ctx.db.delete(cw._id);
    }
    deletedCounts.cryptoWallets = cryptoWallets.length;

    // Delete player's crypto transactions
    const cryptoTxns = await ctx.db
      .query("cryptoTransactions")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const ct of cryptoTxns) {
      await ctx.db.delete(ct._id);
    }
    deletedCounts.cryptoTransactions = cryptoTxns.length;

    // Delete player's inventory
    const inventory = await ctx.db
      .query("playerInventory")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const i of inventory) {
      await ctx.db.delete(i._id);
    }
    deletedCounts.inventory = inventory.length;

    // Delete player's gambling history
    const gambling = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const g of gambling) {
      await ctx.db.delete(g._id);
    }
    deletedCounts.gamblingHistory = gambling.length;

    // Delete player's blackjack games
    const blackjack = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const b of blackjack) {
      await ctx.db.delete(b._id);
    }
    deletedCounts.blackjackGames = blackjack.length;

    // Delete player's upgrades
    const playerUpgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .collect();
    for (const u of playerUpgrades) {
      await ctx.db.delete(u._id);
    }
    deletedCounts.upgrades = playerUpgrades.length;

    // Reset player to starting state
    await ctx.db.patch(args.playerId, {
      balance: 100000, // $1000.00 starting balance
      netWorth: 100000,
      warnings: [],
      warningCount: 0,
      role: "normal",
      limitReason: undefined,
      banReason: undefined,
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: "Player data has been wiped and reset",
      deletedCounts,
    };
  },
});

// Mutation: Game reset - delete players without badges, reset players with badges (admin only, maintenance mode required)
export const gameReset = mutation({
  handler: async (ctx) => {
    const adminPlayer = await getCurrentAdminPlayer(ctx);
    await requireMaintenanceMode(ctx);

    let stats = {
      playersDeleted: 0,
      playersReset: 0,
      usersDeleted: 0,
      dataWiped: {} as Record<string, number>,
    };

    // Get all players
    const allPlayers = await ctx.db.query("players").collect();

    // Get all player badges to find which players have badges
    const playerBadges = await ctx.db.query("playerBadges").collect();
    const playersWithBadges = new Set(playerBadges.map((pb) => pb.playerId));

    // Also preserve admin player
    playersWithBadges.add(adminPlayer._id);

    const playersToDelete: Id<"players">[] = [];
    const playersToReset: Id<"players">[] = [];

    for (const player of allPlayers) {
      if (playersWithBadges.has(player._id)) {
        playersToReset.push(player._id);
      } else {
        playersToDelete.push(player._id);
      }
    }

    // Helper to delete all player-related data
    async function deletePlayerData(playerId: Id<"players">) {
      // Delete transactions
      const fromTxns = await ctx.db
        .query("transactions")
        .withIndex("by_fromAccountId", (q: any) => q.eq("fromAccountId", playerId))
        .collect();
      for (const t of fromTxns) await ctx.db.delete(t._id);

      const toTxns = await ctx.db
        .query("transactions")
        .withIndex("by_toAccountId", (q: any) => q.eq("toAccountId", playerId))
        .collect();
      for (const t of toTxns) await ctx.db.delete(t._id);

      // Delete loans
      const loans = await ctx.db
        .query("loans")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const l of loans) await ctx.db.delete(l._id);

      // Delete carts
      const carts = await ctx.db
        .query("carts")
        .withIndex("by_userId", (q: any) => q.eq("userId", playerId))
        .collect();
      for (const c of carts) {
        const items = await ctx.db
          .query("cartItems")
          .withIndex("by_cartId", (q: any) => q.eq("cartId", c._id))
          .collect();
        for (const ci of items) await ctx.db.delete(ci._id);
        await ctx.db.delete(c._id);
      }

      // Delete companies and related data
      const companies = await ctx.db
        .query("companies")
        .withIndex("by_ownerId", (q: any) => q.eq("ownerId", playerId))
        .collect();
      for (const company of companies) {
        // Products
        const products = await ctx.db
          .query("products")
          .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
          .collect();
        for (const p of products) await ctx.db.delete(p._id);

        // Listings
        const listings = await ctx.db
          .query("marketplaceListings")
          .withIndex("by_sellerCompanyId", (q: any) => q.eq("sellerCompanyId", company._id))
          .collect();
        for (const l of listings) await ctx.db.delete(l._id);

        // Company shares
        const shares = await ctx.db
          .query("companyShares")
          .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
          .collect();
        for (const s of shares) await ctx.db.delete(s._id);

        // Company stock portfolios
        const compStockPort = await ctx.db
          .query("companyStockPortfolios")
          .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
          .collect();
        for (const csp of compStockPort) await ctx.db.delete(csp._id);

        // Company stock transactions
        const compStockTxns = await ctx.db
          .query("companyStockTransactions")
          .withIndex("by_companyId", (q: any) => q.eq("companyId", company._id))
          .collect();
        for (const cst of compStockTxns) await ctx.db.delete(cst._id);

        await ctx.db.delete(company._id);
      }

      // Company sales
      const compSales = await ctx.db
        .query("companySales")
        .withIndex("by_sellerId", (q: any) => q.eq("sellerId", playerId))
        .collect();
      for (const cs of compSales) await ctx.db.delete(cs._id);

      // Stock portfolios
      const stockPort = await ctx.db
        .query("playerStockPortfolios")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const sp of stockPort) await ctx.db.delete(sp._id);

      // Stock transactions
      const stockTxns = await ctx.db
        .query("stockTransactions")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const st of stockTxns) await ctx.db.delete(st._id);

      // Crypto wallets
      const cryptoWallets = await ctx.db
        .query("playerCryptoWallets")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const cw of cryptoWallets) await ctx.db.delete(cw._id);

      // Crypto transactions
      const cryptoTxns = await ctx.db
        .query("cryptoTransactions")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const ct of cryptoTxns) await ctx.db.delete(ct._id);

      // Inventory
      const inv = await ctx.db
        .query("playerInventory")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const i of inv) await ctx.db.delete(i._id);

      // Gambling history
      const gambling = await ctx.db
        .query("gamblingHistory")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const g of gambling) await ctx.db.delete(g._id);

      // Blackjack games
      const bj = await ctx.db
        .query("blackjackGames")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const b of bj) await ctx.db.delete(b._id);

      // Upgrades
      const upgrades = await ctx.db
        .query("upgrades")
        .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
        .collect();
      for (const u of upgrades) await ctx.db.delete(u._id);

      // Messages (sent and received)
      const sentMsgs = await ctx.db
        .query("messages")
        .withIndex("by_senderId", (q: any) => q.eq("senderId", playerId))
        .collect();
      for (const m of sentMsgs) await ctx.db.delete(m._id);

      const recvMsgs = await ctx.db
        .query("messages")
        .withIndex("by_recipientId", (q: any) => q.eq("recipientId", playerId))
        .collect();
      for (const m of recvMsgs) await ctx.db.delete(m._id);

      // Moderator messages
      const modMsgs = await ctx.db
        .query("moderatorMessages")
        .withIndex("by_recipientPlayerId", (q: any) => q.eq("recipientPlayerId", playerId))
        .collect();
      for (const m of modMsgs) await ctx.db.delete(m._id);
    }

    // Delete players without badges (keep user records for Clerk re-login)
    for (const playerId of playersToDelete) {
      const player = await ctx.db.get(playerId);
      if (!player) continue;

      await deletePlayerData(playerId);

      // Delete only the player record, NOT the user record
      // This allows users to sign back in with Clerk and create a new player
      await ctx.db.delete(playerId);

      stats.playersDeleted++;
    }

    // Reset players with badges (keep their user/clerk accounts)
    for (const playerId of playersToReset) {
      if (playerId === adminPlayer._id) continue; // Skip admin

      await deletePlayerData(playerId);

      // Reset player stats but keep account
      await ctx.db.patch(playerId, {
        balance: 100000, // $1000.00 starting balance
        netWorth: 100000,
        warnings: [],
        warningCount: 0,
        role: "normal",
        limitReason: undefined,
        banReason: undefined,
        updatedAt: Date.now(),
      });

      stats.playersReset++;
    }

    // Clean up shared data
    // Delete all tick history
    const tickHistory = await ctx.db.query("tickHistory").collect();
    for (const th of tickHistory) await ctx.db.delete(th._id);
    stats.dataWiped.tickHistory = tickHistory.length;

    // Delete all global alerts
    const alerts = await ctx.db.query("globalAlerts").collect();
    for (const a of alerts) await ctx.db.delete(a._id);
    stats.dataWiped.globalAlerts = alerts.length;

    return {
      success: true,
      message: `Game reset complete: ${stats.playersDeleted} players deleted, ${stats.playersReset} players reset`,
      stats,
    };
  },
});

// Query: Get all players for wipe selection (admin only)
export const getPlayersForWipe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) return [];

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!currentPlayer) return [];

    const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
    if (!isAdmin) return [];

    // Get all players with their user info
    const players = await ctx.db.query("players").collect();
    const enrichedPlayers = await Promise.all(
      players.map(async (player) => {
        const playerUser = await ctx.db.get(player.userId);
        const badges = await ctx.db
          .query("playerBadges")
          .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
          .collect();

        return {
          _id: player._id,
          name: playerUser?.name || playerUser?.clerkUsername || "Unknown",
          email: playerUser?.email || "",
          balance: player.balance,
          netWorth: player.netWorth,
          role: player.role || "normal",
          hasBadges: badges.length > 0,
        };
      })
    );

    return enrichedPlayers;
  },
});
