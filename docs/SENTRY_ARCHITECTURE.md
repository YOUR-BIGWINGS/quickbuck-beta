# Sentry Integration Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Quickbuck v1b                           │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                    CLIENT SIDE (Browser)                  │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │            React Components                         │ │ │
│  │  │  • User Interactions                               │ │ │
│  │  │  • Form Submissions                                │ │ │
│  │  │  • API Calls                                       │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │         useSentry() Hook                            │ │ │
│  │  │  • handleError()                                   │ │ │
│  │  │  • trackMessage()                                  │ │ │
│  │  │  • trackAction()                                   │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │    sentry.client.ts                                │ │ │
│  │  │  • captureException()                              │ │ │
│  │  │  • captureMessage()                                │ │ │
│  │  │  • setUserContext()                                │ │ │
│  │  │  • addBreadcrumb()                                 │ │ │
│  │  │  • startSpan()                                     │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │   Sentry Error Boundary (root.tsx)                │ │ │
│  │  │  • Global Error Catching                           │ │ │
│  │  │  • Component Error Boundaries                      │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │      @sentry/react SDK                             │ │ │
│  │  │  • Performance Monitoring (BrowserTracing)        │ │ │
│  │  │  • 100% Error Capture                              │ │ │
│  │  │  • 10% Transaction Sampling (prod)                │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │      Environment Variable                          │ │ │
│  │  │   VITE_SENTRY_DSN = [Your DSN]                    │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  └───────────┼──────────────────────────────────────────────┘ │
│              │                                               │
│              │ HTTPS                                         │
│              │                                               │
└──────────────┼───────────────────────────────────────────────┘
               │
               │
        ┌──────▼──────────┐
        │ Sentry Platform │
        │ Ingest Endpoint │
        │                 │
        │ https://...     │
        │ ingest.us.      │
        │ sentry.io/...   │
        └──────┬──────────┘
               │
        ┌──────▼────────────────────────────┐
        │  Sentry Issues Dashboard           │
        │  https://o4510267706114048.       │
        │         sentry.io                 │
        │                                  │
        │  • Error Stream                  │
        │  • Performance Metrics           │
        │  • User Sessions                 │
        │  • Alerts & Notifications        │
        └────────────────────────────────────┘
```

## Server-Side Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SERVER SIDE (Convex)                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │               Convex Backend Functions                    │ │
│  │                                                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │         Queries & Mutations                         │ │ │
│  │  │  • User Management                                 │ │ │
│  │  │  • Portfolio Operations                            │ │ │
│  │  │  • Stock/Crypto Transactions                       │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │   withSentryQuery() / withSentryMutation()          │ │ │
│  │  │  • Automatic Error Catching                         │ │ │
│  │  │  • Operation Logging                                │ │ │
│  │  │  • Context Tagging                                  │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │    sentry.ts                                        │ │ │
│  │  │  • initializeSentryConvex()                         │ │ │
│  │  │  • captureException()                               │ │ │
│  │  │  • captureMessage()                                 │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │      @sentry/node SDK                              │ │ │
│  │  │  • HTTP Tracing                                    │ │ │
│  │  │  • Error Capturing                                  │ │ │
│  │  │  • 100% Error Sampling                              │ │ │
│  │  │  • 10% Transaction Sampling (prod)                │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  │           ▼                                              │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │      Environment Variable                          │ │ │
│  │  │   SENTRY_DSN = [Your DSN]                         │ │ │
│  │  └────────┬────────────────────────────────────────────┘ │ │
│  │           │                                              │ │
│  └───────────┼──────────────────────────────────────────────┘ │
│              │                                               │
│              │ HTTPS                                         │
│              │                                               │
└──────────────┼───────────────────────────────────────────────┘
               │
               └──→ [Sentry Platform] ──→ [Sentry Dashboard]
```

## Data Flow

### Error Capture Flow
```
Error Occurs
     │
     ▼
Caught by Sentry Integration
     │
     ├─→ Captured (if within sample rate)
     │
     ├─→ Context Added (user, breadcrumbs, tags)
     │
     ├─→ Source Maps Applied
     │
     ├─→ Batched with Other Events
     │
     ▼
Sent to Sentry Ingest Server
     │
     ▼
Processed & Indexed
     │
     ▼
Available in Dashboard
```

### Performance Monitoring Flow
```
HTTP Request / Database Query
     │
     ▼
Transaction Started
     │
     ├─→ Timing Captured
     ├─→ Status Recorded
     └─→ Context Added
     │
     ▼
Span Events Created
     │
     ├─→ Network latency
     ├─→ Database time
     └─→ Custom operations
     │
     ▼
Sample Rate Applied (10% prod, 100% dev)
     │
     ▼
Sent to Sentry (if sampled)
     │
     ▼
Performance Dashboard
```

## Integration Points

### React Component Error Handling
```
Component Code
       │
       ├─→ try/catch block ──→ captureException() ──→ Sentry
       │
       └─→ Unhandled error ──→ Error Boundary ──→ Sentry.withErrorBoundary()
```

### Convex Query/Mutation Handling
```
Query/Mutation Called
       │
       ├─→ withSentryQuery/Mutation() wrapper
       │
       ├─→ Execute function
       │
       ├─→ Success? ──→ captureMessage("debug")
       │
       └─→ Error? ──→ captureException() ──→ Sentry
```

### User Action Tracking
```
User Action (click, navigate, submit)
       │
       ├─→ addBreadcrumb()
       │
       └─→ Stored in Sentry Context
              │
              └─→ Attached to next error
```

## Environment Variable Flow

```
.env.local
    │
    ├─→ VITE_SENTRY_DSN ──→ import.meta.env ──→ sentry.client.ts
    │
    └─→ SENTRY_DSN ──→ process.env ──→ sentry.server.ts & convex/sentry.ts
```

## Error Resolution Flow

```
Error in Production
       │
       ▼
Captured by Sentry
       │
       ▼
Dashboard Notification
       │
       ├─→ Email Alert (if configured)
       ├─→ Slack Notification (if configured)
       └─→ In Sentry UI
       │
       ▼
Developer Reviews
       │
       ├─→ Stack Trace
       ├─→ Breadcrumbs
       ├─→ User Context
       └─→ Environment Info
       │
       ▼
Fix Applied
       │
       ▼
Monitor in Next Release
```

## Files & Responsibilities

```
app/
  root.tsx ─────────────────── Initialize & Wrap App
  lib/
    sentry.client.ts ───────── Client Configuration & Helpers
    sentry.server.ts ───────── Server Configuration & Helpers
  hooks/
    use-sentry.ts ──────────── React Hook for Components

convex/
  sentry.ts ──────────────────  Convex Integration & Wrappers

docs/
  SENTRY_SETUP.md ────────────  Setup Guide
  SENTRY_EXAMPLES.md ─────────  Code Examples
  SENTRY_IMPLEMENTATION.md ──  Implementation Details
  SENTRY_QUICK_REFERENCE.md ─  Quick Reference

.env.local.example ─────────── Environment Variables Template
SENTRY_INTEGRATION_COMPLETE.md  This Implementation Summary
```

---

**This architecture ensures:**
✅ Comprehensive error tracking
✅ Performance monitoring
✅ User context correlation
✅ Centralized configuration
✅ Easy to use throughout the app
