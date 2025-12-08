import { v } from "convex/values";
import { httpAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

// Stripe webhook endpoint - handles subscription events
export const stripeWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await request.text();
    
    // Verify webhook signature for security
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(
      `Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`,
      { status: 400 }
    );
  }

  // Check if event already processed (idempotency)
  const existingEvent = await ctx.runQuery(
    (async (ctx: any, args: any) => {
      return await ctx.db
        .query("webhookEvents")
        .withIndex("by_stripeEventId", (q: any) => q.eq("stripeEventId", args.eventId))
        .first();
    }) as any,
    { eventId: event.id }
  );

  if (existingEvent) {
    return new Response(JSON.stringify({ received: true, cached: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Log webhook event
  await ctx.runMutation(
    (async (ctx: any, args: any) => {
      await ctx.db.insert("webhookEvents", {
        type: args.type,
        stripeEventId: args.eventId,
        data: args.data,
        processed: false,
        createdAt: Date.now(),
      });
    }) as any,
    {
      type: event.type,
      eventId: event.id,
      data: event.data.object,
    }
  );

  // Handle different event types
  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(ctx, event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(ctx, event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(ctx, event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(ctx, event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(ctx, event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await ctx.runMutation(
      (async (ctx: any, args: any) => {
        const event = await ctx.db
          .query("webhookEvents")
          .withIndex("by_stripeEventId", (q: any) => q.eq("stripeEventId", args.eventId))
          .first();
        if (event) {
          await ctx.db.patch(event._id, { processed: true });
        }
      }) as any,
      { eventId: event.id }
    );

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return new Response(
      `Webhook processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
});

// Handle successful checkout session (when user first subscribes)
async function handleCheckoutSessionCompleted(ctx: any, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  
  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  console.log(`Checkout session completed for user: ${userId}, subscription: ${session.subscription}`);
  // The subscription events will handle the actual VIP granting
}

// Handle subscription creation or update
async function handleSubscriptionUpdate(ctx: any, subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) {
    console.error("No userId in subscription metadata");
    return;
  }

  const currentPeriodStart = (subscription as any).current_period_start || (subscription as any).currentPeriodStart;
  const currentPeriodEnd = (subscription as any).current_period_end || (subscription as any).currentPeriodEnd;
  const cancelAtPeriodEnd = (subscription as any).cancel_at_period_end !== undefined ? (subscription as any).cancel_at_period_end : (subscription as any).cancelAtPeriodEnd;
  const canceledAt = (subscription as any).canceled_at || (subscription as any).canceledAt;

  await ctx.runMutation(internal.subscriptions.upsertSubscription, {
    userId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: currentPeriodStart * 1000, // Convert to ms
    currentPeriodEnd: currentPeriodEnd * 1000, // Convert to ms
    cancelAtPeriodEnd,
    canceledAt: canceledAt ? canceledAt * 1000 : undefined,
  });
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(ctx: any, subscription: Stripe.Subscription) {
  const currentPeriodStart = (subscription as any).current_period_start || (subscription as any).currentPeriodStart;
  const currentPeriodEnd = (subscription as any).current_period_end || (subscription as any).currentPeriodEnd;

  await ctx.runMutation(internal.subscriptions.upsertSubscription, {
    userId: subscription.metadata.userId,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    status: "canceled",
    currentPeriodStart: currentPeriodStart * 1000,
    currentPeriodEnd: currentPeriodEnd * 1000,
    cancelAtPeriodEnd: true,
    canceledAt: Date.now(),
  });
}

// Handle successful payment
async function handleInvoicePaymentSucceeded(ctx: any, invoice: Stripe.Invoice) {
  console.log(`Payment succeeded for invoice: ${invoice.id}`);
  // Subscription will be updated via subscription.updated event
}

// Handle failed payment
async function handleInvoicePaymentFailed(ctx: any, invoice: Stripe.Invoice) {
  console.error(`Payment failed for invoice: ${invoice.id}`);
  // Could send notification to user here
}




