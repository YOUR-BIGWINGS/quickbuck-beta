# Global Alerts Feature - Admin Implementation Guide

## Overview
A comprehensive global alert system allowing admins to send announcements to all users. Alerts appear as sticky notifications at the top of the page and track read status per user.

## Architecture

### Database Schema (`convex/schema.ts`)
```typescript
globalAlerts: defineTable({
  createdBy: v.id("players"),           // Admin who created it
  title: v.string(),                    // Alert title (max 200 chars)
  message: v.string(),                  // Alert content (max 2000 chars)
  type: v.union(...),                   // "info" | "warning" | "success" | "error"
  readBy: v.optional(v.array(...)),     // Players who have seen it
  sentAt: v.number(),                   // Timestamp when sent
  createdAt: v.number(),                // Creation timestamp
})
  .index("by_sentAt", ["sentAt"])
```

### Backend API (`convex/alerts.ts`)

#### Mutations

**`sendGlobalAlert(title, message, type)`**
- **Permission**: Admin only
- **Validation**: 
  - Title: 1-200 characters
  - Message: 1-2000 characters
  - Type must be one of: "info", "warning", "success", "error"
- **Response**: Alert ID
- **Errors**: Throws if user is not admin or validation fails

**`markAlertAsRead(alertId)`**
- **Permission**: All authenticated users
- **Purpose**: Marks an alert as read by the current user
- **Response**: true

**`deleteAlert(alertId)`**
- **Permission**: Admin only
- **Purpose**: Removes an alert from the system
- **Response**: true

#### Queries

**`getUnreadAlerts()`**
- **Permission**: All authenticated users
- **Returns**: Array of alerts not yet read by current user
- **Ordered**: Newest first

**`getAllAlerts()`**
- **Permission**: Admin only
- **Returns**: All alerts in system for admin review
- **Use**: Admin panel alert history

### Frontend Components

#### Admin Panel (`app/routes/panel.tsx`)

**New Tab**: "Global Alerts" (admin-only)

**Features**:
- View all sent alerts and read counts
- Send new alert via modal dialog
- Real-time character count for title/message
- Live preview of alert appearance
- Formatted with retro Windows 95-style UI

**Modal Form**:
```
- Title Input (200 char limit)
- Message Textarea (2000 char limit)
- Alert Type Selector (dropdown with 4 options)
- Live Preview Section
- Send/Cancel Buttons
```

#### Global Alert Banner (`app/components/global-alert-banner.tsx`)

**Features**:
- Displays unread alerts at top of all pages
- Auto-marks alerts as read on dismiss
- Slide-down animation on appearance
- Color-coded by alert type
- Close button (×) to dismiss
- Responsive on mobile
- Fixed positioning, z-index 9000

**Alert Styling**:
- **Info** (Blue): #e6f2ff background, #0000ff border
- **Success** (Green): #e6ffe6 background, #008000 border
- **Warning** (Orange): #fff9e6 background, #ff8c00 border
- **Error** (Red): #ffe6e6 background, #ff0000 border

**Responsive**:
- Desktop: Full width alert banner
- Mobile: Smaller padding, reduced font sizes
- Max height: 50vh on mobile with scroll if many alerts

### Integration

**Root Layout** (`app/root.tsx`):
- Imported `GlobalAlertBanner` component
- Added to Convex provider tree
- Renders on all authenticated pages
- Positioned above all other content

## Usage Flow

### Admin Sends Alert

1. Navigate to `/panel` (moderation panel)
2. Click "Global Alerts" tab
3. Click "✉️ Send New Alert" button
4. Fill out modal:
   - **Title**: Short headline (e.g., "Maintenance Scheduled")
   - **Message**: Full content (e.g., "Server maintenance tonight 2am-4am UTC")
   - **Type**: Select appropriate alert level
5. Preview appears in real-time
6. Click "Send Alert"
7. Confirmation message appears
8. Alert immediately sent to all users

### User Receives Alert

1. Alert appears at top of page with animation
2. User reads the announcement
3. User clicks × or waits (no auto-dismiss timeout)
4. Alert is marked as read in database
5. Alert removed from user's banner
6. On next session, alert won't reappear (marked as read)
7. Alert still visible in admin panel with read count

## Permissions & Security

- **Admin-only mutations**: `sendGlobalAlert`, `deleteAlert`, `getAllAlerts`
- **User mutations**: `markAlertAsRead` (own alerts only)
- **Authentication**: All endpoints require logged-in user
- **Validation**: Title/message length enforced server-side
- **Read tracking**: Prevents spam of old alerts (tracked per player)

## File Changes

| File | Type | Change |
|------|------|--------|
| `convex/schema.ts` | Backend | Added `globalAlerts` table |
| `convex/alerts.ts` | Backend | New alerts API (5 functions) |
| `app/routes/panel.tsx` | Frontend | Added "Global Alerts" tab & modal UI |
| `app/components/global-alert-banner.tsx` | Frontend | New banner component for users |
| `app/root.tsx` | Frontend | Integrated `GlobalAlertBanner` globally |

## Testing Checklist

- [ ] Admin can send alert via panel
- [ ] Alert appears for all logged-in users
- [ ] Alert has correct styling/color based on type
- [ ] User can dismiss alert
- [ ] Dismissed alert marked as read (won't reappear)
- [ ] Alert shows in admin panel history
- [ ] Character count limits enforced
- [ ] Non-admins cannot send alerts
- [ ] Non-admins cannot access admin tab
- [ ] Alerts persist across page navigation
- [ ] Mobile layout looks correct

## Future Enhancements

- Scheduled alerts (send at specific time)
- Alert targeting (send to specific roles/players)
- Alert expiration (auto-remove after N days)
- Rich text formatting in messages
- Alert analytics (who read, when, etc.)
- Alert categories/filtering
- Dismissal analytics

## Performance Notes

- Alert queries are lightweight (indexed by `sentAt`)
- `markAlertAsRead` uses array append (Convex handles efficiently)
- No polling; real-time updates via Convex subscriptions
- Banner component memoized to prevent unnecessary re-renders
- Fixed positioning doesn't affect layout

## Troubleshooting

**Alerts not appearing for users?**
- Check user is logged in (required for auth context)
- Verify Convex schema migration ran
- Check browser console for API errors

**Admin can't see "Global Alerts" tab?**
- Verify user role is "admin" in database (not "mod")
- Clear cache/reload page
- Check moderation access query returns admin role

**Alert not marked as read?**
- Verify `markAlertAsRead` mutation completes without errors
- Check network tab for failed requests
- Ensure userId/alertId are valid

