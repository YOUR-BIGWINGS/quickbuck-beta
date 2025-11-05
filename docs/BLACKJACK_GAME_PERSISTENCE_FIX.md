# Blackjack Game Persistence Fix

## Problem
When a player clicked off blackjack during an active game and returned to the page, their active game no longer appeared. The game couldn't be resumed because the `getActiveBlackjackGame` query failed to retrieve it, leaving the player unable to play anymore.

## Root Causes Identified

### 1. **Missing Composite Index**
The `blackjackGames` table only had a simple `by_playerId` index, with no way to efficiently sort by `updatedAt`. This meant when querying for the player's game:
- The database would return an arbitrary game (first/oldest in storage order)
- If multiple games existed or in edge cases, the wrong game could be retrieved

### 2. **Incorrect Query Pattern**
The `getActiveBlackjackGame` query used:
```typescript
.query("blackjackGames")
.withIndex("by_playerId", (q) => q.eq("playerId", player._id))
.first(); // Returns arbitrary first result, not the most recent!
```

This meant:
- No guaranteed ordering (first in storage order, not by recency)
- Could not reliably fetch the most recent/active game
- Multiple games could exist in the DB, but only one would be retrieved

### 3. **Overly Restrictive Game State Check**
The query originally checked for multiple game states (`"playing" | "dealer_bust" | "player_bust" | "player_win" | "dealer_win" | "push"`), but:
- Games that finished (hit/stand/bust) are deleted from the database
- The only valid active state is `"playing"`
- Other states shouldn't be checked since they trigger deletion

## Changes Made

### 1. **Added Composite Index** (`convex/schema.ts`)
Created a new composite index that enables efficient sorting:
```typescript
.index("by_playerId_updatedAt", ["playerId", "updatedAt"])
```

This allows queries to:
- Efficiently filter by player
- Sort/order by `updatedAt` timestamp
- Get the most recent game deterministically

### 2. **Fixed All Game Queries** (`convex/gambling.ts`)

#### Updated `getActiveBlackjackGame`:
```typescript
const games = await ctx.db
  .query("blackjackGames")
  .withIndex("by_playerId_updatedAt", (q) => q.eq("playerId", player._id))
  .order("desc")  // Sort by updatedAt descending
  .take(1);       // Get most recent

const game = games[0];

// Only check for "playing" state - the only valid active state
if (game && Date.now() - game.updatedAt < 30 * 60 * 1000 && game.gameState === "playing") {
  return { exists: true, ... };
}
```

#### Updated `startBlackjack`:
- Uses new index to check if player has existing active games
- Properly fetches the most recent game

#### Updated `hitBlackjack`:
- Uses new index to fetch most recent active game
- Ensures mutations operate on correct game

#### Updated `standBlackjack`:
- Uses new index to fetch most recent active game
- Maintains consistency across all mutations

## How It Works Now

1. **Player starts a game**:
   - Game is inserted with `gameState: "playing"` and `updatedAt: now`
   - New index allows efficient retrieval

2. **Player clicks off/navigates away**:
   - Game remains in database with `gameState: "playing"`
   - `updatedAt` timestamp is preserved

3. **Player returns to page**:
   - `getActiveBlackjackGame` query is called
   - Uses `by_playerId_updatedAt` index to fetch games
   - Orders by `updatedAt` descending to get most recent
   - Verifies it's still within 30-minute window and in "playing" state
   - **Game is found and displayed!**

4. **Player resumes and finishes**:
   - Hit/stand/bust mutations find the game using the same pattern
   - Game completes and is deleted (or stays deleted if bust)
   - New game can be started immediately

## Benefits

✅ **Reliable Game Persistence** - Games are always retrievable until explicitly deleted  
✅ **Deterministic Queries** - Always get the most recent game, never a stale one  
✅ **Better Performance** - Composite index enables efficient sorting  
✅ **Consistent Mutations** - All hit/stand/bust operations use the same reliable pattern  
✅ **Session Recovery** - Players can leave and return to resume their game  

## Testing

To verify the fix:

1. **Start a blackjack game**
   - Place a bet and see cards dealt

2. **Navigate away**
   - Click to another page or refresh the browser

3. **Return to blackjack**
   - The game should appear with your current cards
   - You can hit or stand to continue

4. **Complete the game**
   - Finish the game normally
   - You can start a new game immediately

## Files Modified
- `/convex/schema.ts` - Added `by_playerId_updatedAt` composite index
- `/convex/gambling.ts` - Updated all blackjack queries to use new index and proper ordering:
  - `getActiveBlackjackGame` query
  - `startBlackjack` mutation
  - `hitBlackjack` mutation
  - `standBlackjack` mutation
