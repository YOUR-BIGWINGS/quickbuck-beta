# Stock Price Update Fix - Cron Jobs Not Running

## Problem Identified

Your stock prices stopped updating on **10/25/2025 at 4:42:21 PM**. Today is **10/27/2025 at 10:55 AM** (42+ hours with no updates).

**Root Cause**: Convex cron jobs **do NOT run automatically in dev deployments** (`dev:exuberant-donkey-345`). They only run in production deployments.

## Solution Options

### ✅ Option 1: Use Local Scheduler (RECOMMENDED FOR DEVELOPMENT)

Run the local scheduler script in a separate terminal while developing:

```bash
node scripts/local-scheduler.js
```

This will:
- Automatically trigger a tick every 5 minutes via HTTP endpoint
- Update stock prices, crypto prices, and run bot purchases
- Show you real-time logs of each tick execution
- Work immediately without any Convex configuration changes

**Keep this running in a terminal tab while you develop!**

### ✅ Option 2: Manual Tick via Admin Dashboard

1. Start your dev server if not running:
   ```bash
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/admin/tick`

3. Click **"Execute Tick"** button to manually trigger a price update

4. You'll see:
   - Tick number
   - Bot purchases made
   - Stock price updates
   - Crypto price updates
   - Recent tick history

**Use this when you want to manually control when ticks happen during testing.**

### ✅ Option 3: Deploy to Production (FOR PRODUCTION USE)

To get automatic cron jobs working:

1. Deploy to your production deployment:
   ```bash
   npx convex deploy --prod
   ```

2. Update your production environment variables to use the prod URL:
   ```
   VITE_CONVEX_URL=https://dependable-goose-226.convex.cloud
   ```

3. Crons will now run automatically every 5 minutes in production

**⚠️ Only do this when ready to go live!**

### ✅ Option 4: Use HTTP Endpoint with External Scheduler

Set up a cron service to call your HTTP endpoint:

**Endpoint**: `POST https://exuberant-donkey-345.convex.cloud/api/tick`

Options:
- **GitHub Actions** (free): Create a workflow that runs every 5 minutes
- **EasyCron** (free tier): Schedule HTTP POST requests
- **Render Cron Jobs** (free): If deploying frontend to Render
- **Vercel Cron** (free): If deploying frontend to Vercel

Example GitHub Actions workflow (`.github/workflows/tick.yml`):
```yaml
name: Tick Scheduler
on:
  schedule:
    - cron: '*/5 * * * *' # Every 5 minutes
  workflow_dispatch: # Allow manual trigger

jobs:
  tick:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Tick
        run: |
          curl -X POST https://exuberant-donkey-345.convex.cloud/api/tick
```

## Immediate Action Required

**Right now, to get your stock prices updating again:**

1. Open a new terminal
2. Run: `node scripts/local-scheduler.js`
3. Leave it running while you develop
4. Stock prices will update every 5 minutes automatically

**To verify it's working:**

1. Wait 5 minutes after starting the scheduler
2. Check your admin dashboard at `/admin/tick`
3. You should see new ticks appearing in the "Recent Ticks" section
4. Stock prices should be different from before

## Why This Happened

Convex has two deployment types:
- **Dev deployments** (`dev:exuberant-donkey-345`): For development, crons are **disabled**
- **Prod deployments** (`prod:dependable-goose-226`): For production, crons are **enabled**

This is intentional to prevent dev environments from consuming resources when not actively being used.

## Files Modified

- ✅ `convex/crons.ts` - Cron job configuration (already correct)
- ✅ `convex/tick.ts` - Tick execution logic (already correct)
- ✅ `convex/http.ts` - HTTP endpoint for external triggers (already exists)
- ✅ `scripts/local-scheduler.js` - Local scheduler script (already exists)
- ✅ `scripts/test-tick.js` - **NEW** - Test script to verify ticks work
- ✅ `app/routes/admin/tick.tsx` - Admin dashboard (already exists)

## Testing Steps

1. **Test manual tick execution:**
   ```bash
   node scripts/test-tick.js
   ```
   This will trigger one tick and show you the results.

2. **Start local scheduler:**
   ```bash
   node scripts/local-scheduler.js
   ```
   Keep this running - it will execute ticks every 5 minutes.

3. **Monitor via admin dashboard:**
   - Go to `http://localhost:5173/admin/tick`
   - Watch the "Recent Ticks" section populate every 5 minutes

4. **Check stock prices:**
   - Go to `http://localhost:5173/stocks`
   - Prices should be updating and showing green/red indicators

## Troubleshooting

### Scheduler says "Error triggering tick"
- Make sure Convex is running: `npx convex dev`
- Check `.env.local` has correct `VITE_CONVEX_URL`

### Admin dashboard shows no ticks
- Click "Execute Tick" button to manually trigger one
- If that fails, check browser console for errors

### Stock prices still not changing
- Check the tick history shows `stockUpdates > 0`
- Verify stocks have valid prices in the database
- Check Convex dashboard logs for errors

## Summary

**For Development (now):**
- Run `node scripts/local-scheduler.js` in a terminal tab
- Use `/admin/tick` dashboard to monitor

**For Production (later):**
- Deploy to prod: `npx convex deploy --prod`
- Crons will run automatically

---

**Current Status**: ✅ Solution implemented, ready to test
**Next Step**: Run `node scripts/local-scheduler.js` to start automatic updates
