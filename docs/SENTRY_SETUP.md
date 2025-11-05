# Sentry Integration Configuration

## Environment Variables

Create a `.env.local` file in the root of your project with the following variables:

### Client-side Sentry

```
VITE_SENTRY_DSN=https://303ff5d561ad3760624dffc84d1b07c7@o4510267706114048.ingest.us.sentry.io/4510267755134976
```

### Server-side Sentry (for Convex)

```
SENTRY_DSN=https://303ff5d561ad3760624dffc84d1b07c7@o4510267706114048.ingest.us.sentry.io/4510267755134976
```

## Features Enabled

✅ Error tracking (client and server)
✅ Performance monitoring (with sampling)
✅ Breadcrumbs for user action tracking
✅ Source maps for better error reporting
✅ Logging integration
✅ SSR-compatible initialization (fixed in v1.1)

## Production Configuration

For production deployments, consider adjusting these sampling rates in `app/lib/sentry.client.ts` and `app/lib/sentry.server.ts`:

- `tracesSampleRate`: Set to 0.1 (10%) to reduce overhead
- `replaysSessionSampleRate`: Set to 0.05 (5%) to reduce session replay storage
- `replaysOnErrorSampleRate`: Keep at 1.0 to capture all errors

## Usage

### Client-side (React)

```typescript
import {
  captureException,
  captureMessage,
  setUserContext,
  addBreadcrumb,
} from "@/lib/sentry.client";

// Capture exceptions
try {
  // your code
} catch (error) {
  captureException(error as Error, { context: "payment_processing" });
}

// Capture messages
captureMessage("User logged in", "info", { userId: "123" });

// Set user context (do this after authentication)
setUserContext("user-123", { email: "user@example.com" });

// Track user actions
addBreadcrumb("User clicked button", { buttonId: "submit" }, "info");
```

### Server-side (Convex)

```typescript
import { captureException, captureMessage } from "../sentry";

export const myQuery = query({
  handler: async (ctx) => {
    try {
      // your query logic
    } catch (error) {
      captureException(error as Error, { queryName: "myQuery" });
      throw error;
    }
  },
});
```

### With Wrappers (Recommended for Convex)

```typescript
import { query, mutation } from "./_generated/server";
import { withSentryQuery, withSentryMutation } from "./sentry";

export const myQuery = query({
  handler: withSentryQuery(async (ctx) => {
    // your query logic
    return result;
  }),
});

export const myMutation = mutation({
  handler: withSentryMutation(async (ctx, args) => {
    // your mutation logic
    return result;
  }),
});
```

## Monitoring Dashboard

Visit https://o4510267706114048.sentry.io to access your Sentry dashboard where you can:

- View all captured errors and exceptions
- Monitor performance metrics
- Review session replays
- Set up alerts for critical errors
- View breadcrumb trails for debugging

## Testing Sentry

To test that Sentry is working, you can manually trigger an error:

### Client-side test:

```typescript
import { captureException } from "@/lib/sentry.client";

captureException(new Error("Test error from Sentry client"), {
  testMode: true,
});
```

### Server-side test:

```typescript
import { captureException } from "./sentry";

captureException(new Error("Test error from Sentry server"), {
  testMode: true,
});
```

## Sampling Rates Explanation

- **tracesSampleRate**: Controls what percentage of transactions are sent to Sentry for performance monitoring
  - Development: 1.0 (100%) - capture everything for debugging
  - Production: 0.1 (10%) - balance between data and cost
  
- **replaysSessionSampleRate**: Percentage of sessions that have their replays recorded
  - Default: 0.1 (10%)
  
- **replaysOnErrorSampleRate**: Percentage of sessions with errors that have replays recorded
  - Default: 1.0 (100%)

## Troubleshooting

### DSN not configured warning

If you see "Sentry DSN not configured" warning:
1. Check that `VITE_SENTRY_DSN` is set in `.env.local` for client
2. Check that `SENTRY_DSN` is set in environment variables for server
3. Restart the development server

### Errors not showing in Sentry dashboard

- Verify your DSN is correct
- Check browser console for any Sentry initialization errors
- Ensure the error actually occurred (check if it was caught by try-catch)
- Wait a few seconds for the event to be sent (Sentry batches events)

### Performance issues

If you notice performance degradation:
- Reduce `tracesSampleRate` in production
- Disable session replay for non-authenticated users
- Adjust `replaysSessionSampleRate`

## References

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node Documentation](https://docs.sentry.io/platforms/node/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
