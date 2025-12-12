import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { applyRebirthBoost } from "./rebirths";

// VIP casino luck bonus - 5% increased payouts
const VIP_LUCK_BONUS = 0.05;

// Helper to get total gambling luck bonus for a player
async function getGamblingLuckBonus(ctx: any, playerId: Id<"players">): Promise<number> {
  const playerUpgrades = await ctx.db
    .query("upgrades")
    .withIndex("by_playerId", (q: any) => q.eq("playerId", playerId))
    .filter((q: any) => q.eq(q.field("isActive"), true))
    .collect();
  
  const hasGamblingLuck = playerUpgrades.some((u: any) => u.upgradeType === "gambling_luck");
  return hasGamblingLuck ? 0.05 : 0; // 5% boost if upgrade is active
}

// ===============================
// BLACKJACK STATE MANAGEMENT
// ===============================

// Note: Blackjack games are now stored in the database (blackjackGames table)
// This ensures persistence across server restarts

// Helper: Create a shuffled deck (values 1-11, where 1=Ace, 11=J/Q/K/10)
function createDeck(): number[] {
  const deck: number[] = [];
  // 4 suits × 13 cards = 52 cards
  // Ace (1), 2-9, 10, Jack (11), Queen (11), King (11)
  for (let suit = 0; suit < 4; suit++) {
    for (let value = 1; value <= 13; value++) {
      if (value === 1) {
        deck.push(1); // Ace
      } else if (value >= 2 && value <= 10) {
        deck.push(value);
      } else {
        deck.push(10); // J, Q, K all worth 10
      }
    }
  }
  // Shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Helper: Calculate hand value (Aces count as 11 or 1)
function calculateHandValue(hand: number[]): number {
  let value = 0;
  let aces = 0;

  for (const card of hand) {
    if (card === 1) {
      aces++;
      value += 11; // Initially count Ace as 11
    } else {
      value += card;
    }
  }

  // Convert Aces from 11 to 1 if needed
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return value;
}

// ===============================
// QUERIES
// ===============================

// Get active blackjack game for player
export const getActiveBlackjackGame = query({
  args: {},
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

    if (!player) throw new Error("Player not found");

    // Get the most recent game for this player, ordered by updatedAt descending
    const games = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId_updatedAt", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(1);
    
    const game = games[0];
    
    // Game must be in a playable state and updated within last 5 minutes (not abandoned)
    if (
      game && 
      Date.now() - game.updatedAt < 5 * 60 * 1000 && 
      (game.gameState === "playing")
    ) {
      return {
        exists: true,
        playerHand: game.playerHand,
        dealerHand: game.dealerHand,
        playerValue: calculateHandValue(game.playerHand),
        dealerValue: calculateHandValue(game.dealerHand),
        gameState: game.gameState,
        betAmount: game.betAmount,
        playerStood: game.playerStood,
      };
    }

    return { exists: false };
  },
});

// Get gambling history for player
export const getGamblingHistory = query({
  args: {
    limit: v.optional(v.number()),
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

    const history = await ctx.db
      .query("gamblingHistory")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(args.limit || 50);

    return history;
  },
});

// ===============================
// MUTATIONS - SLOTS
// ===============================

