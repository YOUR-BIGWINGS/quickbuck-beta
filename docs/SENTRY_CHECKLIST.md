# Sentry Implementation Checklist

## ✅ Installation Phase (COMPLETE)

- [x] Install `@sentry/react`
- [x] Install `@sentry/node`
- [x] Install `@sentry/tracing`
- [x] Install `@sentry/profiling-node`

## ✅ Configuration Phase (COMPLETE)

- [x] Create `app/lib/sentry.client.ts`
- [x] Create `app/lib/sentry.server.ts`
- [x] Create `convex/sentry.ts`
- [x] Initialize Sentry in `app/root.tsx`
- [x] Configure error boundary in `app/root.tsx`

## ✅ React Integration Phase (COMPLETE)

- [x] Create `app/hooks/use-sentry.ts`
- [x] Implement error boundary wrapper
- [x] Export helper functions (captureException, captureMessage, etc.)
- [x] Type-safe error handling

## ✅ Convex Integration Phase (COMPLETE)

- [x] Create Convex Sentry module
- [x] Implement `withSentryQuery()` wrapper
- [x] Implement `withSentryMutation()` wrapper
- [x] Error context tagging

## ✅ Documentation Phase (COMPLETE)

- [x] Create `docs/SENTRY_SETUP.md` - Setup & Configuration
- [x] Create `docs/SENTRY_EXAMPLES.md` - Code Examples
- [x] Create `docs/SENTRY_IMPLEMENTATION.md` - Implementation Details
- [x] Create `docs/SENTRY_QUICK_REFERENCE.md` - Quick Reference
- [x] Create `docs/SENTRY_ARCHITECTURE.md` - Architecture Overview
- [x] Create `SENTRY_INTEGRATION_COMPLETE.md` - Integration Summary
- [x] Create `.env.local.example` - Environment Template

## ⚠️ Configuration Phase (ACTION REQUIRED)

### Step 1: Add Environment Variables
- [ ] Copy `VITE_SENTRY_DSN` from this document to `.env.local`
- [ ] Copy `SENTRY_DSN` from this document to `.env.local`

```bash
# Add to .env.local
VITE_SENTRY_DSN=https://303ff5d561ad3760624dffc84d1b07c7@o4510267706114048.ingest.us.sentry.io/4510267755134976
SENTRY_DSN=https://303ff5d561ad3760624dffc84d1b07c7@o4510267706114048.ingest.us.sentry.io/4510267755134976
```

### Step 2: Restart Development Server
- [ ] Stop current dev server (Ctrl+C)
- [ ] Run `npm run dev`
- [ ] Check browser console for "Sentry initialized for client-side tracking"

## 🧪 Testing Phase (RECOMMENDED)

### Test Client-Side Sentry
- [ ] Open browser console
- [ ] Run: `throw new Error("Test Sentry")`
- [ ] Check Sentry dashboard within 10 seconds
- [ ] Confirm error appears in Issues

### Test Server-Side Sentry
- [ ] Create test query/mutation in Convex
- [ ] Deliberately cause an error
- [ ] Check Sentry dashboard
- [ ] Confirm server error captured

### Test Breadcrumbs
- [ ] Use `addBreadcrumb()` in a component
- [ ] Trigger an error
- [ ] Review breadcrumb trail in Sentry

### Test User Context
- [ ] After login, call `setUserContext(userId)`
- [ ] Trigger an error
- [ ] Verify user context in Sentry dashboard

## 📊 Monitoring Phase (ONGOING)

### Daily
- [ ] Check Sentry dashboard for new errors
- [ ] Review error trends
- [ ] Check for recurring issues

### Weekly
- [ ] Review error patterns
- [ ] Check performance metrics
- [ ] Set up/adjust alerts if needed
- [ ] Review breadcrumb trails for context

### Monthly
- [ ] Analyze error trends
- [ ] Optimize sampling rates if needed
- [ ] Review performance baselines
- [ ] Plan fixes for critical issues

## 🔧 Integration into Development Workflow

### When Creating Components
- [ ] Use `useSentry()` hook for error handling
- [ ] Add breadcrumbs for user actions
- [ ] Test error scenarios

### When Creating Convex Functions
- [ ] Wrap queries with `withSentryQuery()`
- [ ] Wrap mutations with `withSentryMutation()`
- [ ] Add error handling in try-catch blocks

### When Debugging
- [ ] Check Sentry dashboard first
- [ ] Review breadcrumbs for context
- [ ] Check user session data
- [ ] Review source maps for stack traces

## 📚 Documentation Reference

| Document | Purpose | Read When |
|----------|---------|-----------|
| SENTRY_QUICK_REFERENCE.md | Quick patterns | First setup |
| SENTRY_SETUP.md | Complete guide | Detailed questions |
| SENTRY_EXAMPLES.md | Code examples | Implementing features |
| SENTRY_ARCHITECTURE.md | System design | Understanding flow |
| SENTRY_IMPLEMENTATION.md | Implementation details | Deep dive needed |

## 🚀 Deployment Considerations

### Before Going to Production
- [ ] Verify DSN is configured correctly
- [ ] Reduce `tracesSampleRate` to 0.1 in `sentry.client.ts`
- [ ] Reduce `tracesSampleRate` to 0.1 in `sentry.server.ts`
- [ ] Reduce `replaysSessionSampleRate` to 0.05
- [ ] Enable error alerts in Sentry
- [ ] Test error capture in production environment

### Production Monitoring
- [ ] Set up Slack/email notifications
- [ ] Monitor error rates daily
- [ ] Review performance metrics
- [ ] Create runbooks for common errors

## 🐛 Troubleshooting Checklist

### If "DSN not configured" warning appears
- [ ] Check `.env.local` for VITE_SENTRY_DSN
- [ ] Check process.env for SENTRY_DSN
- [ ] Restart dev server
- [ ] Clear browser cache

### If errors don't appear in dashboard
- [ ] Verify DSN is correct
- [ ] Check browser network tab for Sentry requests
- [ ] Verify error actually occurred
- [ ] Wait 10-15 seconds for event processing
- [ ] Check Sentry project settings

### If performance is slow
- [ ] Reduce `tracesSampleRate` to 0.1
- [ ] Reduce `replaysSessionSampleRate` to 0.05
- [ ] Check breadcrumb limits
- [ ] Review integration settings

## 📞 Support Resources

- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Node Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry Dashboard](https://o4510267706114048.sentry.io)
- [Local Documentation](./docs/)

## 🎯 Success Criteria

### ✅ Setup Successful When:
1. Environment variables configured
2. Dev server starts without warnings
3. Browser console shows "Sentry initialized"
4. Test error appears in Sentry dashboard
5. Breadcrumbs are recorded

### ✅ Integration Complete When:
1. All errors are captured
2. Performance metrics visible
3. User context tracking works
4. Team can monitor errors
5. Documentation is accessible

---

**Status: READY FOR USE** ✅

All components installed and configured. 
DSN provided and ready to be added to `.env.local`.
Documentation complete and comprehensive.
Type checking passed with no errors.

Next step: Add environment variables to `.env.local` and restart dev server.
