# Maintenance Mode Feature - Complete Setup Guide

## Overview

Maintenance mode is a feature that allows admins to take the Quickbuck platform offline for non-admin users while keeping the admin panel accessible for ongoing management. This document outlines the complete implementation and how to use it.

## Architecture

### Backend (Convex)

**File**: `convex/maintenance.ts`

#### Queries

- **`getMaintenanceStatus`**: Public query that returns maintenance mode status
  - Returns: `{ isEnabled: boolean, message: string, startedAt: number, reason: string }`
  - Accessible by: Everyone (used for determining if redirect is needed)

#### Mutations

- **`enableMaintenanceMode({ message, reason })`**: Admin-only mutation to enable maintenance
  - Parameters:
    - `message` (string): Message shown to users on maintenance page
    - `reason` (string): Internal reason for maintenance
  - Stores config with timestamp in `gameConfig` table
  - Permission check: Must be admin

- **`disableMaintenanceMode()`**: Admin-only mutation to disable maintenance
  - Removes maintenance config from database
  - Permission check: Must be admin

### Frontend Routes

#### Public Routes

- **`/maintenance`** - Maintenance page shown to non-admins when maintenance is enabled
  - File: `app/routes/maintenance.tsx`
  - Features:
    - Animated maintenance icon
    - Displays custom maintenance message
    - Shows when maintenance started
    - Displays maintenance reason (if provided)
    - Always accessible (no redirects)

#### Admin Routes

- **`/admin/maintenance`** - Admin control panel for managing maintenance mode
  - File: `app/routes/admin/maintenance.tsx`
  - Features:
    - Enable/disable maintenance buttons
    - Input fields for message and reason
    - Current maintenance status display
    - Permission protected: Only admins can access
  - Access Restrictions:
    - Admins: Full access
    - Mods: Redirected (no access)
    - Normal users: Redirected
  - Location: Outside dashboard layout to remain accessible during maintenance

### Components

#### MaintenanceCheck Component

**File**: `app/components/maintenance-check.tsx`

- **Purpose**: Automatic redirect logic for maintaining mode
- **Behavior**:
  - Checks maintenance status via `api.maintenance.getMaintenanceStatus`
  - Checks current player role via `api.moderation.getCurrentPlayer`
  - If maintenance enabled and user is not admin/mod: Redirect to `/maintenance`
  - If maintenance disabled: Allow normal access
- **Integration**: Mounted in `app/routes/dashboard/layout.tsx`
- **NOTE**: Currently has TODO comments pending Convex API regeneration

## User Flows

### Enabling Maintenance Mode

1. Admin navigates to `/admin/maintenance`
2. Enters custom message (default: "The server is under maintenance. Please try again later.")
3. Optionally enters reason for internal records
4. Clicks "Enable Maintenance" button
5. System stores config with timestamp
6. All non-admin users are now redirected to `/maintenance`
7. Admins remain able to access full dashboard and admin routes

### Disabling Maintenance Mode

1. Admin navigates to `/admin/maintenance`
2. Clicks "Disable Maintenance" button
3. System removes maintenance config
4. Non-admin users can now access normal site
5. Normal routing resumes

### Non-Admin User Experience During Maintenance

1. User tries to access any dashboard route or other page
2. `MaintenanceCheck` component detects maintenance is enabled
3. User is redirected to `/maintenance`
4. Page shows:
   - "Maintenance in Progress" header with animated icon
   - Custom message set by admin
   - Timestamp of when maintenance started
   - Reason for maintenance (if provided)
5. User cannot access any other part of the site until maintenance is disabled

### Admin Experience During Maintenance

- Admins bypass maintenance redirects entirely
- Can access `/admin/maintenance` to manage maintenance mode
- Can access full dashboard and all admin features
- Can disable maintenance whenever needed

## Permissions

| Role | Can Enable Maintenance | Can Disable Maintenance | Can Access Admin Panel | Gets Redirected to `/maintenance` |
|------|----------------------|----------------------|----------------------|-----------------------------------|
| Admin | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| Mod | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Normal | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Limited | ❌ No | ❌ No | ❌ No | ✅ Yes |
| Banned | ❌ No | ❌ No | ❌ No | ✅ Yes |

## Database Schema

### gameConfig Table Entry

