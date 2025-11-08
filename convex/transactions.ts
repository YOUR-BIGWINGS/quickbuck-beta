import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Mutation: Create transaction
export const createTransaction = mutation({
  args: {
    fromAccountId: v.union(v.id("players"), v.id("companies")),
    fromAccountType: v.union(v.literal("player"), v.literal("company")),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    amount: v.number(),
    assetType: v.union(
      v.literal("cash"),
      v.literal("stock"),
      v.literal("product"),
      v.literal("crypto")
    ),
    assetId: v.optional(v.string()),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("transactions", {
      ...args,
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

// Query: Get transaction
export const getTransaction = query({
  args: {
    transactionId: v.id("transactions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.transactionId);
  },
});

// Query: Get player transaction history
export const getPlayerTransactionHistory = query({
  args: {
    playerId: v.id("players"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.playerId))
      .collect();

    const received = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) => q.eq("toAccountId", args.playerId))
      .collect();

    const all = [...sent, ...received].sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return all.slice(0, args.limit);
    }

    return all;
  },
});

// Query: Get company transaction history
export const getCompanyTransactionHistory = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("transactions")
      .withIndex("by_fromAccountId", (q) => q.eq("fromAccountId", args.companyId))
      .collect();

    const received = await ctx.db
      .query("transactions")
      .withIndex("by_toAccountId", (q) => q.eq("toAccountId", args.companyId))
      .collect();

    const all = [...sent, ...received].sort((a, b) => b.createdAt - a.createdAt);

    if (args.limit) {
      return all.slice(0, args.limit);
    }

    return all;
  },
});

// Query: Get recent transactions (global)
export const getRecentTransactions = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(args.limit);

    return transactions;
  },
});

// Mutation: Transfer cash between accounts
export const transferCash = mutation({
  args: {
    fromAccountId: v.union(v.id("players"), v.id("companies")),
    fromAccountType: v.union(v.literal("player"), v.literal("company")),
    toAccountId: v.union(v.id("players"), v.id("companies")),
    toAccountType: v.union(v.literal("player"), v.literal("company")),
    amount: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to transfer money");
    }

    // Get user and verify they exist
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    // Get player and verify they exist
    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Verify sender account ownership
    if (args.fromAccountType === "player") {
      const playerId = args.fromAccountId as Id<"players">;
      if (playerId !== currentPlayer._id) {
        throw new Error("You can only transfer from your own accounts");
      }
    } else {
      const companyId = args.fromAccountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company || company.ownerId !== currentPlayer._id) {
        throw new Error("You can only transfer from companies you own");
      }
    }

    if (args.amount <= 0) {
      throw new Error("Amount must be positive");
    }

    // EXPLOIT FIX: Prevent self-transfers
    if (args.fromAccountId === args.toAccountId && args.fromAccountType === args.toAccountType) {
      throw new Error("Cannot transfer to yourself");
    }

    // RACE CONDITION FIX: Fetch latest balances before any modifications
    // Deduct from sender
    if (args.fromAccountType === "player") {
      const playerId = args.fromAccountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player) throw new Error("Sender not found");
      if (player.balance < args.amount) {
        throw new Error("Insufficient balance");
      }
      await ctx.db.patch(playerId, {
        balance: player.balance - args.amount,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.fromAccountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company) throw new Error("Sender not found");
      if (company.balance < args.amount) {
        throw new Error("Insufficient balance");
      }
      await ctx.db.patch(companyId, {
        balance: company.balance - args.amount,
        updatedAt: Date.now(),
      });
    }

    // Credit to receiver
    if (args.toAccountType === "player") {
      const playerId = args.toAccountId as Id<"players">;
      const player = await ctx.db.get(playerId);
      if (!player) throw new Error("Recipient not found");
      await ctx.db.patch(playerId, {
        balance: player.balance + args.amount,
        updatedAt: Date.now(),
      });
    } else {
      const companyId = args.toAccountId as Id<"companies">;
      const company = await ctx.db.get(companyId);
      if (!company) throw new Error("Recipient not found");
      await ctx.db.patch(companyId, {
        balance: company.balance + args.amount,
        updatedAt: Date.now(),
      });
    }

    // Create transaction record
    const transactionId = await ctx.db.insert("transactions", {
      fromAccountId: args.fromAccountId,
      fromAccountType: args.fromAccountType,
      toAccountId: args.toAccountId,
      toAccountType: args.toAccountType,
      amount: args.amount,
      assetType: "cash" as const,
      description: args.description || "Cash transfer",
      createdAt: Date.now(),
    });

    return transactionId;
  },
});

// Note: Stock transfers are now handled in stocks.ts (buyStock/sellStock)
// export const transferStock = mutation({
//   ...
// });
