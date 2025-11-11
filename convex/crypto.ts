import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// HELPER FUNCTIONS FOR REALISTIC PRICE CALCULATIONS
// ============================================================================

/**
 * Box-Muller transform to generate Gaussian random numbers (mean=0, std=1)
 */
function randomNormal(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Generate random number between min and max (uniform distribution)
 */
function randomUniform(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Calculate momentum from recent price history
 * Returns a drift factor based on recent price movements
 */
async function getMomentum(
  ctx: any, 
  cryptoId: Id<"cryptocurrencies">,
  priceHistoryMap?: Map<string, any[]>
): Promise<number> {
  // Use pre-fetched history if available, otherwise query
  let recentHistory: any[];
  
  if (priceHistoryMap && priceHistoryMap.has(cryptoId)) {
    recentHistory = priceHistoryMap.get(cryptoId) || [];
  } else {
    recentHistory = await ctx.db
      .query("cryptoPriceHistory")
      .withIndex("by_crypto_time", (q: any) => q.eq("cryptoId", cryptoId))
      .order("desc")
      .take(5);
  }

  if (recentHistory.length < 2) return 0;

  // Calculate average percentage change
  const changes = recentHistory.slice(1).map((h: any, i: number) => {
    const prev = recentHistory[i];
    return (h.close - prev.close) / prev.close;
  });

  const avgChange = changes.reduce((sum: number, c: number) => sum + c, 0) / changes.length;
  
  // Dampened autocorrelation - momentum influences future price but not overwhelmingly
  return avgChange * 0.5;
}

/**
 * Get current volatility with clustering effect
 * Higher volatility after large price movements
 */
async function getVolatility(ctx: any, crypto: any): Promise<number> {
  const baseVolatility = crypto.baseVolatility || 0.1;
  
  // Volatility clustering: higher volatility if recent large change
  const lastChange = Math.abs(crypto.lastPriceChange || 0);
  
  if (lastChange > 0.05) {
    // If last change was > 5%, increase volatility by 50%
    return baseVolatility * 1.5;
  }
  
  return baseVolatility;
}

/**
 * Simulate random market events (pumps, dumps, news)
 * Low probability but high impact
 */
function checkRandomEvent(): number {
  // 5% chance of random event per tick
  if (Math.random() < 0.05) {
    // Event can be pump (+10% to +30%) or dump (-30% to -10%)
    return randomUniform(0.7, 1.3);
  }
  return 1.0;
}

/**
 * Calculate price impact from a trade
 * Larger trades relative to liquidity have bigger impact
 */
function calculatePriceImpact(
  amount: number,
  liquidity: number,
  isBuy: boolean
): number {
  // Validate inputs to prevent NaN/Infinity
  if (!isFinite(amount) || !isFinite(liquidity) || liquidity <= 0) {
    // If liquidity is invalid, assume minimal impact
    return 0;
  }
  
  // Buy increases price, sell decreases it
  // Impact = (amount / liquidity) * direction
  const direction = isBuy ? 1 : -1;
  const rawImpact = (amount / liquidity) * direction;
  
  // Cap impact at ±30% per trade to prevent manipulation
  const impact = Math.max(-0.3, Math.min(0.3, rawImpact));
  
  // Final validation
  return isFinite(impact) ? impact : 0;
}

/**
 * Simulate sub-ticks within a 5-minute interval to generate OHLC
 * Returns array of prices showing realistic intra-tick volatility
 */
function simulateSubTicks(
  startPrice: number,
  drift: number,
  volatility: number,
  subTickCount: number = 5
): number[] {
  // Validate inputs to prevent NaN propagation
  if (!isFinite(startPrice) || startPrice <= 0) {
    console.error(`Invalid startPrice: ${startPrice}`);
    return [1]; // Return minimum valid price
  }
  
  if (!isFinite(drift)) drift = 0;
  if (!isFinite(volatility) || volatility < 0) volatility = 0.1;
  
  const prices = [startPrice];
  
  for (let i = 0; i < subTickCount; i++) {
    const subDrift = drift / subTickCount;
    const subVol = volatility / Math.sqrt(subTickCount);
    const randomComponent = randomNormal() * subVol;
    
    // GBM-inspired formula: P_new = P_old * exp(drift + volatility * random)
    const lastPrice = prices[prices.length - 1];
    const exponent = subDrift + randomComponent;
    let newPrice = lastPrice * Math.exp(exponent);
    
    // Validate newPrice
    if (!isFinite(newPrice) || newPrice <= 0) {
      console.error(`Invalid newPrice in sub-tick: ${newPrice}, using lastPrice`);
      newPrice = lastPrice;
    }
    
    // Random events can happen at sub-tick level too (lower probability)
    if (Math.random() < 0.01) {
      newPrice *= randomUniform(0.85, 1.15);
    }
    
    // Ensure minimum movement for very low prices to prevent "stuck" behavior
    // If price is very low (< $0.10) and calculation suggests movement, ensure at least 1 cent change
    if (lastPrice < 10 && Math.abs(newPrice - lastPrice) < 1) {
      const shouldMove = Math.abs(exponent) > 0.01;
      if (shouldMove) {
        // Add minimum 1 cent movement in the direction suggested by drift
        const direction = exponent > 0 ? 1 : -1;
        newPrice = Math.max(1, lastPrice + direction);
      }
    }
    
    // Final validation before adding to array
    if (!isFinite(newPrice) || newPrice <= 0) {
      newPrice = Math.max(1, lastPrice);
    }
    
    prices.push(newPrice);
  }
  
  return prices;
}

const CRYPTO_UPDATE_BATCH_SIZE = 30; // Total cryptos to update per tick
const CRYPTO_MICRO_BATCH_SIZE = 5; // Process 5 cryptos at a time to avoid read limits
const CRYPTO_VOLUME_TX_LIMIT = 50; // Transactions to check per crypto for volume
const CRYPTO_HISTORY_LIMIT = 5; // Limit for price history per crypto
const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function loadCryptosBatch(ctx: any, limit: number) {
  const seen = new Set<string>();
  const ordered: Doc<"cryptocurrencies">[] = await ctx.db
    .query("cryptocurrencies")
    .withIndex("by_lastUpdated", (q: any) => q.gt("lastUpdated", 0))
    .order("asc")
    .take(limit);

  const batch: Doc<"cryptocurrencies">[] = [];

  for (const crypto of ordered) {
    batch.push(crypto);
    seen.add(`${crypto._id}`);
  }

  if (batch.length < limit) {
    const fallback = await ctx.db.query("cryptocurrencies").take(limit - batch.length);
    for (const crypto of fallback) {
      const id = `${crypto._id}`;
      if (seen.has(id)) continue;
      batch.push(crypto);
      seen.add(id);
      if (batch.length === limit) break;
    }
  }

  return batch;
}

// ============================================================================
// ADMIN MUTATIONS - Create and manage cryptocurrencies
// ============================================================================

/**
 * Create a new cryptocurrency - costs $10,000
 */
export const createCryptocurrency = mutation({
  args: {
    name: v.string(),
    symbol: v.string(),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    imageUrl: v.optional(v.string()),
    initialSupply: v.optional(v.number()),
    initialPrice: v.optional(v.number()), // in cents
    liquidity: v.optional(v.number()),
    baseVolatility: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Get user and player
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

    // Check player role
    if (player.role === "banned") {
      throw new Error("You are banned and cannot create cryptocurrencies");
    }
    if (player.role === "limited") {
      throw new Error("Your account is limited and cannot create cryptocurrencies");
    }

    // Cost to create crypto: $10,000
    const CREATION_COST = 1000000; // $10,000 in cents
    if (player.balance < CREATION_COST) {
      throw new Error(`You need ${CREATION_COST / 100} to create a cryptocurrency`);
    }

    // HARD LIMIT: Check if player has reached max cryptocurrencies (3)
    const playerCryptos = await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_createdByPlayerId", (q) => q.eq("createdByPlayerId", player._id))
      .collect();
    
    if (playerCryptos.length >= 3) {
      throw new Error("You have reached the maximum limit of 3 cryptocurrencies. Delete an existing cryptocurrency to create a new one.");
    }

    // Validate symbol uniqueness
    const existing = await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol.toUpperCase()))
      .unique();
    
    if (existing) {
      throw new Error(`Cryptocurrency with symbol ${args.symbol} already exists`);
    }

    // Set defaults for player-created cryptos
    const initialSupply = args.initialSupply || 1000000; // Default 1M supply
    const initialPrice = args.initialPrice || 10; // Default $0.10 (1M * $0.10 = $10k market cap)
    const liquidity = args.liquidity || initialSupply * 0.1; // 10% of supply
    const baseVolatility = args.baseVolatility || 0.15; // 15% volatility for new crypto

    // Validate inputs
    if (initialSupply <= 0) throw new Error("Initial supply must be positive");
    if (initialPrice <= 0) throw new Error("Initial price must be positive");

    const now = Date.now();
    const marketCap = Math.floor(initialPrice * initialSupply);

    // Deduct creation cost
    await ctx.db.patch(player._id, {
      balance: player.balance - CREATION_COST,
      updatedAt: now,
    });

    const cryptoId = await ctx.db.insert("cryptocurrencies", {
      name: args.name,
      symbol: args.symbol.toUpperCase(),
      description: args.description,
      tags: args.tags,
      imageUrl: args.imageUrl,
      createdByPlayerId: player._id,
      totalSupply: initialSupply,
      circulatingSupply: initialSupply,
      currentPrice: initialPrice,
      marketCap,
      liquidity,
      baseVolatility,
      trendDrift: 0,
      lastVolatilityUpdate: now,
      lastPriceChange: 0,
      createdAt: now,
      lastUpdated: now,
    });

    // Create initial price history entry
    await ctx.db.insert("cryptoPriceHistory", {
      cryptoId,
      timestamp: now,
      open: initialPrice,
      high: initialPrice,
      low: initialPrice,
      close: initialPrice,
      volume: 0,
    });

    return cryptoId;
  },
});

