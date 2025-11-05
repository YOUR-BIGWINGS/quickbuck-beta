import * as Sentry from "@sentry/node";

/**
 * Initialize Sentry for server-side error tracking and performance monitoring
 * This should be called as early as possible in your server startup
 */
export function initializeSentryServer() {
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
    // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring
    // We recommend adjusting this value in production (e.g., 0.1 for 10%)
    tracesSampleRate: isDevelopment ? 1.0 : 0.1,
    // Set sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,
    // Enable debug mode in development
    debug: isDevelopment,
  });

  console.log("Sentry initialized for server-side tracking");
}

/**
 * Capture an exception on the server
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
 * Capture a message on the server
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

/**
 * Add breadcrumb for tracking server-side actions
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: "fatal" | "error" | "warning" | "info" | "debug" = "info"
) {
  Sentry.addBreadcrumb({
    message,
    data,
    level,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a manual span for performance monitoring
 */
export function startSpan(name: string) {
  Sentry.captureMessage(`Starting operation: ${name}`, "debug");
}

export default Sentry;