export const playSlots = mutation({
  args: {
    betAmount: v.number(),
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

    // Validate bet
    if (args.betAmount < 100) throw new Error("Minimum bet is $1");
    if (args.betAmount > 1000000) throw new Error("Maximum bet is $10,000");
    if (player.balance < args.betAmount) throw new Error("Insufficient balance");

    // RACE CONDITION FIX: Re-fetch player to get latest balance before deduction
    const latestPlayer = await ctx.db.get(player._id);
    if (!latestPlayer) throw new Error("Player not found");
    if (latestPlayer.balance < args.betAmount) throw new Error("Insufficient balance");

    // Deduct bet
    await ctx.db.patch(player._id, {
      balance: latestPlayer.balance - args.betAmount,
      updatedAt: Date.now(),
    });

    // Slots symbols: 🍒 🍋 🍊 🍇 💎 7️⃣ 
    const symbols = ["🍒", "🍋", "🍊", "🍇", "💎", "7️⃣"];
    const reels = [
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
      symbols[Math.floor(Math.random() * symbols.length)],
    ];

    let payout = 0;
    let result: "win" | "loss" = "loss";
    let multiplier = 0;

    // Check for wins
    if (reels[0] === reels[1] && reels[1] === reels[2]) {
      // Three of a kind
      result = "win";
      if (reels[0] === "7️⃣") {
        multiplier = 10; // 10x for three 7s
      } else if (reels[0] === "💎") {
        multiplier = 5; // 5x for three diamonds
      } else {
        multiplier = 3; // 3x for three of any other symbol
      }
      payout = args.betAmount * multiplier;
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
      // Two of a kind
      result = "win";
      multiplier = 1.5;
      payout = Math.floor(args.betAmount * multiplier);
    }

    // Apply VIP luck bonus (+5% to payouts)
    if (payout > 0 && player.isVIP) {
      payout = Math.floor(payout * (1 + VIP_LUCK_BONUS));
    }

    // Award payout (with rebirth boost for R3+)
    if (payout > 0) {
      const boostedPayout = await applyRebirthBoost(ctx, player._id, payout);
      const updatedPlayer = await ctx.db.get(player._id);
      if (updatedPlayer) {
        await ctx.db.patch(player._id, {
          balance: updatedPlayer.balance + boostedPayout,
          updatedAt: Date.now(),
        });
      }
      payout = boostedPayout; // Update payout for return value
    }

    // Record history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "slots",
      betAmount: args.betAmount,
      payout,
      result,
      details: { reels, multiplier },
      timestamp: Date.now(),
    });

    return {
      reels,
      payout,
      result,
      multiplier,
      newBalance: latestPlayer.balance - args.betAmount + payout,
    };
  },
});

// ===============================
// MUTATIONS - BLACKJACK
// ===============================