/**
 * Update cryptocurrency parameters (admin only)
 */
export const updateCryptoParameters = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    baseVolatility: v.optional(v.number()),
    liquidity: v.optional(v.number()),
    trendDrift: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
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
    if (!player || player.role !== "admin") {
      throw new Error("Only admins can update crypto parameters");
    }

    const updates: any = { lastUpdated: Date.now() };
    if (args.baseVolatility !== undefined) updates.baseVolatility = args.baseVolatility;
    if (args.liquidity !== undefined) updates.liquidity = args.liquidity;
    if (args.trendDrift !== undefined) updates.trendDrift = args.trendDrift;

    await ctx.db.patch(args.cryptoId, updates);
  },
});

/**
 * Fix all cryptocurrencies with invalid prices (admin only)
 */
export const fixInvalidCryptoPrices = mutation({
  handler: async (ctx) => {
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
    if (!player || player.role !== "admin") {
      throw new Error("Only admins can fix crypto prices");
    }

    const cryptos = await ctx.db.query("cryptocurrencies").collect();
    const fixed: string[] = [];
    const now = Date.now();

    for (const crypto of cryptos) {
      // Check if price is invalid (NaN, Infinity, negative, or zero)
      if (!isFinite(crypto.currentPrice) || crypto.currentPrice < 1) {
        // Reset to minimum valid price
        const newPrice = 1; // 1 cent
        const newMarketCap = newPrice * crypto.circulatingSupply;
        
        await ctx.db.patch(crypto._id, {
          currentPrice: newPrice,
          marketCap: newMarketCap,
          lastPriceChange: 0,
          lastUpdated: now,
        });
        
        fixed.push(`${crypto.symbol} (was: ${crypto.currentPrice}, now: ${newPrice})`);
      }
      
      // Also validate and fix liquidity
      if (!isFinite(crypto.liquidity) || crypto.liquidity <= 0) {
        await ctx.db.patch(crypto._id, {
          liquidity: crypto.circulatingSupply * 0.1,
          lastUpdated: now,
        });
        fixed.push(`${crypto.symbol} liquidity fixed`);
      }
    }

    return {
      success: true,
      fixed,
      message: fixed.length > 0 
        ? `Fixed ${fixed.length} cryptocurrency issues: ${fixed.join(", ")}`
        : "No invalid cryptocurrencies found",
    };
  },
});

