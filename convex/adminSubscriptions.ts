import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Admin: Manually activate subscription for a user by email
export const manuallyActivateSubscription = mutation({
  args: {
    email: v.string(),
    months: v.optional(v.number()), // How many months to give (default 1)
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      throw new Error(`No user found with email: ${args.email}`);
    }
    
    const userId = user.tokenIdentifier;
    const months = args.months || 1;
    const now = Date.now();
    const expiresAt = now + (months * 30 * 24 * 60 * 60 * 1000); // months in milliseconds
    
    // Check if subscription already exists
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        status: "active",
        currentPeriodEnd: expiresAt,
        updatedAt: now,
      });
    } else {
      // Create new
      await ctx.db.insert("subscriptions", {
        userId,
        lemonSqueezyId: `manual_${Date.now()}`,
        lemonSqueezyCustomerId: args.email,
        stripeCustomerId: args.email,
        stripeSubscriptionId: `manual_${Date.now()}`,
        stripePriceId: "quickbuck_plus_manual",
        status: "active",
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
        planName: "QuickBuck+",
        amount: 300,
        currency: "aud",
        interval: "month",
        createdAt: now,
        updatedAt: now,
      });
    }
    
    return { 
      success: true, 
      message: `Activated QuickBuck+ for ${args.email} until ${new Date(expiresAt).toLocaleDateString()}` 
    };
  },
});

// Admin: List all active subscriptions
export const listActiveSubscriptions = query({
  handler: async (ctx) => {
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    
    // Get user details for each subscription
    const subsWithUsers = await Promise.all(
      subscriptions.map(async (sub) => {
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("tokenIdentifier"), sub.userId))
          .first();
        
        return {
          ...sub,
          userEmail: user?.email,
          userName: user?.name,
        };
      })
    );
    
    return subsWithUsers;
  },
});

// Admin: Deactivate subscription by email
export const deactivateSubscription = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (!user) {
      throw new Error(`No user found with email: ${args.email}`);
    }
    
    const userId = user.tokenIdentifier;
    
    // Find subscription
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    
    if (!subscription) {
      throw new Error(`No subscription found for ${args.email}`);
    }
    
    // Deactivate
    await ctx.db.patch(subscription._id, {
      status: "canceled",
      cancelAtPeriodEnd: true,
      updatedAt: Date.now(),
    });
    
    return { success: true, message: `Deactivated subscription for ${args.email}` };
  },
});
