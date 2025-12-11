import { v } from "convex/values";
import { query, mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

// Get user's subscription details with REAL-TIME expiration validation
export const getUserSubscription = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      return null;
    }
    
    // CRITICAL: Always check if subscription is actually expired
    const now = Date.now();
    if (subscription.currentPeriodEnd < now) {
      // Subscription is expired - return it but with expired status
      // The cron will update the database, but we need real-time validation
      return {
        ...subscription,
        status: "expired" as const,
        _isExpired: true, // Flag for frontend
      };
    }
    
    return subscription;
  },
});

// Internal mutation to create/update subscription from Ko-fi webhook
export const upsertSubscription = internalMutation({
  args: {
    userId: v.string(),
    kofiTransactionId: v.string(),
    email: v.string(),
    amount: v.number(),
    status: v.string(),
    tierName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    const now = Date.now();
    const oneMonthFromNow = now + (30 * 24 * 60 * 60 * 1000); // 30 days
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status as any,
        currentPeriodEnd: oneMonthFromNow,
        amount: args.amount,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("subscriptions", {
        userId: args.userId,
        lemonSqueezyId: args.kofiTransactionId,
        lemonSqueezyCustomerId: args.email,
        stripeCustomerId: args.email, // Keep for backwards compatibility
        stripeSubscriptionId: args.kofiTransactionId,
        stripePriceId: args.tierName || "quickbuck_plus",
        status: args.status as any,
        currentPeriodStart: now,
        currentPeriodEnd: oneMonthFromNow,
        cancelAtPeriodEnd: false,
        planName: "QuickBuck+",
        amount: args.amount,
        currency: "aud",
        interval: "month",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Helper query to check if user has VALID active subscription (checks expiration)
export const hasActiveSubscription = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!subscription) {
      return false;
    }
    
    // Check if subscription is active AND not expired
    const now = Date.now();
    const isActive = subscription.status === "active" || subscription.status === "on_trial";
    const isNotExpired = subscription.currentPeriodEnd > now;
    
    return isActive && isNotExpired;
  },
});

// Query: Get all VIP users (for admin panel)
export const getAllVIPUsers = query({
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

    // Only admins can view all VIP users
    if (currentPlayer.role !== "admin") {
      throw new Error("Only admins can view VIP users");
    }

    // Get all VIP players
    const vipPlayers = await ctx.db
      .query("players")
      .withIndex("by_isVIP", (q) => q.eq("isVIP", true))
      .collect();

    // Enrich with user data
    const enrichedVIPUsers = await Promise.all(
      vipPlayers.map(async (player) => {
        try {
          const userData = await ctx.db.get(player.userId);
          return {
            playerId: player._id,
            playerName: userData?.name ?? "Unknown",
            balance: player.balance ?? 0,
            vipExpiresAt: player.vipExpiresAt,
            vipGrantedBySubscription: player.vipGrantedBySubscription ?? false,
          };
        } catch (error) {
          console.error("Error enriching VIP user:", error);
          return {
            playerId: player._id,
            playerName: "Unknown",
            balance: player.balance ?? 0,
            vipExpiresAt: player.vipExpiresAt,
            vipGrantedBySubscription: false,
          };
        }
      })
    );

    return enrichedVIPUsers;
  },
});

// Mutation: Admin grant VIP to a player
export const adminGrantVIP = mutation({
  args: {
    targetPlayerId: v.id("players"),
    durationMonths: v.number(),
  },
  handler: async (ctx, args) => {
    // Check admin access
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

    // Only admins can grant VIP
    if (currentPlayer.role !== "admin") {
      throw new Error("Only admins can grant VIP");
    }

    const player = await ctx.db.get(args.targetPlayerId);
    if (!player) throw new Error("Player not found");

    const now = Date.now();
    const expiresAt = now + (args.durationMonths * 30 * 24 * 60 * 60 * 1000);

    await ctx.db.patch(args.targetPlayerId, {
      isVIP: true,
      vipExpiresAt: expiresAt,
      vipGrantedBySubscription: false, // Mark as manually granted
      updatedAt: now,
    });

    return { success: true, message: `VIP granted for ${args.durationMonths} month(s)` };
  },
});

// Mutation: Admin revoke VIP from a player
export const adminRevokeVIP = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Check admin access
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

    // Only admins can revoke VIP
    if (currentPlayer.role !== "admin") {
      throw new Error("Only admins can revoke VIP");
    }

    const player = await ctx.db.get(args.targetPlayerId);
    if (!player) throw new Error("Player not found");

    // Only allow revoking manually granted VIP
    if (player.vipGrantedBySubscription) {
      throw new Error("Cannot revoke subscription-based VIP");
    }

    await ctx.db.patch(args.targetPlayerId, {
      isVIP: false,
      vipExpiresAt: undefined,
      vipGrantedBySubscription: undefined,
      updatedAt: Date.now(),
    });

    return { success: true, message: "VIP revoked" };
  },
});

// Internal mutation to check for expired VIP subscriptions (called by cron every 6 hours)
export const checkExpiredVIPSubscriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Query all active and on_trial subscriptions (need to check both)
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    const trialSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "on_trial"))
      .collect();
    
    const allSubscriptions = [...activeSubscriptions, ...trialSubscriptions];
    
    let expiredCount = 0;
    
    for (const sub of allSubscriptions) {
      // Check if subscription is expired (currentPeriodEnd is in the past)
      if (sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
        // Update subscription status to expired
        await ctx.db.patch(sub._id, {
          status: "expired",
          cancelAtPeriodEnd: true,
          canceledAt: now,
          updatedAt: now,
        });
        
        console.log(`[SUBSCRIPTION] Expired subscription for user ${sub.userId}`);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[CRON] ✅ Expired ${expiredCount} subscription(s)`);
    }
    
    return { expiredCount, checkedCount: allSubscriptions.length };
  },
});
