import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, httpAction, internalMutation, mutation, query } from "./_generated/server";
import Stripe from "stripe";

// Helper to get Stripe instance
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set. Run: npx convex env set STRIPE_SECRET_KEY your_key");
  }
  
  return new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia",
  });
}

// QuickBuck+ Plan Configuration
const QUICKBUCK_PLUS = {
  name: "QuickBuck+",
  amount: 300, // 3 AUD in cents
  currency: "aud",
  interval: "month" as const,
};

// Get available subscription plans
export const getAvailablePlans = query({
  handler: async () => {
    return {
      items: [
        {
          id: "quickbuck_plus",
          name: QUICKBUCK_PLUS.name,
          price: QUICKBUCK_PLUS.amount,
          currency: QUICKBUCK_PLUS.currency,
          interval: QUICKBUCK_PLUS.interval,
          features: [
            "Special gold VIP tag",
            "Access to exclusive premium themes",
            "Stock analysis bot with daily recommendations",
            "Investment insights and suggestions",
          ],
        },
      ],
    };
  },
});

// Create Stripe checkout session for QuickBuck+ subscription
export const createCheckoutSession = action({
  args: {
    userId: v.string(),
    email: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const stripe = getStripe();
      
      // Check if user already has an active subscription
      const existingSub = await ctx.runQuery(api.subscriptions.getUserSubscription, {
        userId: args.userId,
      });

      if (existingSub && existingSub.status === "active") {
        throw new Error("User already has an active subscription");
      }

      // Create or retrieve Stripe customer
      let customer: Stripe.Customer;
      const customers = await stripe.customers.list({
        email: args.email,
        limit: 1,
      });

      if (customers.data.length > 0) {
        customer = customers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: args.email,
          metadata: {
            userId: args.userId,
          },
        });
      }

      // Create Stripe Price (or use existing one)
      const prices = await stripe.prices.list({
        product: undefined,
        limit: 1,
        lookup_keys: ["quickbuck_plus_monthly"],
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        // Create product and price
        const product = await stripe.products.create({
          name: QUICKBUCK_PLUS.name,
          description: "Premium QuickBuck subscription with exclusive features",
          metadata: {
            plan: "quickbuck_plus",
          },
        });

        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: QUICKBUCK_PLUS.amount,
          currency: QUICKBUCK_PLUS.currency,
          recurring: {
            interval: QUICKBUCK_PLUS.interval,
          },
          lookup_key: "quickbuck_plus_monthly",
        });

        priceId = price.id;
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        metadata: {
          userId: args.userId,
        },
        subscription_data: {
          metadata: {
            userId: args.userId,
          },
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new Error(`Failed to create checkout session: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});

// Check user subscription status
export const checkUserSubscriptionStatus = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      return { hasActiveSubscription: false };
    }

    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const currentTime = Date.now();
    const isExpired = subscription.currentPeriodEnd < currentTime;

    return {
      hasActiveSubscription: isActive && !isExpired,
      status: subscription.status,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  },
});

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

// Internal query for use in actions
export const getUserSubscriptionInternal = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get player VIP status
export const getPlayerVIPStatus = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { isVIP: false };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .first();

    if (!user) {
      return { isVIP: false };
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!player) {
      return { isVIP: false };
    }

    return {
      isVIP: player.isVIP || false,
      vipExpiresAt: player.vipExpiresAt,
    };
  },
});

// Helper function to check if a player has VIP access (for use in other convex functions)
export async function checkPlayerHasVIP(ctx: any, playerId: string): Promise<boolean> {
  const player = await ctx.db.get(playerId);
  if (!player) return false;
  
  // Check if VIP and not expired
  if (!player.isVIP) return false;
  if (player.vipExpiresAt && player.vipExpiresAt < Date.now()) return false;
  
  return true;
}

// Admin mutation: Manually grant VIP status for testing/support (admin only)
export const adminGrantVIP = mutation({
  args: {
    targetPlayerId: v.id("players"),
    durationMonths: v.number(), // Number of months to grant VIP
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Check if current player is admin
    if (currentPlayer.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Validate duration
    if (args.durationMonths < 1 || args.durationMonths > 12) {
      throw new Error("Duration must be between 1 and 12 months");
    }

    // Get target player
    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) {
      throw new Error("Target player not found");
    }

    // Calculate expiration date
    const now = Date.now();
    const monthsInMs = args.durationMonths * 30 * 24 * 60 * 60 * 1000; // Approximate
    const expiresAt = now + monthsInMs;

    // Grant VIP (mark as admin-granted, not subscription)
    await ctx.db.patch(args.targetPlayerId, {
      isVIP: true,
      vipExpiresAt: expiresAt,
      vipGrantedBySubscription: false,
      updatedAt: now,
    });

    // Create or update VIP tag
    const existingTag = await ctx.db
      .query("playerTags")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .first();

    if (existingTag) {
      await ctx.db.patch(existingTag._id, {
        tagText: "VIP",
        tagColor: "#FFD700",
        usernameColor: "#FFD700",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("playerTags", {
        playerId: args.targetPlayerId,
        tagText: "VIP",
        tagColor: "#FFD700",
        usernameColor: "#FFD700",
        createdByAdminId: currentPlayer._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      expiresAt,
      message: `VIP granted for ${args.durationMonths} month(s)`,
    };
  },
});

// Query: Get all VIP users for admin panel
export const getAllVIPUsers = query({
  handler: async (ctx) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Check if current player is admin
    if (currentPlayer.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get all VIP players
    const vipPlayers = await ctx.db
      .query("players")
      .withIndex("by_isVIP", (q) => q.eq("isVIP", true))
      .collect();

    // Get usernames for each player
    const vipPlayersWithDetails = await Promise.all(
      vipPlayers.map(async (player) => {
        const user = await ctx.db.get(player.userId);
        return {
          playerId: player._id,
          playerName: user?.clerkUsername || user?.name || "Unknown",
          balance: player.balance,
          isVIP: player.isVIP,
          vipExpiresAt: player.vipExpiresAt,
          vipGrantedBySubscription: player.vipGrantedBySubscription,
        };
      })
    );

    return vipPlayersWithDetails;
  },
});

// Admin mutation: Manually revoke VIP status (admin only)
export const adminRevokeVIP = mutation({
  args: {
    targetPlayerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Check if current player is admin
    if (currentPlayer.role !== "admin") {
      throw new Error("Admin access required");
    }

    // Get target player
    const targetPlayer = await ctx.db.get(args.targetPlayerId);
    if (!targetPlayer) {
      throw new Error("Target player not found");
    }

    // Check if VIP was granted by subscription - cannot revoke
    if (targetPlayer.vipGrantedBySubscription) {
      throw new Error("Cannot revoke VIP granted through subscription. Player must cancel their subscription.");
    }

    const now = Date.now();

    // Revoke VIP
    await ctx.db.patch(args.targetPlayerId, {
      isVIP: false,
      vipExpiresAt: undefined,
      vipGrantedBySubscription: undefined,
      previousTheme: undefined,
      updatedAt: now,
    });

    // Remove VIP tag if it exists
    const existingTag = await ctx.db
      .query("playerTags")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.targetPlayerId))
      .first();

    if (existingTag && existingTag.tagText === "VIP") {
      await ctx.db.delete(existingTag._id);
    }

    return {
      success: true,
      message: "VIP status revoked",
    };
  },
});

// Create or update subscription (called by webhook)
export const upsertSubscription = internalMutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    canceledAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeSubscriptionId", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    const now = Date.now();
    
    // Grant or revoke VIP based on subscription status
    const shouldHaveVIP = args.status === "active" || args.status === "trialing";
    await ctx.scheduler.runAfter(0, internal.subscriptions.updatePlayerVIPStatus, {
      userId: args.userId,
      shouldHaveVIP,
      expiresAt: args.currentPeriodEnd,
    });

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status as any,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("subscriptions", {
        userId: args.userId,
        stripeCustomerId: args.stripeCustomerId,
        stripeSubscriptionId: args.stripeSubscriptionId,
        stripePriceId: args.stripePriceId,
        status: args.status as any,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        canceledAt: args.canceledAt,
        planName: QUICKBUCK_PLUS.name,
        amount: QUICKBUCK_PLUS.amount,
        currency: QUICKBUCK_PLUS.currency,
        interval: QUICKBUCK_PLUS.interval,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

// Update player VIP status based on subscription (called internally)
export const updatePlayerVIPStatus = internalMutation({
  args: {
    userId: v.string(),
    shouldHaveVIP: v.boolean(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    // Find user by Clerk userId (stored as tokenIdentifier in users table)
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("tokenIdentifier"), args.userId))
      .first();

    if (!user) {
      console.error(`User not found for userId: ${args.userId}`);
      return;
    }

    // Find player associated with this user
    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    if (!player) {
      console.error(`Player not found for user: ${user._id}`);
      return;
    }

    const now = Date.now();

    // Check if player already has a VIP tag
    const existingTag = await ctx.db
      .query("playerTags")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .first();

    if (args.shouldHaveVIP) {
      // Grant VIP status (mark as subscription-based)
      console.log(`Granting VIP to player ${player._id}`);
      await ctx.db.patch(player._id, {
        isVIP: true,
        vipExpiresAt: args.expiresAt,
        vipGrantedBySubscription: true,
        updatedAt: now,
      });

      // Create or update VIP tag
      if (existingTag) {
        // Update existing tag to VIP style
        await ctx.db.patch(existingTag._id, {
          tagText: "VIP",
          tagColor: "#FFD700", // Gold color
          usernameColor: "#FFD700",
          updatedAt: now,
        });
      } else {
        // Create new VIP tag
        await ctx.db.insert("playerTags", {
          playerId: player._id,
          tagText: "VIP",
          tagColor: "#FFD700", // Gold color
          usernameColor: "#FFD700",
          createdByAdminId: player._id, // System-created
          createdAt: now,
          updatedAt: now,
        });
      }
    } else {
      // Revoke VIP status and reset theme to default if needed
      console.log(`Revoking VIP from player ${player._id}`);
      await ctx.db.patch(player._id, {
        isVIP: false,
        vipExpiresAt: undefined,
        vipGrantedBySubscription: undefined,
        previousTheme: undefined,
        updatedAt: now,
      });

      // Remove VIP tag if it exists and was created by the system
      if (existingTag && existingTag.tagText === "VIP") {
        await ctx.db.delete(existingTag._id);
      }
      
      // Note: Theme reset happens on the frontend when user logs in and sees they lost VIP
      // The theme is stored in localStorage, not in the database
    }
  },
});

// Check for expired VIP subscriptions (called by cron)
export const checkExpiredVIPSubscriptions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all subscriptions that are past their end date but still marked active
    const expiredSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) => 
        q.and(
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "trialing")
          ),
          q.lt(q.field("currentPeriodEnd"), now)
        )
      )
      .collect();

    console.log(`Found ${expiredSubscriptions.length} expired VIP subscriptions to revoke`);

    for (const sub of expiredSubscriptions) {
      // Revoke VIP from the user
      await ctx.scheduler.runAfter(0, internal.subscriptions.updatePlayerVIPStatus, {
        userId: sub.userId,
        shouldHaveVIP: false,
        expiresAt: sub.currentPeriodEnd,
      });
    }

    return { revokedCount: expiredSubscriptions.length };
  },
});

// Create customer portal session for managing subscriptions
export const createCustomerPortalUrl = action({
  args: {
    userId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = getStripe();
    
    try {
      // Get user's subscription to find customer ID
      const subscription = await ctx.runQuery(api.subscriptions.getUserSubscription, {
        userId: args.userId,
      });

      if (!subscription) {
        throw new Error("No subscription found for user");
      }

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: args.returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      console.error("Error creating customer portal:", error);
      throw new Error(`Failed to create customer portal: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  },
});
