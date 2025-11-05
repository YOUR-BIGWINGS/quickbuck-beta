# Mod Panel Access Fix ✅

## Issue
Moderators were getting an error when trying to access the mod panel:
```
Uncaught Error: Only admins can view all alerts
```

## Root Cause
The `getAllAlerts` query in `convex/alerts.ts` was checking for **admin-only** permission, but it should allow both **mods and admins** to view all alerts.

## Fix Applied
**File Modified:** `convex/alerts.ts` (line 130-143)

### Before (❌ Mods couldn't access)
```typescript
// Check admin permission
const isAdmin = await hasPermission(ctx, currentPlayer._id, "admin");
if (!isAdmin) {
  throw new Error("Only admins can view all alerts");
}
```

### After (✅ Mods and admins can access)
```typescript
// Check mod permission (allows both mods and admins)
const hasModAccess = await hasPermission(ctx, currentPlayer._id, "mod");
if (!hasModAccess) {
  throw new Error("Only mods and admins can view all alerts");
}
```

## How It Works
The `hasPermission` function already supports "mod" level:
```typescript
if (requiredRole === "mod") {
  return role === "mod" || role === "admin";
}
```

This returns `true` for both mods AND admins. By changing the permission check from "admin" to "mod", both roles now have access to the alerts.

## What This Means
- ✅ Mods can now view all system alerts in the mod panel
- ✅ Admins can still view all alerts
- ✅ Regular players cannot access alerts (as intended)
- ✅ No breaking changes

## Status
**FIXED** ✅ - Moderators can now access the mod panel without errors
