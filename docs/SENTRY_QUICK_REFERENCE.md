# Sentry Quick Reference Card

## Setup Checklist

- [ ] Add `VITE_SENTRY_DSN` to `.env.local`
- [ ] Add `SENTRY_DSN` to `.env.local`
- [ ] Restart development server
- [ ] Check browser console for "Sentry initialized" message

## Common Patterns

### Capture Exception in React
```typescript
import { useSentry } from "@/hooks/use-sentry";

const { handleError } = useSentry();
try {
  // code
} catch (error) {
  handleError(error as Error);
}
```

### Capture Message
```typescript
import { captureMessage } from "@/lib/sentry.client";

captureMessage("Payment completed", "info", { amount: 100 });
```

### Track User Action
```typescript
import { addBreadcrumb } from "@/lib/sentry.client";

addBreadcrumb("User clicked submit", { formId: "payment" });
```

### Set User Context
```typescript
import { setUserContext } from "@/lib/sentry.client";

setUserContext("user123", { email: "user@example.com" });
```

### Wrap Convex Query
```typescript
import { withSentryQuery } from "./sentry";

export const getUsers = query({
  handler: withSentryQuery(async (ctx) => {
    return await ctx.db.query("users").collect();
  }),
});
```

### Wrap Convex Mutation
```typescript
import { withSentryMutation } from "./sentry";

export const createUser = mutation({
  handler: withSentryMutation(async (ctx, args) => {
    return await ctx.db.insert("users", args);
  }),
});
```

## File Locations

| File | Purpose |
|------|---------|
| `app/lib/sentry.client.ts` | Client-side Sentry setup |
| `app/lib/sentry.server.ts` | Server-side Sentry setup |
| `convex/sentry.ts` | Convex-specific integration |
| `app/hooks/use-sentry.ts` | React hook for Sentry |
| `app/root.tsx` | Sentry initialization point |

## Environment Variables

```bash
VITE_SENTRY_DSN=https://303ff5d561ad3760624dffc84d1b07c7@o4510267706114048.ingest.us.sentry.io/4510267755134976
SENTRY_DSN=https://303ff5d561ad3760624dffc84d1b07c7@o4510267706114048.ingest.us.sentry.io/4510267755134976
```

## Dashboard

https://o4510267706114048.sentry.io

## Error Levels

- `fatal` - Critical errors
- `error` - Error conditions
- `warning` - Warning conditions
- `info` - Informational messages
- `debug` - Debug information

## Sampling Rates

| Setting | Dev | Prod | Purpose |
|---------|-----|------|---------|
| tracesSampleRate | 1.0 | 0.1 | % of transactions sent |
| replaysSessionSampleRate | 0.1 | 0.05 | % of sessions recorded |
| replaysOnErrorSampleRate | 1.0 | 1.0 | % of error sessions recorded |

## Testing

```typescript
// Test error capture
import { captureException } from "@/lib/sentry.client";
captureException(new Error("Test"));

// Test message capture
import { captureMessage } from "@/lib/sentry.client";
captureMessage("Test message");
```

## Documentation

- `docs/SENTRY_SETUP.md` - Complete setup guide
- `docs/SENTRY_EXAMPLES.md` - Code examples
- `docs/SENTRY_IMPLEMENTATION.md` - Implementation details

## Support

See `docs/SENTRY_SETUP.md` for troubleshooting section.
