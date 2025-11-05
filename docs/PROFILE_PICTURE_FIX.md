# Profile Picture Fix

## Problem
Player profile pictures were not displaying their actual Clerk profile pictures in the leaderboard and other places where user avatars were shown. Instead, only default placeholder avatars were displayed.

## Root Cause
The issue was in how we were extracting the profile image URL from Clerk's JWT identity token in the `upsertUser` mutation. 

When using `ctx.auth.getUserIdentity()` in Convex, we receive a JWT token that follows OIDC standards. However, we were looking for the wrong field name for the profile picture.

## Solution
Updated `convex/users.ts` to correctly extract the profile image from Clerk's identity token by trying multiple possible field names in priority order:

1. `image_url` - Primary field used by Clerk in JWT tokens
2. `picture` - OIDC standard field name
3. `imageUrl` - Alternative camelCase format
4. `pictureUrl` - Alternative format
5. `profileImageUrl` - Alternative format
6. `avatar_url` - Fallback option

### Files Modified

#### `convex/users.ts`
- **`upsertUser` mutation**: Now correctly extracts profile image from Clerk identity using `image_url` as the primary field
- **`refreshUserImage` mutation**: Added new mutation to manually refresh a user's profile picture
- **`getCurrentUser` query**: Added query to get current user data
- **`debugClerkIdentity` query**: Added debug query to inspect available Clerk identity fields (can be removed in production)

### How Profile Pictures Flow Through the System

1. **User Authentication**: When a user signs in with Clerk, their JWT token contains profile picture URL in the `image_url` field
2. **User Sync**: The `upsertUser()` mutation is called automatically when users access the app (via `usePlayerData` hook and other page-level effects)
3. **Database Storage**: Profile image URL is stored in the `users` table `image` field
4. **Display**: Leaderboard and other components query user data which includes the `image` field, returned as `userImage` or `ownerImage`
5. **Rendering**: The `UserAvatar` component displays the profile picture with a fallback to initials

### Automatic Sync Points
Profile pictures are automatically synced when:
- User first signs up (via `upsertUser` in registration flow)
- User visits any page that uses `usePlayerData` hook (most game pages)
- User visits the leaderboard page
- User visits the pricing page

### Testing
To verify the fix works:
1. Sign in with a Clerk account that has a profile picture
2. Visit the leaderboard page
3. Your profile picture should now display correctly in the player rankings
4. Check other users' profile pictures in the leaderboard

### Future Improvements
Consider implementing Clerk webhooks to automatically sync user data (including profile pictures) when users update their profiles in Clerk, rather than relying on client-side sync during page loads.

## Related Files
- `convex/users.ts` - User data management and Clerk sync
- `convex/leaderboard.ts` - Queries that return user images
- `app/routes/leaderboard.tsx` - Displays user profile pictures
- `app/components/ui/user-avatar.tsx` - Avatar component with fallback handling
- `app/hooks/use-player-data.ts` - Hook that syncs user data on mount