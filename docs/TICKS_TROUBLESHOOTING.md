# Fixing Ticks - Troubleshooting Guide

## Current Issue

Ticks stopped running. The last tick ran on 10/24 at 10:02 PM, and it's now 10/25 at 3:27 PM.

## Why This Happened

The Convex cron jobs (`convex/crons.ts`) may not be properly executing in this dev deployment. Even though Convex crons work fine on your other projects, this specific deployment might have had crons disabled or reset.

## Quick Solutions - Pick One

### ✅ Option 1: Manual Admin Dashboard (Recommended for Testing)

1. Navigate to `http://localhost:5173/admin/tick`
2. Click "Execute Tick" button
3. View tick results and history immediately

**Pros**: Quick, visual feedback, see all tick details  
**Cons**: Manual - need to click every time (or set up browser automation)

### ✅ Option 2: Run Local Scheduler (Recommended for Development)

```bash
node scripts/local-scheduler.js
```

This script:
- Runs in your terminal
- Executes a tick every 5 minutes automatically
- Works instantly
- Perfect for development and testing

**Pros**: Automatic, reliable, works immediately  
**Cons**: Must keep terminal open while developing

### ✅ Option 3: HTTP API Endpoint (Recommended for Production)

Set up an external scheduler to call:
```
POST https://exuberant-donkey-345.convex.cloud/api/tick
```

Options for external schedulers:
- **Vercel Cron** (if deploying to Vercel): Free and automatic
- **AWS Lambda + EventBridge**: Set up recurring schedule
- **Zapier/Integromat**: Schedule HTTP requests (paid)
- **External cron service**: Services like EasyCron or WebCron

### ✅ Option 4: Fix Convex Crons (Advanced)

If you want to get native Convex crons working again:

1. Check your Convex deployment settings:
   - Visit `https://dashboard.convex.dev`
   - Check if "Cron Jobs" are enabled for your deployment
   - If not, enable them (may require Pro plan)

2. Verify the deployment:
   ```bash
   cat .env.local | grep CONVEX_DEPLOYMENT
   ```
   Should show: `CONVEX_DEPLOYMENT=dev:exuberant-donkey-345`

3. Force redeploy:
   ```bash
   rm -rf convex/.convex
   npx convex dev --once
   ```

4. Check logs on dashboard for cron execution

## What We've Set Up

To resume ticks immediately while we troubleshoot:

1. **Manual trigger page**: `/admin/tick` - click to run ticks
2. **HTTP endpoint**: `/api/tick` - call via external services
3. **Local scheduler**: `scripts/local-scheduler.js` - run in terminal for auto ticks
4. **Tick history**: `/admin/tick` shows last 10 ticks with details

## Recommended: Combination Approach

For development, I recommend:

1. **Start local scheduler** in a terminal:
   ```bash
   npm run scheduler  # if we add this to package.json
   ```
   OR
   ```bash
   node scripts/local-scheduler.js
   ```

2. **Keep admin dashboard** bookmarked at `http://localhost:5173/admin/tick` for manual testing

3. **Use `/admin/tick`** to view tick history and verify ticks are running

## Next Steps

1. **Immediate**: Choose Option 1 or 2 above to get ticks running now
2. **Short term**: Run local scheduler while you develop
3. **Long term**: Investigate why Convex crons aren't working on this deployment and either:
   - Fix the deployment settings, OR
   - Commit to using HTTP endpoint with external scheduler

## Files Modified Today

- `convex/crons.ts` - Cron job definition (added logging)
- `convex/tick.ts` - Tick execution logic (added logging)
- `convex/http.ts` - Added `/api/tick` HTTP endpoint
- `app/routes/admin/tick.tsx` - Manual tick trigger dashboard
- `scripts/local-scheduler.js` - **NEW** - Local scheduler script

## Testing Ticks Are Working

1. Go to `/admin/tick`
2. Click "Execute Tick"
3. Should see:
   - "Tick #X Completed" (green box)
   - Bot purchases, stock updates, crypto updates
   - Tick appears in "Recent Ticks" list below

4. Wait 5 minutes and do it again - should see Tick #(X+1)

## Questions?

If ticks still aren't running:

1. Check `/admin/tick` - does it error when you click the button?
2. Check browser console for errors
3. Check Convex dashboard logs: https://dashboard.convex.dev/d/exuberant-donkey-345
4. Check if `node scripts/local-scheduler.js` shows "[TICK] Executing tick..." messages

Let me know what you find and we can debug further!
