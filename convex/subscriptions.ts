import { v } from "convex/values";
import { api } from "./_generated/api";
import { action, httpAction, mutation, query } from "./_generated/server";

// Payments/subscriptions are disabled for now. The functions below are
// lightweight stubs that return safe defaults so other parts of the app do
// not break while payments are removed.

export const getAvailablePlansQuery = query({
  handler: async () => {
    return { items: [], pagination: null };
  },
});

export const getAvailablePlans = action({
  handler: async () => {
    return { items: [], pagination: null };
  },
});

export const createCheckoutSession = action({
  args: {
    priceId: v.string(),
  },
  handler: async () => {
    // Payments are disabled; return an informative error to callers.
    throw new Error("Payments are currently disabled");
  },
});

export const checkUserSubscriptionStatus = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async () => {
    // Default to having access while subscription features are disabled.
    return { hasActiveSubscription: true };
  },
});

export const checkUserSubscriptionStatusByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async () => {
    return { hasActiveSubscription: true };
  },
});

export const fetchUserSubscription = query({
  handler: async () => {
    return null;
  },
});

export const handleWebhookEvent = mutation({
  args: { body: v.any() },
  handler: async () => {
    // No-op while webhooks are disabled
    return { ok: true };
  },
});

export const paymentWebhook = httpAction(async () => {
  // Payments/webhooks are disabled.
  return new Response(JSON.stringify({ message: "Payments disabled" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

export const createCustomerPortalUrl = action({
  handler: async () => {
    throw new Error("Payments and customer portal are disabled");
  },
});
