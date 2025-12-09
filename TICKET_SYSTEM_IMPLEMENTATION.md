# Ticket System & Audit Log Implementation

This implementation adds a comprehensive ticket system and audit log to QuickBuck.

## Features Implemented

### 1. Ticket System

- **User Ticket Submission** (`/tickets`)
  - Report player behavior, bugs, content violations, exploits, and other issues
  - Categories: Player Behavior, Bug Report, Content Violation, Exploit/Abuse, Other
  - View your own submitted tickets and their status
- **Moderator Ticket Management** (`/mod-tickets`)
  - View all tickets with filtering by status, priority, and category
  - Assign tickets to moderators
  - Update ticket priority (low, medium, high, urgent)
  - Resolve or close tickets with resolution notes
  - Real-time statistics dashboard

### 2. Audit Log System

- **Comprehensive Logging** (`/audit-log`)
  - Tracks all system actions across categories:
    - Moderation actions
    - Ticket operations
    - Player actions
    - Company operations
    - Transactions
    - System events
    - Admin actions
- **Advanced Search & Filtering**
  - Search by text (description, actor, target, action type)
  - Filter by category, action type, date range
  - Export logs to CSV
  - Configurable result limits (50-1000)
- **Automatic Cleanup**
  - Logs older than 3 days are automatically deleted (runs daily via cron)
  - Manual cleanup option for admins
  - Statistics dashboard for last 7 days

## Access Levels

- **All Users**: Can submit support tickets
- **Moderators (lil_mod, mod, high_mod, admin)**: Can manage tickets
- **Mod or Higher (mod, high_mod, admin)**: Can view audit logs
- **Admin**: Can manually trigger audit log cleanup

## Files Created

### Backend (Convex)

- `convex/tickets.ts` - Ticket CRUD operations
- `convex/auditLog.ts` - Audit logging and search
- `convex/schema.ts` - Updated with tickets and auditLog tables
- `convex/crons.ts` - Added daily cleanup job

### Frontend Components

- `app/components/tickets/ticket-submission-form.tsx`
- `app/components/tickets/my-tickets-list.tsx`
- `app/components/admin/moderator-ticket-manager.tsx`
- `app/components/admin/audit-log-viewer.tsx`

### Routes

- `app/routes/tickets.tsx` - User ticket page
- `app/routes/mod-tickets.tsx` - Moderator ticket management
- `app/routes/audit-log.tsx` - Audit log viewer
- `app/routes.ts` - Updated with new routes

### Utilities

- `app/hooks/use-toast.ts` - Simple toast notification hook

## Setup Instructions

1. **Run Convex Dev** to generate types:

   ```powershell
   npx convex dev
   ```

2. **Uncomment Audit Log Calls** in `convex/tickets.ts`:
   - After types are generated, uncomment the `internal.auditLog.logAction` calls
   - These are currently commented to prevent compilation errors

3. **Test the Features**:
   - Visit `/tickets` to submit a test ticket
   - As a moderator, visit `/mod-tickets` to manage tickets
   - As a mod or higher, visit `/audit-log` to view logs

## Navigation

The sidebar automatically shows appropriate links based on user role:

- All users see "Support Tickets"
- Moderators see "Mod Panel" and "Manage Tickets"
- Mod or higher see "Audit Log"

## Database Schema

### Tickets Table

- Reporter info, category, subject, description
- Status: open, in_progress, resolved, closed
- Priority: low, medium, high, urgent
- Assignment and resolution tracking
- Timestamps for creation, updates, and resolution

### Audit Log Table

- Actor and target information with roles
- Action type and category
- Human-readable description
- Optional metadata (JSON)
- Timestamp for sorting and filtering
- Multiple indexes for efficient queries

## Cron Job

A daily cron job runs to automatically clean up audit logs older than 3 days:

```typescript
crons.interval(
  "cleanup old audit logs",
  { hours: 24 },
  internal.auditLog.cleanupOldLogs
);
```

This ensures the database doesn't grow indefinitely while maintaining recent history for investigations.