export const startBlackjack = mutation({
  args: {
    betAmount: v.number(),
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

    // Validate bet
    if (args.betAmount < 100) throw new Error("Minimum bet is $1");
    if (args.betAmount > 1000000) throw new Error("Maximum bet is $10,000");
    if (player.balance < args.betAmount) throw new Error("Insufficient balance");

    // Check if there's already an active game - use most recent game
    const existingGames = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId_updatedAt", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(1);
    
    const existingGame = existingGames[0];
    
    // If there's ANY existing game in "playing" state, automatically clean it up
    // This handles cases where player navigated away, switched tabs, or refreshed
    if (existingGame && existingGame.gameState === "playing") {
      // Record the abandoned game in history
      await ctx.db.insert("gamblingHistory", {
        playerId: player._id,
        gameType: "blackjack",
        betAmount: existingGame.betAmount,
        payout: 0,
        result: "loss",
        details: {
          playerHand: existingGame.playerHand,
          dealerHand: existingGame.dealerHand,
          outcome: "auto-abandoned",
        },
        timestamp: Date.now(),
      });
      
      // Delete the abandoned game
      await ctx.db.delete(existingGame._id);
    }

    // RACE CONDITION FIX: Re-fetch player to get latest balance before deduction
    const latestPlayer = await ctx.db.get(player._id);
    if (!latestPlayer) throw new Error("Player not found");
    if (latestPlayer.balance < args.betAmount) throw new Error("Insufficient balance");

    // Deduct bet
    await ctx.db.patch(player._id, {
      balance: latestPlayer.balance - args.betAmount,
      updatedAt: Date.now(),
    });

    // Create new deck and deal cards
    const deck = createDeck();
    const playerHand = [deck.pop()!, deck.pop()!];
    const dealerHand = [deck.pop()!, deck.pop()!];

    const playerValue = calculateHandValue(playerHand);
    const dealerValue = calculateHandValue(dealerHand);

    // Check for instant blackjack
    let gameState: "playing" | "blackjack" = "playing";
    let payout = 0;

    if (playerValue === 21) {
      gameState = "blackjack";
      payout = Math.floor(args.betAmount * 2.5); // 2.5x for blackjack
      // Apply VIP luck bonus (+5% to payouts)
      if (player.isVIP) {
        payout = Math.floor(payout * (1 + VIP_LUCK_BONUS));
      }
      payout = await applyRebirthBoost(ctx, player._id, payout); // Apply rebirth boost
      
      const updatedPlayer = await ctx.db.get(player._id);
      if (updatedPlayer) {
        await ctx.db.patch(player._id, {
          balance: updatedPlayer.balance + payout,
          updatedAt: Date.now(),
        });
      }

      await ctx.db.insert("gamblingHistory", {
        playerId: player._id,
        gameType: "blackjack",
        betAmount: args.betAmount,
        payout,
        result: "win",
        details: { playerHand, dealerHand, playerValue, dealerValue, outcome: "blackjack" },
        timestamp: Date.now(),
      });

      // Don't store game if it's instant blackjack
      return {
        playerHand,
        dealerHand: [dealerHand[0]], // Only show dealer's first card
        playerValue,
        dealerValue: calculateHandValue([dealerHand[0]]),
        gameState,
        payout,
        canHit: false,
        canStand: false,
      };
    }

    // Store game state in database
    await ctx.db.insert("blackjackGames", {
      playerId: player._id,
      betAmount: args.betAmount,
      playerHand,
      dealerHand,
      deck,
      gameState,
      playerStood: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return {
      playerHand,
      dealerHand: [dealerHand[0]], // Only show dealer's first card
      playerValue,
      dealerValue: calculateHandValue([dealerHand[0]]),
      gameState,
      payout: 0,
      canHit: true,
      canStand: true,
    };
  },
});

export const hitBlackjack = mutation({
  args: {},
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

    if (!player) throw new Error("Player not found");

    // Get active game from database - fetch most recent game
    const games = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId_updatedAt", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(1);

    const game = games[0];
    if (!game) throw new Error("No active game found");
    if (game.gameState !== "playing") throw new Error("Game is already finished");
    if (game.playerStood) throw new Error("You already stood");

    // Draw a card
    const deck = [...game.deck]; // Copy array
    const newCard = deck.pop();
    if (!newCard) throw new Error("Deck is empty");

    const playerHand = [...game.playerHand, newCard];
    const playerValue = calculateHandValue(playerHand);

    // Check for bust
    if (playerValue > 21) {
      await ctx.db.insert("gamblingHistory", {
        playerId: player._id,
        gameType: "blackjack",
        betAmount: game.betAmount,
        payout: 0,
        result: "loss",
        details: {
          playerHand,
          dealerHand: game.dealerHand,
          playerValue,
          dealerValue: calculateHandValue(game.dealerHand),
          outcome: "player_bust",
        },
        timestamp: Date.now(),
      });

      // Delete game from database
      await ctx.db.delete(game._id);

      return {
        playerHand,
        dealerHand: game.dealerHand,
        playerValue,
        dealerValue: calculateHandValue(game.dealerHand),
        gameState: "player_bust" as const,
        payout: 0,
        canHit: false,
        canStand: false,
      };
    }

    // Update game in database with new card and deck state
    await ctx.db.patch(game._id, {
      playerHand,
      deck,
      updatedAt: Date.now(),
    });

    return {
      playerHand,
      dealerHand: [game.dealerHand[0]], // Still hide dealer's second card
      playerValue,
      dealerValue: calculateHandValue([game.dealerHand[0]]),
      gameState: "playing" as const,
      payout: 0,
      canHit: true,
      canStand: true,
    };
  },
});

export const standBlackjack = mutation({
  args: {},
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

    if (!player) throw new Error("Player not found");

    // Get active game from database - fetch most recent game
    const games = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId_updatedAt", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(1);

    const game = games[0];
    if (!game) throw new Error("No active game found");
    if (game.gameState !== "playing") throw new Error("Game is already finished");

    // Dealer draws until 17 or higher
    let deck = [...game.deck];
    let dealerHand = [...game.dealerHand];
    let dealerValue = calculateHandValue(dealerHand);

    while (dealerValue < 17) {
      const newCard = deck.pop();
      if (!newCard) break;
      dealerHand.push(newCard);
      dealerValue = calculateHandValue(dealerHand);
    }

    const playerValue = calculateHandValue(game.playerHand);

    // Determine winner
    let gameState: "dealer_bust" | "player_win" | "dealer_win" | "push";
    let payout = 0;
    let result: "win" | "loss" = "loss";

    if (dealerValue > 21) {
      gameState = "dealer_bust";
      payout = game.betAmount * 2; // Win bet amount
      result = "win";
    } else if (playerValue > dealerValue) {
      gameState = "player_win";
      payout = game.betAmount * 2; // Win bet amount
      result = "win";
    } else if (dealerValue > playerValue) {
      gameState = "dealer_win";
      payout = 0;
      result = "loss";
    } else {
      gameState = "push";
      payout = game.betAmount; // Return bet
      result = "win";
    }

    // Apply VIP luck bonus (+5% to payouts, but not for push)
    if (payout > 0 && result === "win" && gameState !== "push" && player.isVIP) {
      payout = Math.floor(payout * (1 + VIP_LUCK_BONUS));
    }

    // Apply gambling luck upgrade (+5% to payouts, but not for push)
    const luckBonus = await getGamblingLuckBonus(ctx, player._id);
    if (payout > 0 && result === "win" && gameState !== "push" && luckBonus > 0) {
      payout = Math.floor(payout * (1 + luckBonus));
    }

    // Award payout (with rebirth boost for R3+, but not for push)
    if (payout > 0 && result === "win" && gameState !== "push") {
      payout = await applyRebirthBoost(ctx, player._id, payout);
    }
    
    if (payout > 0) {
      const updatedPlayer = await ctx.db.get(player._id);
      if (updatedPlayer) {
        await ctx.db.patch(player._id, {
          balance: updatedPlayer.balance + payout,
          updatedAt: Date.now(),
        });
      }
    }

    // Record history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "blackjack",
      betAmount: game.betAmount,
      payout,
      result,
      details: {
        playerHand: game.playerHand,
        dealerHand,
        playerValue,
        dealerValue,
        outcome: gameState,
      },
      timestamp: Date.now(),
    });

    // Delete game from database
    await ctx.db.delete(game._id);

    return {
      playerHand: game.playerHand,
      dealerHand,
      playerValue,
      dealerValue,
      gameState,
      payout,
      canHit: false,
      canStand: false,
    };
  },
});

