import { v } from "convex/values";
import { query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Get user's subscription details
export const getUserSubscription = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

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

// Internal mutation to check for expired VIP subscriptions (called by cron)
export const checkExpiredVIPSubscriptions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Query all active subscriptions that have expired
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    let expiredCount = 0;
    
    for (const sub of subscriptions) {
      // Check if subscription is expired (currentPeriodEnd is in the past)
      if (sub.currentPeriodEnd && sub.currentPeriodEnd < now) {
        // Update subscription status to canceled
        await ctx.db.patch(sub._id, {
          status: "canceled",
          updatedAt: now,
        });
        expiredCount++;
      }
    }
    
    console.log(`[CRON] Checked VIP subscriptions, expired ${expiredCount} subscription(s)`);
    return { expiredCount };
  },
});