When maintenance is enabled, the following is stored in the `gameConfig` table:

```
key: "maintenance_mode"
value: {
  isEnabled: true,
  message: "The server is under maintenance. Please try again later.",
  startedAt: 1234567890000,  // Timestamp
  reason: "Database migration in progress"
}
```

When maintenance is disabled, this entry is deleted from the table.

## Implementation Status

### ✅ Completed

- [x] Backend queries and mutations (`convex/maintenance.ts`)
- [x] Public maintenance page UI (`app/routes/maintenance.tsx`)
- [x] Admin control panel UI (`app/routes/admin/maintenance.tsx`)
- [x] Maintenance check redirect component (`app/components/maintenance-check.tsx`)
- [x] Route configuration (`app/routes.ts` and admin route)
- [x] Dashboard layout integration
- [x] Admin permission guards

### 🔄 Pending (After Convex API Regeneration)

- [ ] API type generation - Run `convex dev` to regenerate `convex/_generated/api`
- [ ] Update `admin/maintenance.tsx` - Uncomment API calls for enable/disable mutations
- [ ] Update `admin/maintenance.tsx` - Implement status display from query
- [ ] Update `maintenance.tsx` - Replace useMemo with actual API query
- [ ] Update `maintenance-check.tsx` - Uncomment and test redirect logic
- [ ] End-to-end testing of maintenance flow

## Setup Instructions

### Step 1: Regenerate Convex API Types

```bash
convex dev
```

This will regenerate the API types and make `api.maintenance` available in components.

### Step 2: Update Component API Calls

After Convex regeneration, uncomment and activate the API calls:

**File: `app/routes/admin/maintenance.tsx`**
- Uncomment imports and queries
- Uncomment mutation handlers
- Wire buttons to mutation functions

**File: `app/routes/maintenance.tsx`**
- Replace `useMemo` with `useQuery(api.maintenance.getMaintenanceStatus)`

**File: `app/components/maintenance-check.tsx`**
- Uncomment all TODO sections
- Test redirect logic

### Step 3: Test the Feature

1. Start dev server: `npm run dev`
2. Navigate to `/admin/maintenance` as admin
3. Enable maintenance mode with a test message
4. Log out and verify non-admin users see maintenance page
5. Login as admin and verify dashboard still works
6. Disable maintenance and verify normal routing resumes

## Files Modified

- `app/routes.ts` - Added `/admin/maintenance` route
- `app/routes/dashboard/layout.tsx` - Added `MaintenanceCheck` component integration

## Files Created

- `convex/maintenance.ts` - Backend logic
- `app/routes/maintenance.tsx` - Public maintenance page
- `app/routes/admin/maintenance.tsx` - Admin control panel
- `app/components/maintenance-check.tsx` - Redirect logic

## Troubleshooting

### "Cannot find module 'api.maintenance'"

This error occurs before Convex API regeneration. Run `convex dev` to regenerate types.

### Maintenance mode not redirecting users

1. Verify `MaintenanceCheck` is imported in `app/routes/dashboard/layout.tsx`
2. Check that Convex queries are uncommented in components
3. Verify maintenance is actually enabled in database (check gameConfig table)
4. Check browser console for errors

### Admin can't access admin panel

1. Verify user has "admin" role in database
2. Verify admin permission check is working in `admin/maintenance.tsx`
3. Check Convex logs for errors in permission validation

### Can't disable maintenance mode

1. Verify you're logged in as admin
2. Check Convex logs for mutation errors
3. Verify database write permissions

## Security Considerations

1. **Admin-Only Access**: The `disableMaintenanceMode` mutation checks `hasPermission(ctx, playerId, "admin")` to prevent non-admins from re-enabling the site
2. **Mod Exclusion**: Mods are intentionally excluded from maintenance controls - only admins can enable/disable
3. **No Client-Side Bypass**: Maintenance check happens server-side via Convex queries
4. **Audit Trail**: Maintenance actions use Sentry for logging (if enabled)

## Future Enhancements

- [ ] Scheduled maintenance (enable/disable at specific times)
- [ ] Maintenance notifications in email
- [ ] Maintenance history log
- [ ] Custom maintenance page branding
- [ ] Multiple admins logging (who enabled/disabled and when)
- [ ] Estimated time to completion UI