// ============================================================================
// PLAYER MUTATIONS - Buy and sell cryptocurrencies
// ============================================================================

/**
 * Buy cryptocurrency
 * Instantly updates price based on order size
 */
export const buyCrypto = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    amount: v.number(), // number of coins to buy
  },
  handler: async (ctx, args) => {
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

    // Check if player is banned or limited
    if (player.role === "banned") {
      throw new Error("Banned players cannot trade");
    }

    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) throw new Error("Cryptocurrency not found");

    if (args.amount <= 0) throw new Error("Amount must be positive");
    if (args.amount > crypto.circulatingSupply) {
      throw new Error("Cannot buy more than circulating supply");
    }

    // Check 1M coin limit
    const existingWalletCheck = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_player_crypto", (q) =>
        q.eq("playerId", player._id).eq("cryptoId", args.cryptoId)
      )
      .unique();

    const currentCoins = existingWalletCheck?.balance ?? 0;
    const newTotalCoins = currentCoins + args.amount;

    if (newTotalCoins > 1000000) {
      throw new Error(
        `Cannot own more than 1,000,000 coins per cryptocurrency. You currently own ${currentCoins.toLocaleString()} coins.`
      );
    }

    // Validate current price
    if (!isFinite(crypto.currentPrice) || crypto.currentPrice < 1) {
      throw new Error("This cryptocurrency has an invalid price. Please contact support.");
    }
    
    // Calculate price impact
    const priceImpact = calculatePriceImpact(args.amount, crypto.liquidity, true);
    const newPrice = Math.max(1, Math.floor(crypto.currentPrice * (1 + priceImpact)));
    
    // Use average price for transaction (current + new) / 2
    const avgPrice = Math.floor((crypto.currentPrice + newPrice) / 2);
    const totalCost = avgPrice * args.amount;

    // Validate calculations to prevent NaN
    if (!isFinite(avgPrice) || !isFinite(totalCost) || avgPrice < 1 || totalCost < 1) {
      throw new Error("Invalid price calculation. Please try again.");
    }

    // Check if player has enough balance
    if (player.balance < totalCost) {
      throw new Error("Insufficient balance");
    }

    // Update player balance
    await ctx.db.patch(player._id, {
      balance: player.balance - totalCost,
      updatedAt: Date.now(),
    });

    // Update or create wallet
    const existingWallet = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_player_crypto", (q) =>
        q.eq("playerId", player._id).eq("cryptoId", args.cryptoId)
      )
      .unique();

    if (existingWallet) {
      const newBalance = existingWallet.balance + args.amount;
      const newTotalInvested = existingWallet.totalInvested + totalCost;
      const newAvgPrice = Math.floor(newTotalInvested / newBalance);

      await ctx.db.patch(existingWallet._id, {
        balance: newBalance,
        totalInvested: newTotalInvested,
        averagePurchasePrice: newAvgPrice,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("playerCryptoWallets", {
        playerId: player._id,
        cryptoId: args.cryptoId,
        balance: args.amount,
        totalInvested: totalCost,
        averagePurchasePrice: avgPrice,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Update cryptocurrency price and market cap
    const newMarketCap = Math.floor(newPrice * crypto.circulatingSupply);
    await ctx.db.patch(args.cryptoId, {
      currentPrice: newPrice,
      marketCap: newMarketCap,
      lastPriceChange: priceImpact,
      lastUpdated: Date.now(),
    });

    // Record transaction
    await ctx.db.insert("cryptoTransactions", {
      playerId: player._id,
      cryptoId: args.cryptoId,
      type: "buy",
      amount: args.amount,
      pricePerCoin: avgPrice,
      totalValue: totalCost,
      priceImpact: priceImpact,
      timestamp: Date.now(),
    });

    // Update current tick's OHLC if within a tick period
    await updateCurrentTickOHLC(ctx, args.cryptoId, newPrice);

    return {
      success: true,
      newPrice,
      totalCost,
      priceImpact: priceImpact * 100, // as percentage
    };
  },
});

/**
 * Sell cryptocurrency
 */
export const sellCrypto = mutation({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    amount: v.number(), // number of coins to sell
  },
  handler: async (ctx, args) => {
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

    if (player.role === "banned") {
      throw new Error("Banned players cannot trade");
    }

    const crypto = await ctx.db.get(args.cryptoId);
    if (!crypto) throw new Error("Cryptocurrency not found");

    if (args.amount <= 0) throw new Error("Amount must be positive");

    // Check wallet
    const wallet = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_player_crypto", (q) =>
        q.eq("playerId", player._id).eq("cryptoId", args.cryptoId)
      )
      .unique();

    if (!wallet || wallet.balance < args.amount) {
      throw new Error("Insufficient cryptocurrency balance");
    }

    // Validate current price
    if (!isFinite(crypto.currentPrice) || crypto.currentPrice < 1) {
      throw new Error("This cryptocurrency has an invalid price. Please contact support.");
    }

    // Calculate price impact (negative for sell)
    const priceImpact = calculatePriceImpact(args.amount, crypto.liquidity, false);
    const newPrice = Math.max(1, Math.floor(crypto.currentPrice * (1 + priceImpact)));
    
    // Use average price for transaction
    const avgPrice = Math.floor((crypto.currentPrice + newPrice) / 2);
    const totalRevenue = avgPrice * args.amount;

    // Validate calculations to prevent NaN
    if (!isFinite(avgPrice) || !isFinite(totalRevenue) || avgPrice < 1 || totalRevenue < 1) {
      throw new Error("Invalid price calculation. Please try again.");
    }

    // Update wallet
    const newBalance = wallet.balance - args.amount;
    if (newBalance === 0) {
      // Remove wallet if empty
      await ctx.db.delete(wallet._id);
    } else {
      // Keep proportional totalInvested
      const newTotalInvested = Math.floor(
        (wallet.totalInvested * newBalance) / wallet.balance
      );
      await ctx.db.patch(wallet._id, {
        balance: newBalance,
        totalInvested: newTotalInvested,
        updatedAt: Date.now(),
      });
    }

    // Update player balance
    await ctx.db.patch(player._id, {
      balance: player.balance + totalRevenue,
      updatedAt: Date.now(),
    });

    // Update cryptocurrency price
    const newMarketCap = Math.floor(newPrice * crypto.circulatingSupply);
    await ctx.db.patch(args.cryptoId, {
      currentPrice: newPrice,
      marketCap: newMarketCap,
      lastPriceChange: priceImpact,
      lastUpdated: Date.now(),
    });

    // Record transaction
    await ctx.db.insert("cryptoTransactions", {
      playerId: player._id,
      cryptoId: args.cryptoId,
      type: "sell",
      amount: args.amount,
      pricePerCoin: avgPrice,
      totalValue: totalRevenue,
      priceImpact: priceImpact,
      timestamp: Date.now(),
    });

    // Update current tick's OHLC
    await updateCurrentTickOHLC(ctx, args.cryptoId, newPrice);

    return {
      success: true,
      newPrice,
      totalRevenue,
      priceImpact: priceImpact * 100,
    };
  },
});