// Abandon/leave an active blackjack game (forfeits the bet)
export const abandonBlackjack = mutation({
  args: {},
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

    if (!player) throw new Error("Player not found");

    // Get active game from database - fetch most recent game
    const games = await ctx.db
      .query("blackjackGames")
      .withIndex("by_playerId_updatedAt", (q) => q.eq("playerId", player._id))
      .order("desc")
      .take(1);

    const game = games[0];
    
    // If there's an active game, abandon it
    if (game && game.gameState === "playing") {
      // Record as a loss in history
      await ctx.db.insert("gamblingHistory", {
        playerId: player._id,
        gameType: "blackjack",
        betAmount: game.betAmount,
        payout: 0,
        result: "loss",
        details: {
          playerHand: game.playerHand,
          dealerHand: game.dealerHand,
          outcome: "abandoned",
        },
        timestamp: Date.now(),
      });

      // Delete the game from database
      await ctx.db.delete(game._id);
    }

    return { success: true };
  },
});

// ===============================
// MUTATIONS - DICE ROLL
// ===============================

export const playDice = mutation({
  args: {
    betAmount: v.number(),
    prediction: v.union(
      v.literal("under"),
      v.literal("over"),
      v.literal("seven")
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

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) throw new Error("Player not found");

    // Validate bet
    if (args.betAmount < 100) throw new Error("Minimum bet is $1");
    if (args.betAmount > 1000000) throw new Error("Maximum bet is $10,000");
    if (player.balance < args.betAmount) throw new Error("Insufficient balance");

    // RACE CONDITION FIX: Re-fetch player to get latest balance before deduction
    const latestPlayer = await ctx.db.get(player._id);
    if (!latestPlayer) throw new Error("Player not found");
    if (latestPlayer.balance < args.betAmount) throw new Error("Insufficient balance");

    // Deduct bet
    await ctx.db.patch(player._id, {
      balance: latestPlayer.balance - args.betAmount,
      updatedAt: Date.now(),
    });

    // Roll two dice
    const die1 = Math.floor(Math.random() * 6) + 1;
    const die2 = Math.floor(Math.random() * 6) + 1;
    const total = die1 + die2;

    let payout = 0;
    let result: "win" | "loss" = "loss";
    let multiplier = 0;

    // Check prediction
    if (args.prediction === "under" && total < 7) {
      result = "win";
      multiplier = 2.5;
      payout = Math.floor(args.betAmount * multiplier);
    } else if (args.prediction === "over" && total > 7) {
      result = "win";
      multiplier = 2.5;
      payout = Math.floor(args.betAmount * multiplier);
    } else if (args.prediction === "seven" && total === 7) {
      result = "win";
      multiplier = 5;
      payout = Math.floor(args.betAmount * multiplier);
    }

    // Apply VIP luck bonus (+5% to payouts)
    if (payout > 0 && player.isVIP) {
      payout = Math.floor(payout * (1 + VIP_LUCK_BONUS));
    }

    // Apply gambling luck upgrade (+5% to payouts)
    const luckBonus = await getGamblingLuckBonus(ctx, player._id);
    if (payout > 0 && luckBonus > 0) {
      payout = Math.floor(payout * (1 + luckBonus));
    }

    // Award payout (with rebirth boost for R3+)
    if (payout > 0) {
      const boostedPayout = await applyRebirthBoost(ctx, player._id, payout);
      const updatedPlayer = await ctx.db.get(player._id);
      if (updatedPlayer) {
        await ctx.db.patch(player._id, {
          balance: updatedPlayer.balance + boostedPayout,
          updatedAt: Date.now(),
        });
      }
      payout = boostedPayout; // Update payout for return value
    }

    // Record history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "dice",
      betAmount: args.betAmount,
      payout,
      result,
      details: { die1, die2, total, prediction: args.prediction, multiplier },
      timestamp: Date.now(),
    });

    return {
      die1,
      die2,
      total,
      payout,
      result,
      multiplier,
      newBalance: latestPlayer.balance - args.betAmount + payout,
    };
  },
});

