# Maintenance Mode - Step-by-Step Implementation Guide

## Step 1: Regenerate Convex API Types

```bash
convex dev
```

**What to expect:**
- Convex dev server starts
- You should see "Types generated successfully" or similar message
- New types available in `convex/_generated/api`
- Error messages about missing route types in React Router (this is normal)

**If this fails:**
- Make sure you're in the project root directory
- Check that `convex.config.ts` exists
- Try: `npm install` then `convex dev` again

---

## Step 2: Apply Code Changes

Open these 3 files and make changes (see `MAINTENANCE_MODE_CODE_CHANGES.md` for exact code):

### File A: `app/routes/admin/maintenance.tsx`

**Change 1:** Add import
- Line ~6: Uncomment `import { api } from "../../../convex/_generated/api";`

**Change 2:** Uncomment API hooks  
- Lines ~19-22: Uncomment the three `useQuery` and `useMutation` lines

**Change 3:** Wire enable button
- Line ~51: Uncomment `await enableMaintenance({ message, reason });`

**Change 4:** Wire disable button
- Line ~65: Uncomment `await disableMaintenance();`

**Change 5:** Update status display
- Lines ~107-116: Replace "TODO - Fetch from API" with actual status code

### File B: `app/routes/maintenance.tsx`

**Change 1:** Update imports
- Line ~1-3: Replace `import { useMemo }` with `import { useQuery }`
- Add: `import { api } from "../../convex/_generated/api";`

**Change 2:** Replace useMemo
- Lines ~5-11: Replace entire `useMemo` block with `const maintenanceStatus = useQuery(api.maintenance.getMaintenanceStatus);`

### File C: `app/components/maintenance-check.tsx`

**Change 1:** Uncomment everything
- Line ~7: Add import: `import { api } from "../../convex/_generated/api";`
- Lines ~14-18: Uncomment all three query lines
- Lines ~20-22: Uncomment useEffect hook

---

## Step 3: Verify Compilation

```bash
npm run type-check
```

**Expected result:** No errors

**If errors:**
- "Cannot find module" → Make sure imports are correct
- "X is not defined" → Check you uncommented the line
- "Type mismatch" → See exact code in `MAINTENANCE_MODE_CODE_CHANGES.md`

---

## Step 4: Start Development Server

```bash
npm run dev
```

**Expected result:**
- Dev server starts on http://localhost:5173 (or shown port)
- No console errors about maintenance
- Can navigate to site normally

**If it fails:**
- Check previous step completed (type-check passed)
- Try: Kill server, run `npm run dev` again
- Check all edits were saved (look at changed files)

---

## Step 5: Test Basic Functionality

### Test 1: Admin Can Access Control Panel

1. Make sure you're logged in as admin user
2. Navigate to: `http://localhost:5173/admin/maintenance`
3. **Expected**: See control panel with "Enable Maintenance" button
4. **If error**: Check you're actually logged in as admin

### Test 2: Enable Maintenance Mode

1. On the admin panel, enter test message: "Testing maintenance"
2. Enter reason: "Feature testing"
3. Click "Enable Maintenance"
4. **Expected**: See success message "Maintenance mode enabled"
5. **Expected**: Status updates to show "ENABLED"

### Test 3: Non-Admin Sees Maintenance Page

1. Open new private/incognito window
2. Log in as non-admin user (or mod)
3. Navigate to: `http://localhost:5173/dashboard`
4. **Expected**: Redirected to `http://localhost:5173/maintenance`
5. **Expected**: See maintenance message you entered

### Test 4: Verify Message Displays Correctly

1. On maintenance page, verify:
   - [ ] Header says "Maintenance in Progress"
   - [ ] Message shows your custom text
   - [ ] Timestamp shows when started
   - [ ] Reason shows "Feature testing"

### Test 5: Admin Can Still Access Dashboard

1. In admin window (first window), refresh dashboard
2. **Expected**: Dashboard loads normally
3. **Expected**: See sidebar and normal content
4. **Note**: Admin is NOT redirected even though maintenance is on

### Test 6: Disable Maintenance Mode

1. On admin panel, click "Disable Maintenance"
2. **Expected**: See success message
3. **Expected**: Status updates to "DISABLED"

