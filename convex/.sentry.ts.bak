import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry for Convex backend
 * Call this in your Convex functions to enable error tracking
 */
export function initializeSentryConvex() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.NODE_ENV || "development";
  const isDevelopment = environment === "development";

  if (!dsn) {
    console.warn(
      "Sentry DSN not configured. Please set SENTRY_DSN environment variable."
    );
    return;
  }

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,
    sampleRate: 1.0,
    debug: isDevelopment,
    integrations: [],
  });

  console.log("Sentry initialized for Convex");
}

/**
 * Wrapper for Convex queries with Sentry integration
 */
export function withSentryQuery<T>(
  handler: (ctx: any) => Promise<T>,
  options?: { name?: string }
) {
  return async (ctx: any) => {
    const transactionName = options?.name || handler.name || "convex_query";

    try {
      const result = await handler(ctx);
      Sentry.captureMessage(`Query executed: ${transactionName}`, "debug");
      return result;
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          type: "convex_query",
          name: transactionName,
        },
      });
      throw error;
    }
  };
}

/**
 * Wrapper for Convex mutations with Sentry integration
 */
export function withSentryMutation<T>(
  handler: (ctx: any, args: any) => Promise<T>,
  options?: { name?: string }
) {
  return async (ctx: any, args: any) => {
    const transactionName = options?.name || handler.name || "convex_mutation";

    try {
      const result = await handler(ctx, args);
      Sentry.captureMessage(`Mutation executed: ${transactionName}`, "debug");
      return result;
    } catch (error) {
      Sentry.captureException(error, {
        tags: {
          type: "convex_mutation",
          name: transactionName,
        },
      });
      throw error;
    }
  };
}

/**
 * Capture an exception in Sentry from Convex
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Capture a message in Sentry from Convex
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, any>
) {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
    }
    Sentry.captureMessage(message, level);
  });
}

export default Sentry;
