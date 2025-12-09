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
  const email = kofiData.email;
  const amount = parseFloat(kofiData.amount) * 100; // Convert to cents
  const tierName = kofiData.tier_name;
  const transactionId = kofiData.kofi_transaction_id;
  const isFirstPayment = kofiData.is_first_subscription_payment;
  
  // Find user by email in users table
  const user = await ctx.runQuery(async (ctx: any) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .first();
  });
  
  if (!user) {
    console.error(`No user found with email: ${email}. User must sign up with same email as Ko-fi.`);
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
  
  console.log(`Ko-fi subscription ${isFirstPayment ? 'created' : 'renewed'} for user ${userId} (${email})`);
}
