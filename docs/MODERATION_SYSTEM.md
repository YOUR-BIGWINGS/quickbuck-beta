# Moderation System Documentation

## Overview

Quickbuck now includes a comprehensive moderation system with player roles and a dedicated moderation panel. The system allows administrators and moderators to manage users, content, and maintain the integrity of the game.

## Player Roles

The system supports five distinct player roles:

### 1. Normal (Default)
- Full access to all game features
- Can create companies, products, and cryptocurrencies
- Can trade, gamble, and participate in all activities
- No access to moderation tools

### 2. Limited
- **Restrictions:**
  - Cannot create new companies
  - Cannot create new products
  - Cannot create new cryptocurrencies
- **Allowed:**
  - Can still trade existing assets
  - Can manage existing companies/products
  - Can view all game content
- **UI Indication:**
  - Yellow warning alert appears at top of dashboard
  - Shows the reason for limitation
  - Alert persists until account is restored

### 3. Banned
- **Complete restriction** from all game features
- Cannot access dashboard or any game content
- Full-screen ban notice displayed with reason
- Only able to return to home page or contact support

### 4. Moderator (Mod)
- All features of a normal player
- **Additional Powers:**
  - Limit player accounts (with reason)
  - Restore limited accounts
  - Ban players (with reason)
  - Unban players
  - Delete companies (with reason)
  - Delete products (with reason)
  - Delete cryptocurrencies (with reason)
  - Access to moderation panel at `/panel`
- **Restrictions:**
  - Cannot modify other moderators
  - Cannot modify administrators
  - Cannot assign/remove moderator roles
  - Cannot modify balances or prices

### 5. Administrator (Admin)
- All features of a moderator
- **Additional Powers:**
  - Assign moderator role to normal users
  - Remove moderator role (demote to normal)
  - Set player account balances
  - Set company account balances
  - Set stock prices directly
  - Send global alerts (future feature)
- **Ultimate control** over the game economy and users

## Moderation Panel

### Accessing the Panel
- Navigate to `/panel` in your browser
- Only moderators and administrators can access
- Non-authorized users see an "ACCESS DENIED" screen
- Panel link appears in sidebar for mods/admins (Shield icon)

### Panel Features

#### Early 2000s Aesthetic
The moderation panel features a retro design inspired by early 2000s web applications:
- Classic Windows 98/2000 style borders and buttons
- Teal background with white content areas
- Tab-based navigation
- Outset/inset button styles
- Color-coded role badges and action buttons

#### Tabs

**1. Players Tab**
- View all players in the system
- Filter by role (optional)
- See player information:
  - Name and email
  - Current role
  - Account balance
  - Account status (banned/limited with reasons)
- Available actions per player:
  - **Normal users:** Limit, Ban, Set Balance (admin only), Promote to Mod (admin only)
  - **Limited users:** Restore, Ban
  - **Banned users:** Unban
  - **Moderators:** Demote (admin only)

**2. Companies Tab**
- View all companies (public and private)
- See company information:
  - Company name
  - Owner name
  - Ticker symbol (if public)
  - Current balance
  - Public/private status
- Available actions:
  - Delete company (with reason required)
  - Set company balance (admin only)

**3. Cryptocurrencies Tab**
- View all cryptocurrencies
- See crypto information:
  - Cryptocurrency name
  - Ticker symbol
  - Creator name
  - Current price
  - Market cap
- Available actions:
  - Delete cryptocurrency (with reason required)

### Action Confirmation
- Destructive actions (ban, delete) require reason input
- Reasons are stored and displayed to affected users
- Success/error messages shown at top of panel
- Messages auto-dismiss after 5 seconds

## Implementation Details

### Database Schema
Added to `convex/schema.ts` in the `players` table:
```typescript
role: v.optional(v.union(
  v.literal("normal"),
  v.literal("limited"),
  v.literal("banned"),
  v.literal("mod"),
  v.literal("admin")
)),
limitReason: v.optional(v.string()),
banReason: v.optional(v.string()),
```

### Backend Functions
Located in `convex/moderation.ts`:

**Permission Helpers:**
- `getPlayerRole()` - Get a player's current role
- `hasPermission()` - Check if player has required permission level
- `canPerformActions()` - Check if player can perform actions
- `canCreateContent()` - Check if player can create content

**Queries:**
- `getCurrentPlayer` - Get current authenticated player
- `checkModerationAccess` - Check if current user has mod/admin access
- `getAllPlayersForModeration` - Get all players for moderation panel
- `getAllCompaniesForModeration` - Get all companies for moderation panel
- `getAllCryptosForModeration` - Get all cryptocurrencies for moderation panel

**Moderation Actions:**
- `limitPlayer` - Limit a player account (mod+)
- `unlimitPlayer` - Restore a limited account (mod+)
- `banPlayer` - Ban a player (mod+)
- `unbanPlayer` - Unban a player (mod+)
- `assignModerator` - Promote to moderator (admin only)
- `removeModerator` - Demote moderator (admin only)
- `deleteCompanyAsMod` - Delete company as moderator (mod+)
- `deleteProductAsMod` - Delete product as moderator (mod+)
- `deleteCryptoAsMod` - Delete cryptocurrency as moderator (mod+)
- `setPlayerBalance` - Set player balance (admin only)
- `setCompanyBalance` - Set company balance (admin only)
- `setStockPrice` - Set stock price (admin only)
- `grantAdminRole` - Bootstrap function to create first admin (internal)

