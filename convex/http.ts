import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const chat = httpAction(async (ctx, req) => {
  // Extract the `messages` from the body of the request
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o"),
    messages,
    async onFinish({ text }) {
      // implement your own logic here, e.g. for storing messages
      // or recording token usage
      console.log(text);
    },
  });

  // Respond with the stream
  return result.toDataStreamResponse({
    headers: {
      "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
      Vary: "origin",
    },
  });
});

const http = httpRouter();

http.route({
  path: "/api/chat",
  method: "POST",
  handler: chat,
});

http.route({
  path: "/api/chat",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

http.route({
  path: "/api/auth/webhook",
  method: "POST",
  handler: httpAction(async (_, request) => {
    // Make sure the necessary headers are present
    // for this to be a valid pre-flight request
    const headers = request.headers;
    if (
      headers.get("Origin") !== null &&
      headers.get("Access-Control-Request-Method") !== null &&
      headers.get("Access-Control-Request-Headers") !== null
    ) {
      return new Response(null, {
        headers: new Headers({
          "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:5173",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Max-Age": "86400",
        }),
      });
    } else {
      return new Response();
    }
  }),
});

// Stripe webhook endpoint for subscription events
// Import at top level for proper typing
import { stripeWebhook } from "./stripeWebhook";
http.route({
  path: "/api/webhooks/stripe",
  method: "POST",
  handler: stripeWebhook,
});

// Tick endpoint - can be called by external scheduler
http.route({
  path: "/api/tick",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Call the internal tick action
      const result = await ctx.runAction(internal.tick.executeTick);
      
      return new Response(JSON.stringify({
        success: true,
        data: result,
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  }),
});

// Migration endpoint - for fixing data issues
http.route({
  path: "/api/migrations/fix-production-costs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const result = await ctx.runMutation(internal.migrations.fixMissingProductionCostPercentage);
      
      return new Response(JSON.stringify({
        success: true,
        data: result,
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }
  }),
});

// Log that routes are configured
console.log("HTTP routes configured");

// Convex expects the router to be the default export of `convex/http.js`.
export default http;
