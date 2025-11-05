import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Dangerous: wipes all user/game data. Guarded by a secret string.
export const resetAllData = mutation({
  args: {
    confirm: v.string(),
  },
  handler: async (ctx, args) => {
    const secret = process.env.RESET_SECRET || "RESET-ALL";
    if (args.confirm !== secret) {
      throw new Error("Invalid confirmation token. Aborting reset.");
    }

    // List of tables to clear. Keep in sync with convex/schema.ts
    const tables = [
      "tickHistory",
      "marketplaceSales",
      "marketplaceListings",
      "companySales",
      "companyShares",
      "transactions",
      "carts",
      "cartItems",
      "players",
      "users",
      "companies",
      "products",
      "loans",
      "upgrades",
      "gamblingHistory",
      "playerInventory",
      "subscriptions",
      "webhookEvents",
      "gameConfig",
    ];

    for (const table of tables) {
      try {
        const rows = await (ctx.db.query as any)(table).collect();
        for (const row of rows) {
          try {
            await (ctx.db.delete as any)(row._id);
          } catch (err) {
            // ignore individual delete failures
            console.warn(`Failed to delete row ${row._id} from ${table}:`, err);
          }
        }
      } catch (err) {
        // table might not exist or other errors - ignore
        console.warn(`Skipping table ${table}:`, err);
      }
    }

    return { success: true };
  },
});

// Expose a simple query to check the reset secret requirement (not used by script)
export const getResetSecretRequired = query({
  handler: async () => {
    return !!process.env.RESET_SECRET;
  },
});

/**
 * Initialize the stock market with default stocks
 * Can only be run once by admins
 */
export const initStockMarket = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get user and player
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    
    if (!player) {
      throw new Error("Player not found");
    }
    
    // Check if admin
    if (player.role !== "admin") {
      throw new Error("Only admins can initialize the stock market");
    }
    
    // Check if stocks already exist
    const existingStocks = await ctx.db.query("stocks").collect();
    const newStocks = existingStocks.filter((s: any) => s.symbol && s.currentPrice);
    
    if (newStocks.length > 0) {
      throw new Error("Stock market already initialized with new stocks");
    }
    
    // Initialize new stocks
    const INITIAL_STOCKS = [
      {
        name: "TechCorp Industries",
        symbol: "TCH",
        sector: "tech",
        initialPrice: 15000, // $150.00
        outstandingShares: 1000000,
        liquidity: 50000,
      },
      {
        name: "Energy Solutions Inc",
        symbol: "ENRG",
        sector: "energy",
        initialPrice: 8500, // $85.00
        outstandingShares: 1500000,
        liquidity: 40000,
      },
      {
        name: "Global Finance Corp",
        symbol: "GFC",
        sector: "finance",
        initialPrice: 12000, // $120.00
        outstandingShares: 2000000,
        liquidity: 60000,
      },
      {
        name: "MediHealth Systems",
        symbol: "MHS",
        sector: "healthcare",
        initialPrice: 9500, // $95.00
        outstandingShares: 800000,
        liquidity: 35000,
      },
      {
        name: "Consumer Goods Co",
        symbol: "CGC",
        sector: "consumer",
        initialPrice: 6000, // $60.00
        outstandingShares: 2500000,
        liquidity: 70000,
      },
    ];
    
    const SECTOR_BASE_VOLATILITY: Record<string, number> = {
      tech: 0.035,
      energy: 0.045,
      finance: 0.03,
      healthcare: 0.04,
      consumer: 0.025,
    };
    
    const now = Date.now();
    const stockIds = [];
    
    for (const config of INITIAL_STOCKS) {
      const marketCap = config.initialPrice * config.outstandingShares;
      const baseVol = SECTOR_BASE_VOLATILITY[config.sector];
      
      const stockId = await ctx.db.insert("stocks", {
        name: config.name,
        symbol: config.symbol,
        outstandingShares: config.outstandingShares,
        currentPrice: config.initialPrice,
        marketCap,
        liquidity: config.liquidity,
        sector: config.sector,
        fairValue: config.initialPrice,
        lastPriceChange: 0,
        volatility: baseVol,
        trendMomentum: 0,
        lastVolatilityCluster: now,
        createdAt: now,
        lastUpdated: now,
      });
      
      // Create initial price history entry
      await ctx.db.insert("stockPriceHistory", {
        stockId,
        timestamp: now,
        open: config.initialPrice,
        high: config.initialPrice,
        low: config.initialPrice,
        close: config.initialPrice,
        volume: 0,
      });
      
      stockIds.push(stockId);
    }
    
    return {
      success: true,
      message: "Stock market initialized successfully",
      stocksCreated: stockIds.length,
      stocks: INITIAL_STOCKS.map(s => ({ name: s.name, symbol: s.symbol })),
    };
  },
});

/**
 * Clean up old stock system data
 * Run this after deploying the new stock market
 */
export const cleanupOldStocks = mutation({
  args: {},
  handler: async (ctx) => {
    // Get authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Get user and player
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }
    
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();
    
    if (!player) {
      throw new Error("Player not found");
    }
    
    // Check if admin
    if (player.role !== "admin") {
      throw new Error("Only admins can run cleanup");
    }
    
    let deletedStocks = 0;
    let deletedHistory = 0;
    let deletedShares = 0;
    
    // Delete all old stocks (those with companyId or without currentPrice)
    const allStocks = await ctx.db.query("stocks").collect();
    for (const stock of allStocks) {
      const stockData = stock as any;
      if (stockData.companyId !== undefined || stockData.currentPrice === undefined) {
        await ctx.db.delete(stock._id);
        deletedStocks++;
      }
    }
    
    // Delete all old stock price history (has "price" instead of OHLC)
    const allHistory = await ctx.db.query("stockPriceHistory").collect();
    for (const history of allHistory) {
      const historyData = history as any;
      if (historyData.price !== undefined || historyData.close === undefined) {
        await ctx.db.delete(history._id);
        deletedHistory++;
      }
    }
    
    // Delete all company shares (old system)
    const oldShares = await ctx.db.query("companyShares").collect();
    for (const share of oldShares) {
      await ctx.db.delete(share._id);
      deletedShares++;
    }
    
    return {
      success: true,
      deletedStocks,
      deletedHistory,
      deletedShares,
      message: `Cleaned up ${deletedStocks} old stocks, ${deletedHistory} old history entries, and ${deletedShares} old share records`,
    };
  },
});