### Role Enforcement

**Content Creation:**
Modified in `convex/companies.ts`, `convex/products.ts`, and `convex/crypto.ts`:
- All creation functions now check `canCreateContent()`
- Limited and banned users are blocked from creating content
- Error message: "Your account does not have permission to create X"

**UI Feedback:**
- `app/components/account-status.tsx` provides two components:
  - `LimitedAccountAlert` - Yellow warning banner for limited accounts
  - `BannedAccountScreen` - Full-screen block for banned accounts
- Integrated into `app/routes/dashboard/layout.tsx`
- Checks player role on every dashboard load

**Sidebar Integration:**
- `app/components/dashboard/app-sidebar.tsx` updated
- "Mod Panel" link with Shield icon added for mods/admins
- Conditionally shown based on `checkModerationAccess` query

## Granting Admin Access

### First Admin (Bootstrap)
To create the first administrator:

```bash
node scripts/grant-admin.js user@example.com
```

This uses the `grantAdminRole` mutation which bypasses authentication checks for bootstrapping purposes.

### Subsequent Admins
After the first admin is created:
1. Log in as an admin
2. Go to `/panel`
3. Navigate to "Players" tab
4. Find the user you want to promote
5. Click "→ Mod" to make them a moderator first
6. Manually update their role to "admin" if needed, or grant admin access via Convex dashboard

### Via Convex Dashboard
1. Go to https://dashboard.convex.dev
2. Navigate to the `players` table
3. Find the player record
4. Edit the `role` field and set it to "admin"
5. Save changes

## Testing the System

### Test Scenarios

**1. Limited Account:**
- As admin, limit a test account
- Log in as that user
- Verify yellow warning appears
- Try to create a company → Should fail with error
- Try to create a product → Should fail with error
- Try to create crypto → Should fail with error
- Verify trading still works

**2. Banned Account:**
- As admin, ban a test account
- Log in as that user
- Verify full-screen ban message appears
- Verify no access to any dashboard features
- Verify ban reason is displayed

**3. Moderator Permissions:**
- As admin, promote a test user to moderator
- Log in as that moderator
- Verify "Mod Panel" appears in sidebar
- Access `/panel` → Should succeed
- Test limiting/unlimiting users
- Test banning/unbanning users
- Test deleting companies/crypto
- Try to assign another moderator → Should fail
- Try to set balances → Should fail

**4. Admin Permissions:**
- Log in as admin
- Access `/panel`
- Test all moderator functions
- Test assigning/removing moderators
- Test setting player balances
- Test setting company balances
- Verify ability to modify mods but not other admins

## Security Considerations

1. **Role Checks:** All backend mutations verify permissions before execution
2. **Error Messages:** Clear error messages when permissions are insufficient
3. **Audit Trail:** Ban/limit reasons are stored and displayed
4. **Self-Protection:** Users cannot modify their own role or ban themselves
5. **Admin Protection:** Moderators cannot modify administrators
6. **Frontend Validation:** UI elements hidden based on permissions
7. **Backend Enforcement:** All critical checks happen server-side

## Future Enhancements

Potential additions to the moderation system:
- Audit log of all moderation actions
- Time-based temporary bans
- Warning system before bans
- Global announcement system for admins
- Moderation action history per player
- Bulk moderation actions
- Advanced filtering and search in panel
- Email notifications for moderation actions
- Appeal system for banned users
- Automated moderation rules (e.g., spam detection)

## Troubleshooting

**Panel not accessible:**
- Verify your account has mod or admin role
- Check Convex dashboard `players` table
- Ensure Convex functions are deployed

**Role checks not working:**
- Regenerate Convex types: `npx convex dev --once`
- Clear browser cache and reload
- Verify schema changes are deployed

**Cannot grant first admin:**
- Ensure user has created an account and player record exists
- Use correct email address
- Check Convex deployment URL in script

**Errors in production:**
- Check Convex logs in dashboard
- Verify all moderation functions are deployed
- Ensure schema indexes are created

## File Reference

**Backend:**
- `convex/schema.ts` - Database schema with role fields
- `convex/moderation.ts` - All moderation logic and queries
- `convex/players.ts` - Updated to set default role
- `convex/companies.ts` - Role checks for company creation
- `convex/products.ts` - Role checks for product creation
- `convex/crypto.ts` - Role checks for crypto creation

**Frontend:**
- `app/routes/panel.tsx` - Moderation panel UI
- `app/components/account-status.tsx` - Limited/banned UI components
- `app/routes/dashboard/layout.tsx` - Role checking in layout
- `app/components/dashboard/app-sidebar.tsx` - Mod panel link
- `app/routes.ts` - Panel route configuration

**Scripts:**
- `scripts/grant-admin.js` - Bootstrap first admin

## Support

For issues or questions about the moderation system:
- Check Convex logs for backend errors
- Verify all files are properly deployed
- Test with fresh browser session
- Contact development team if issues persist
