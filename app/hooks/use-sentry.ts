import { useCallback } from "react";
import {
  captureException,
  captureMessage,
  addBreadcrumb,
} from "../lib/sentry.client";

/**
 * Hook to use Sentry in React components
 * Provides convenient methods to track errors and actions
 */
export function useSentry() {
  const handleError = useCallback(
    (error: Error, context?: Record<string, any>) => {
      captureException(error, context);
    },
    []
  );

  const trackMessage = useCallback(
    (
      message: string,
      level: "fatal" | "error" | "warning" | "info" | "debug" = "info",
      context?: Record<string, any>
    ) => {
      captureMessage(message, level, context);
    },
    []
  );

  const trackAction = useCallback(
    (actionName: string, data?: Record<string, any>) => {
      addBreadcrumb(actionName, data, "info");
    },
    []
  );

  return {
    handleError,
    trackMessage,
    trackAction,
  };
}

export default useSentry;
