import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

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