/**
 * Helper to update ongoing tick OHLC when trades happen
 */
async function updateCurrentTickOHLC(
  ctx: any,
  cryptoId: Id<"cryptocurrencies">,
  newPrice: number
) {
  // Get the most recent history entry (within last 5 minutes)
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const recentHistory = await ctx.db
    .query("cryptoPriceHistory")
    .withIndex("by_crypto_time", (q: any) => q.eq("cryptoId", cryptoId))
    .order("desc")
    .first();

  if (recentHistory && recentHistory.timestamp >= fiveMinutesAgo) {
    // Update high/low if needed
    const updatedHigh = Math.max(recentHistory.high, newPrice);
    const updatedLow = Math.min(recentHistory.low, newPrice);
    const updatedVolume = recentHistory.volume + 1;

    await ctx.db.patch(recentHistory._id, {
      high: updatedHigh,
      low: updatedLow,
      close: newPrice,
      volume: updatedVolume,
    });
  }
}

// ============================================================================
// AUTOMATED TICK UPDATE - Called every 5 minutes by cron
// ============================================================================

/**
 * Update all cryptocurrency prices with realistic volatility
 * Called from tick.ts
 */
export const updateCryptoPrices = internalMutation({
  handler: async (ctx) => {
    const cryptos = await loadCryptosBatch(ctx, CRYPTO_UPDATE_BATCH_SIZE);
    const updates: Array<{
      cryptoId: Id<"cryptocurrencies">;
      oldPrice: number;
      newPrice: number;
    }> = [];

    if (cryptos.length === 0) {
      return updates;
    }

    // Process cryptos in micro-batches to avoid document read limits
    // Each micro-batch: 5 cryptos × (1 + 5 history + 50 txs) = ~280 reads
    for (let i = 0; i < cryptos.length; i += CRYPTO_MICRO_BATCH_SIZE) {
      const microBatch = cryptos.slice(i, i + CRYPTO_MICRO_BATCH_SIZE);
      
      // Pre-fetch data for this micro-batch only
      const priceHistoryMap = new Map<string, any[]>();
      const transactionsMap = new Map<string, any[]>();
      const volumeWindowStart = Date.now() - FIVE_MINUTES_MS;
      
      for (const crypto of microBatch) {
        const history = await ctx.db
          .query("cryptoPriceHistory")
          .withIndex("by_crypto_time", (q: any) => q.eq("cryptoId", crypto._id))
          .order("desc")
          .take(CRYPTO_HISTORY_LIMIT);
        priceHistoryMap.set(crypto._id, history);
        
        const txs = await ctx.db
          .query("cryptoTransactions")
          .withIndex("by_cryptoId", (q) => q.eq("cryptoId", crypto._id))
          .order("desc")
          .filter((q) => q.gte(q.field("timestamp"), volumeWindowStart))
          .take(CRYPTO_VOLUME_TX_LIMIT);
        transactionsMap.set(crypto._id, txs);
      }

      // Process this micro-batch
      for (const crypto of microBatch) {
      try {
        // Validate crypto data before processing
        if (!isFinite(crypto.currentPrice) || crypto.currentPrice < 1) {
          console.error(`Crypto ${crypto.symbol} has invalid price: ${crypto.currentPrice}, resetting to 1`);
          await ctx.db.patch(crypto._id, {
            currentPrice: 1,
            marketCap: crypto.circulatingSupply,
            lastUpdated: Date.now(),
          });
          continue;
        }
        
        const oldPrice = crypto.currentPrice;
        
        // Get momentum from recent history (using pre-fetched data)
        const momentum = await getMomentum(ctx, crypto._id, priceHistoryMap);
        
        // Get volatility with clustering
        const volatility = await getVolatility(ctx, crypto);
        
        // Check for random events
  const eventMultiplier = checkRandomEvent();
        
        // Base drift (trend + momentum)
        const baseDrift = (crypto.trendDrift || 0) + momentum;
        
        // Simulate sub-ticks for realistic OHLC
        const subTickPrices = simulateSubTicks(oldPrice, baseDrift, volatility, 5);
        
        // Apply event multiplier to final price
        let finalPrice = subTickPrices[subTickPrices.length - 1] * eventMultiplier;
        
        // Validate finalPrice to prevent NaN propagation
        if (!isFinite(finalPrice) || finalPrice < 0) {
          console.error(`Invalid finalPrice for ${crypto.symbol}: ${finalPrice}, using oldPrice`);
          finalPrice = oldPrice;
        }
        
        // Calculate OHLC from sub-ticks
        const open = oldPrice;
        const high = Math.max(...subTickPrices.filter(p => isFinite(p) && p > 0), open);
        const low = Math.min(...subTickPrices.filter(p => isFinite(p) && p > 0), open);
        const close = finalPrice;
        
        // Prevent extreme single-tick movements (clamp to ±50%)
        const clampedClose = Math.max(
          Math.floor(oldPrice * 0.5),
          Math.min(Math.floor(oldPrice * 1.5), Math.floor(close))
        );
        
        // Prevent price from going below 1 cent to prevent NaN
        let newPrice = Math.max(1, clampedClose);
        
        // For very low prices, ensure there's actual movement to prevent "stuck" behavior
        if (oldPrice < 10) {
          // If we're below $0.10 and the unrounded close suggests movement
          const suggestedChange = close - oldPrice;
          const shouldMoveUp = suggestedChange > (oldPrice * 0.02); // More than 2% up
          const shouldMoveDown = suggestedChange < -(oldPrice * 0.02); // More than 2% down
          
          if (shouldMoveUp && newPrice === oldPrice) {
            newPrice = Math.max(1, oldPrice + 1); // Move up at least 1 cent
          } else if (shouldMoveDown && newPrice === oldPrice && oldPrice > 1) {
            newPrice = Math.max(1, oldPrice - 1); // Move down at least 1 cent
          }
        }
        
        // Calculate actual change for next momentum calculation
        const priceChange = oldPrice > 0 ? (newPrice - oldPrice) / oldPrice : 0;
        
        // Validate priceChange
        const validPriceChange = isFinite(priceChange) ? priceChange : 0;
        
        // Update cryptocurrency
        const newMarketCap = Math.floor(newPrice * crypto.circulatingSupply);
        
        // Final validation before database update
        if (!isFinite(newPrice) || newPrice < 1) {
          console.error(`Invalid newPrice for ${crypto.symbol}: ${newPrice}`);
          continue; // Skip this update
        }
        if (!isFinite(newMarketCap)) {
          console.error(`Invalid marketCap for ${crypto.symbol}: ${newMarketCap}`);
          continue; // Skip this update
        }
        
        const updateTimestamp = Date.now();

        await ctx.db.patch(crypto._id, {
          currentPrice: newPrice,
          marketCap: newMarketCap,
          lastPriceChange: validPriceChange,
          lastVolatilityUpdate: updateTimestamp,
          lastUpdated: updateTimestamp,
        });
        
        // Get volume from pre-fetched transactions
        const recentTxs = transactionsMap.get(crypto._id) || [];
        const volume = recentTxs.reduce((sum, tx) => sum + tx.amount, 0);
        
        // Record price history with realistic OHLC
        await ctx.db.insert("cryptoPriceHistory", {
          cryptoId: crypto._id,
          timestamp: updateTimestamp,
          open: open,
          high: Math.floor(high),
          low: Math.floor(low),
          close: newPrice,
          volume: volume,
        });
        
        updates.push({
          cryptoId: crypto._id,
          oldPrice,
          newPrice,
        });
      } catch (error) {
        console.error(`Error updating crypto ${crypto._id}:`, error);
      }
    } // End micro-batch processing
    } // End micro-batch loop

    return updates;
  },
});