// ===============================
// MUTATIONS - ROULETTE
// ===============================

export const playRoulette = mutation({
  args: {
    betAmount: v.number(),
    betType: v.union(
      v.literal("red"),
      v.literal("black"),
      v.literal("green"),
      v.literal("even"),
      v.literal("odd"),
      v.literal("low"), // 1-18
      v.literal("high"), // 19-36
      v.literal("dozen1"), // 1-12
      v.literal("dozen2"), // 13-24
      v.literal("dozen3") // 25-36
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

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) throw new Error("Player not found");

    // Validate bet
    if (args.betAmount < 100) throw new Error("Minimum bet is $1");
    if (args.betAmount > 1000000) throw new Error("Maximum bet is $10,000");
    if (player.balance < args.betAmount) throw new Error("Insufficient balance");

    // Deduct bet
    await ctx.db.patch(player._id, {
      balance: player.balance - args.betAmount,
      updatedAt: Date.now(),
    });

    // Roulette numbers: 0-36, where 0 is green
    // Red numbers: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
    // Black numbers: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35
    const redNumbers = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    const blackNumbers = [2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35];

    const number = Math.floor(Math.random() * 37); // 0-36
    
    let color: "red" | "black" | "green";
    if (number === 0) {
      color = "green";
    } else if (redNumbers.includes(number)) {
      color = "red";
    } else {
      color = "black";
    }

    let payout = 0;
    let result: "win" | "loss" = "loss";
    let multiplier = 0;

    // Check bet type
    if (args.betType === "green" && color === "green") {
      result = "win";
      multiplier = 35; // 35x for green/0
      payout = args.betAmount * multiplier;
    } else if (args.betType === "red" && color === "red") {
      result = "win";
      multiplier = 2;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "black" && color === "black") {
      result = "win";
      multiplier = 2;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "even" && number !== 0 && number % 2 === 0) {
      result = "win";
      multiplier = 2;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "odd" && number % 2 === 1) {
      result = "win";
      multiplier = 2;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "low" && number >= 1 && number <= 18) {
      result = "win";
      multiplier = 2;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "high" && number >= 19 && number <= 36) {
      result = "win";
      multiplier = 2;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "dozen1" && number >= 1 && number <= 12) {
      result = "win";
      multiplier = 3;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "dozen2" && number >= 13 && number <= 24) {
      result = "win";
      multiplier = 3;
      payout = args.betAmount * multiplier;
    } else if (args.betType === "dozen3" && number >= 25 && number <= 36) {
      result = "win";
      multiplier = 3;
      payout = args.betAmount * multiplier;
    }

    // Apply VIP luck bonus (+5% to payouts)
    if (payout > 0 && player.isVIP) {
      payout = Math.floor(payout * (1 + VIP_LUCK_BONUS));
    }

    // Apply gambling luck upgrade (+5% to payouts)
    const luckBonus = await getGamblingLuckBonus(ctx, player._id);
    if (payout > 0 && luckBonus > 0) {
      payout = Math.floor(payout * (1 + luckBonus));
    }

    // Award payout (with rebirth boost for R3+)
    if (payout > 0) {
      const boostedPayout = await applyRebirthBoost(ctx, player._id, payout);
      const updatedPlayer = await ctx.db.get(player._id);
      if (updatedPlayer) {
        await ctx.db.patch(player._id, {
          balance: updatedPlayer.balance + boostedPayout,
          updatedAt: Date.now(),
        });
      }
      payout = boostedPayout; // Update payout for return value
    }

    // Record history
    await ctx.db.insert("gamblingHistory", {
      playerId: player._id,
      gameType: "roulette",
      betAmount: args.betAmount,
      payout,
      result,
      details: { number, color, betType: args.betType, multiplier },
      timestamp: Date.now(),
    });

    return {
      number,
      color,
      payout,
      result,
      multiplier,
      newBalance: player.balance - args.betAmount + payout,
    };
  },
});
