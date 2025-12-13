import * as Sentry from "@sentry/react";

/**
 * Initialize Sentry for client-side error tracking and performance monitoring
 * This should be called as early as possible in your application
 */
export function initializeSentryClient() {
  // Only run on client side
  if (typeof window === "undefined") {
    return;
  }
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.MODE;
  const isDevelopment = environment === "development";

  if (!dsn) {
    console.warn(
      "Sentry DSN not configured. Please set VITE_SENTRY_DSN environment variable."
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
    // Attach stack traces to all messages
    attachStacktrace: true,
  });

  console.log("Sentry initialized for client-side tracking");
}

/**
 * Capture an exception in Sentry
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
 * Capture a message in Sentry
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
 * Set user context for Sentry
 */
export function setUserContext(userId: string, userData?: Record<string, any>) {
  Sentry.setUser({
    id: userId,
    ...userData,
  });
}

/**
 * Clear user context
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for tracking user actions
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