// ============================================================================
// QUERIES - For client to fetch data
// ============================================================================

/**
 * Get all cryptocurrencies
 */
export const getAllCryptos = query({
  handler: async (ctx) => {
    return await ctx.db.query("cryptocurrencies").collect();
  },
});

/**
 * Get single cryptocurrency by ID
 */
export const getCrypto = query({
  args: { cryptoId: v.id("cryptocurrencies") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.cryptoId);
  },
});

/**
 * Get cryptocurrency by symbol
 */
export const getCryptoBySymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cryptocurrencies")
      .withIndex("by_symbol", (q) => q.eq("symbol", args.symbol.toUpperCase()))
      .unique();
  },
});

/**
 * Get price history for charting
 */
export const getPriceHistory = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;
    return await ctx.db
      .query("cryptoPriceHistory")
      .withIndex("by_crypto_time", (q) => q.eq("cryptoId", args.cryptoId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get player's crypto wallet
 */
export const getMyWallet = query({
  args: { cryptoId: v.optional(v.id("cryptocurrencies")) },
  handler: async (ctx, args) => {
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
    if (!player) return null;

    if (args.cryptoId !== undefined) {
      // Get specific wallet
      return await ctx.db
        .query("playerCryptoWallets")
        .withIndex("by_player_crypto", (q) =>
          q.eq("playerId", player._id).eq("cryptoId", args.cryptoId!)
        )
        .unique();
    } else {
      // Get all wallets
      return await ctx.db
        .query("playerCryptoWallets")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .collect();
    }
  },
});

/**
 * Get all wallets for a player with crypto details
 */
export const getMyPortfolio = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) return [];

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) return [];

    const wallets = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .collect();

    // Enrich with crypto data
    const portfolio = await Promise.all(
      wallets.map(async (wallet) => {
        const crypto = await ctx.db.get(wallet.cryptoId);
        const currentValue = crypto ? wallet.balance * crypto.currentPrice : 0;
        const profitLoss = currentValue - wallet.totalInvested;
        const profitLossPercent = wallet.totalInvested > 0
          ? (profitLoss / wallet.totalInvested) * 100
          : 0;

        return {
          ...wallet,
          crypto,
          currentValue,
          profitLoss,
          profitLossPercent,
        };
      })
    );

    return portfolio;
  },
});

