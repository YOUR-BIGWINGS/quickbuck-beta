import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import crypto from "crypto";

// Ko-fi webhook endpoint
export const kofiWebhook = httpAction(async (ctx, request) => {
  try {
    const body = await request.text();
    const formData = new URLSearchParams(body);
    const data = formData.get("data");
    
    if (!data) {
      console.error("No data in Ko-fi webhook");
      return new Response("No data", { status: 400 });
    }
    
    // Parse Ko-fi data
    const kofiData = JSON.parse(data);
    
    console.log("Ko-fi webhook received:", kofiData.type);
    
    // Verify verification token if set
    const verificationToken = process.env.KOFI_VERIFICATION_TOKEN;
    if (verificationToken && kofiData.verification_token !== verificationToken) {
      console.error("Invalid Ko-fi verification token");
      return new Response("Invalid token", { status: 401 });
    }
    
    // Handle different Ko-fi event types
    switch (kofiData.type) {
      case "Subscription":
        await handleSubscription(ctx, kofiData);
        break;
      
      case "Subscription Payment":
        // Monthly renewal payment
        await handleSubscription(ctx, kofiData);
        break;
        
      case "Subscription Cancelled":
        await handleSubscriptionCancellation(ctx, kofiData);
        break;
        
      case "Donation":
        // One-time donation - could grant temporary premium access
        console.log("One-time donation received:", kofiData.amount);
        break;
        
      default:
        console.log(`Unhandled Ko-fi event type: ${kofiData.type}`);
    }
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Ko-fi webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

async function handleSubscription(ctx: any, kofiData: any) {
  try {
    const email = kofiData.email;
    const amount = parseFloat(kofiData.amount) * 100; // Convert to cents
    const tierName = kofiData.tier_name;
    const transactionId = kofiData.kofi_transaction_id;
    const isFirstPayment = kofiData.is_first_subscription_payment;
    
    if (!email) {
      console.error("[KO-FI] No email in webhook data");
      return;
    }
    
    // Find user by email in users table
    const user = await ctx.runQuery(async (ctx: any) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
    });
    
    if (!user) {
      console.error(`[KO-FI] ❌ No user found with email: ${email}. User must sign up with same email as Ko-fi.`);
      return;
    }
    
    // Get the Clerk user ID from tokenIdentifier
    const userId = user.tokenIdentifier;
    
    await ctx.runMutation(internal.subscriptions.upsertSubscription, {
      userId,
      kofiTransactionId: transactionId,
      email,
      amount: Math.round(amount),
      status: "active",
      tierName,
    });
    
    console.log(`[KO-FI] ✅ Subscription ${isFirstPayment ? 'created' : 'renewed'} for user ${userId} (${email})`);
  } catch (error) {
    console.error("[KO-FI] Error handling subscription:", error);
  }
}

async function handleSubscriptionCancellation(ctx: any, kofiData: any) {
  try {
    const email = kofiData.email;
    
    if (!email) {
      console.error("[KO-FI] No email in cancellation webhook");
      return;
    }
    
    // Find user by email
    const user = await ctx.runQuery(async (ctx: any) => {
      return await ctx.db
        .query("users")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .first();
    });
    
    if (!user) {
      console.error(`[KO-FI] No user found with email: ${email} for cancellation`);
      return;
    }
    
    const userId = user.tokenIdentifier;
    
    // Find and cancel the subscription
    const subscription = await ctx.runQuery(async (ctx: any) => {
      return await ctx.db
        .query("subscriptions")
        .withIndex("by_userId", (q: any) => q.eq("userId", userId))
        .first();
    });
    
    if (!subscription) {
      console.error(`[KO-FI] No subscription found for user ${userId}`);
      return;
    }
    
    // Cancel the subscription (mark it to end at current period)
    await ctx.runMutation(async (ctx: any, args: any) => {
      const sub = await ctx.db
        .query("subscriptions")
        .withIndex("by_userId", (q: any) => q.eq("userId", args.userId))
        .first();
      
      if (sub) {
        await ctx.db.patch(sub._id, {
          cancelAtPeriodEnd: true,
          canceledAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }, { userId });
    
    console.log(`[KO-FI] ⚠️ Subscription cancelled for user ${userId} (${email}), will expire at period end`);
  } catch (error) {
    console.error("[KO-FI] Error handling cancellation:", error);
  }
}