### Test 7: Non-Admin Can Access Again

1. In non-admin window, refresh page
2. **Expected**: Now redirected to dashboard instead of maintenance
3. **Expected**: Can access dashboard normally

### Test 8: Verify Mods Cannot Access Admin Panel

1. Log in as mod user
2. Try to navigate directly to: `http://localhost:5173/admin/maintenance`
3. **Expected**: Either redirected or get "not authorized" message
4. **Note**: Mods should NOT be able to access this panel

---

## Troubleshooting

### Error: "Cannot find module 'api.maintenance'"

**Cause:** Convex types not regenerated yet

**Solution:**
```bash
# Kill dev server (Ctrl+C)
convex dev
# Wait for completion, then start dev server again
npm run dev
```

### Error: "Route type not found '+types/admin-maintenance'"

**Cause:** React Router hasn't generated route type definitions

**Solution:**
- This often resolves on its own after dev server restart
- If persists: Delete `.react-router` folder and restart dev server
- If still persists: May need to reload browser

### Redirect not working (Non-admin still sees dashboard)

**Cause:** MaintenanceCheck component not properly loaded

**Solution:**
- Verify MaintenanceCheck import in `app/routes/dashboard/layout.tsx`
- Verify maintenance is actually enabled (check admin panel status)
- Check browser console for errors
- Try full page reload (Cmd+Shift+R or Ctrl+Shift+R)

### Buttons don't work on admin panel

**Cause:** API mutations not connected

**Solution:**
- Verify mutations are uncommented in `admin/maintenance.tsx`
- Check console for error messages
- Verify logged-in user is admin role

### Can't log in / Getting permission errors

**Cause:** User might not have admin role

**Solution:**
- Use actual admin account (typically created during setup)
- Check Convex dashboard to verify user role is "admin"
- Create admin user if needed

---

## If All Tests Pass ✅

You're done! Maintenance mode is fully operational.

### Quick Recap of What You Have

✅ Admin-only control panel at `/admin/maintenance`  
✅ Public maintenance page at `/maintenance`  
✅ Auto-redirect for non-admins when enabled  
✅ Admin bypass (admins can access normally)  
✅ Mod exclusion (mods cannot manage maintenance)  
✅ Custom messages, timestamps, and reasons  

### Next Steps

1. **Deploy to production** - Feature is production-ready
2. **Create runbook** - Document how/when to enable maintenance
3. **Train admins** - Show them how to use the feature
4. **Consider enhancements** - Scheduled maintenance, notifications, etc.

---

## Testing Checklist

Keep this handy during testing:

- [ ] convex dev completed successfully
- [ ] npm run type-check passes
- [ ] npm run dev starts without errors
- [ ] Admin can access /admin/maintenance
- [ ] Admin can enable maintenance
- [ ] Status shows "ENABLED" after enabling
- [ ] Non-admin redirected to /maintenance
- [ ] Maintenance message displays correctly
- [ ] Timestamp displays correctly
- [ ] Reason displays correctly
- [ ] Admin can still access dashboard
- [ ] Admin can access admin panel
- [ ] Admin can disable maintenance
- [ ] Status shows "DISABLED" after disabling
- [ ] Non-admin can access dashboard again
- [ ] Mod cannot access admin panel

**If all checked:** You're ready to deploy! ✅

---

## Commands Reference

```bash
# Start Convex dev server (regenerates types)
convex dev

# Type check your code
npm run type-check

# Start dev server
npm run dev

# View Convex dashboard
# https://dashboard.convex.dev

# Kill dev server (if hung)
# Ctrl+C in terminal
```

---

## Estimated Time

- Step 1 (Convex dev): 1-2 minutes
- Step 2 (Code changes): 5 minutes
- Step 3 (Type check): 1 minute  
- Step 4 (Start server): 2 minutes
- Step 5 (Testing): 5 minutes
- **Total: 15-20 minutes**

---

## Final Success Indicators

- ✅ No compilation errors
- ✅ Dev server runs clean
- ✅ Admin panel loads
- ✅ Enable/disable buttons work
- ✅ Auto-redirect works
- ✅ Maintenance message displays
- ✅ All tests pass

When all above are true, you're done! 🎉