/**
 * Get transaction history for a player
 */
export const getMyTransactions = query({
  args: {
    cryptoId: v.optional(v.id("cryptocurrencies")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) return [];

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) return [];

    const limit = args.limit || 50;

    if (args.cryptoId !== undefined) {
      return await ctx.db
        .query("cryptoTransactions")
        .withIndex("by_player_crypto_time", (q) =>
          q.eq("playerId", player._id).eq("cryptoId", args.cryptoId!)
        )
        .order("desc")
        .take(limit);
    } else {
      return await ctx.db
        .query("cryptoTransactions")
        .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
        .order("desc")
        .take(limit);
    }
  },
});

/**
 * Get market statistics
 */
export const getMarketStats = query({
  handler: async (ctx) => {
    const cryptos = await ctx.db.query("cryptocurrencies").collect();
    
    const totalMarketCap = cryptos.reduce((sum, c) => sum + c.marketCap, 0);
    const last24h = Date.now() - 24 * 60 * 60 * 1000;
    
    // Get 24h volume
    const recentTxs = await ctx.db
      .query("cryptoTransactions")
      .withIndex("by_timestamp")
      .order("desc")
      .filter((q) => q.gte(q.field("timestamp"), last24h))
      .collect();
    
    const totalVolume24h = recentTxs.reduce((sum, tx) => sum + tx.totalValue, 0);
    
    return {
      totalMarketCap,
      totalVolume24h,
      cryptoCount: cryptos.length,
    };
  },
});

