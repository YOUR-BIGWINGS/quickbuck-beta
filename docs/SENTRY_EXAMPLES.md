/**
 * Example usage of Sentry throughout the application
 * This file demonstrates common patterns for error tracking and monitoring
 */

// ============================================================================
// CLIENT-SIDE EXAMPLES (React components)
// ============================================================================

// Example 1: Using the useSentry hook in a component
import { useSentry } from "@/hooks/use-sentry";

export function PaymentForm() {
  const { handleError, trackMessage, trackAction } = useSentry();

  const handlePayment = async () => {
    try {
      trackAction("payment_initiated", { amount: 100 });

      const response = await fetch("/api/payment", {
        method: "POST",
        body: JSON.stringify({ amount: 100 }),
      });

      if (!response.ok) {
        throw new Error(`Payment failed: ${response.statusText}`);
      }

      trackMessage("Payment successful", "info", { amount: 100 });
    } catch (error) {
      handleError(error as Error, {
        component: "PaymentForm",
        action: "handlePayment",
      });
    }
  };

  return <button onClick={handlePayment}>Pay Now</button>;
}

// Example 2: Direct Sentry client usage
import {
  captureException,
  captureMessage,
  setUserContext,
  addBreadcrumb,
} from "@/lib/sentry.client";

export function AuthComponent() {
  const handleLogin = async (email: string, password: string) => {
    try {
      addBreadcrumb("Login attempt", { email });

      const response = await fetch("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // Set user context after successful authentication
      if (data.userId) {
        setUserContext(data.userId, { email });
        captureMessage("User logged in", "info");
      }
    } catch (error) {
      captureException(error as Error, {
        location: "AuthComponent.handleLogin",
      });
    }
  };
}

// ============================================================================
// SERVER-SIDE EXAMPLES (Convex backend)
// ============================================================================

// Example 3: Using Sentry wrappers in Convex queries
import { query } from "./_generated/server";
import { withSentryQuery } from "./sentry";

export const getUser = query({
  handler: withSentryQuery(async (ctx) => {
    const user = await ctx.db.query("users").first();
    return user;
  }, { name: "getUser" }),
});

// Example 4: Using Sentry wrappers in Convex mutations
import { mutation } from "./_generated/server";
import { withSentryMutation, captureException } from "./sentry";

export const updateUserProfile = mutation({
  handler: withSentryMutation(
    async (ctx, args) => {
      try {
        const result = await ctx.db.patch(args.userId, {
          name: args.name,
          email: args.email,
        });
        return result;
      } catch (error) {
        captureException(error as Error, {
          mutation: "updateUserProfile",
          userId: args.userId,
        });
        throw error;
      }
    },
    { name: "updateUserProfile" }
  ),
});

// Example 5: Manual error capturing in Convex
import { captureMessage } from "./sentry";

export const complexQuery = query({
  handler: async (ctx) => {
    const startTime = Date.now();
    captureMessage("Complex query started", "debug");

    try {
      // your complex logic
      const result = await ctx.db.query("complexData").collect();
      const duration = Date.now() - startTime;

      captureMessage(`Complex query completed in ${duration}ms`, "info", {
        duration,
        resultCount: result.length,
      });

      return result;
    } catch (error) {
      captureMessage(`Complex query failed`, "error");
      throw error;
    }
  },
});

// ============================================================================
// TESTING SENTRY
// ============================================================================

// Example 6: Testing Sentry setup (client)
export function SentryTestComponent() {
  const handleTestError = () => {
    try {
      throw new Error("Test error from React component");
    } catch (error) {
      captureException(error as Error, { test: true });
    }
  };

  const handleTestMessage = () => {
    captureMessage("Test message from React component", "info", {
      test: true,
    });
  };

  return (
    <div>
      <button onClick={handleTestError}>Test Sentry Error</button>
      <button onClick={handleTestMessage}>Test Sentry Message</button>
    </div>
  );
}

// Example 7: Testing Sentry setup (server)
// import { captureMessage, captureException } from "./sentry";
//
// export const testSentryQuery = query({
//   handler: async (ctx) => {
//     captureMessage("Test message from Convex", "info", { test: true });
//
//     try {
//       throw new Error("Test error from Convex");
//     } catch (error) {
//       captureException(error as Error, { test: true });
//     }
//
//     return { success: true };
//   },
// });
