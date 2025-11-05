# Moderation System - Quick Start Guide

## What Was Implemented

A complete moderation and administration system for Quickbuck with:
- 5 player roles (normal, limited, banned, mod, admin)
- Moderation panel at `/panel` with early 2000s styling
- Role-based permissions and restrictions
- Account status UI (alerts and ban screens)

## Player Roles

| Role | Description | Panel Access | Create Content | Special Powers |
|------|-------------|--------------|----------------|----------------|
| **normal** | Default player | ❌ | ✅ | None |
| **limited** | Restricted account | ❌ | ❌ | None - shows alert |
| **banned** | Completely blocked | ❌ | ❌ | None - full screen block |
| **mod** | Moderator | ✅ | ✅ | Limit, ban, delete content |
| **admin** | Administrator | ✅ | ✅ | All mod powers + assign mods, set balances |

## Quick Setup

### 1. Create Your First Admin

```bash
# Make sure your account exists first, then:
node scripts/grant-admin.js your-email@example.com
```

### 2. Access the Mod Panel

1. Log in to your account
2. Navigate to `/panel` or click "Mod Panel" in sidebar
3. Start moderating!

## Mod Actions Available

### In Players Tab:
- **Limit Account:** Restrict user from creating content (requires reason)
- **Ban User:** Block all access (requires reason)
- **Unban/Restore:** Remove restrictions
- **Assign Mod:** Promote to moderator (admin only)
- **Set Balance:** Adjust player balance (admin only)

### In Companies Tab:
- **Delete Company:** Remove company (requires reason)
- **Set Balance:** Adjust company balance (admin only)

### In Crypto Tab:
- **Delete Crypto:** Remove cryptocurrency (requires reason)

## How It Works

### For Normal Players:
- Play the game as usual
- No visible changes unless action is taken against account

### When Limited:
- Yellow warning banner appears: "Your Account is Limited"
- Shows reason for limitation
- Cannot create companies, products, or crypto
- Can still trade and use existing assets

### When Banned:
- Full-screen red ban notice
- Shows ban reason
- Cannot access any game features
- Only option is to return home or contact support

## Technical Details

### Files Changed/Created:
- ✅ `convex/schema.ts` - Added role fields
- ✅ `convex/moderation.ts` - New moderation functions
- ✅ `convex/players.ts` - Default role assignment
- ✅ `convex/companies.ts` - Role checks
- ✅ `convex/products.ts` - Role checks
- ✅ `convex/crypto.ts` - Role checks
- ✅ `app/routes/panel.tsx` - Moderation panel UI
- ✅ `app/components/account-status.tsx` - Alert/ban screens
- ✅ `app/routes/dashboard/layout.tsx` - Role checking
- ✅ `app/components/dashboard/app-sidebar.tsx` - Panel link
- ✅ `scripts/grant-admin.js` - Admin bootstrap script

### Database Changes:
Added to `players` table:
- `role` - Player's current role
- `limitReason` - Why account is limited
- `banReason` - Why account is banned

## Testing Checklist

- [ ] Create test account and make it admin
- [ ] Access `/panel` as admin
- [ ] Limit a test account, verify alert appears
- [ ] Ban a test account, verify full-screen block
- [ ] Restore limited account, verify it works
- [ ] Unban account, verify full access restored
- [ ] Try to create company as limited user (should fail)
- [ ] Delete a test company as mod
- [ ] Set a player balance as admin
- [ ] Assign moderator role as admin
- [ ] Verify mod cannot set balances
- [ ] Verify normal user cannot access panel

## Need Help?

See full documentation: `docs/MODERATION_SYSTEM.md`

## Status: ✅ FULLY IMPLEMENTED

All features are complete and ready to use. Run `npx convex dev` to ensure latest schema is deployed.