/**
 * Get total crypto value for a player (for net worth calculation)
 */
export const getPlayerCryptoValue = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const wallets = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    let totalValue = 0;
    for (const wallet of wallets) {
      const crypto = await ctx.db.get(wallet.cryptoId);
      if (crypto) {
        totalValue += wallet.balance * crypto.currentPrice;
      }
    }

    return totalValue;
  },
});

// Query: Get crypto ownership distribution
export const getCryptoOwnership = query({
  args: {
    cryptoId: v.id("cryptocurrencies"),
  },
  handler: async (ctx, args) => {
    // Get all wallets for this crypto
    const wallets = await ctx.db
      .query("playerCryptoWallets")
      .withIndex("by_cryptoId", (q) => q.eq("cryptoId", args.cryptoId))
      .collect();

    // Get player and user names
    const ownershipData = await Promise.all(
      wallets.map(async (wallet) => {
        const player = await ctx.db.get(wallet.playerId);
        if (!player) return null;
        
        const user = await ctx.db.get(player.userId);
        const playerName = user?.name || user?.clerkUsername || `Player ${wallet.playerId.slice(-4)}`;
        
        return {
          playerId: wallet.playerId,
          playerName,
          balance: wallet.balance,
        };
      })
    );

    // Filter out nulls and sort by balance descending
    const validData = ownershipData.filter((d): d is NonNullable<typeof d> => d !== null);
    validData.sort((a, b) => b.balance - a.balance);

    return validData;
  },
});
