# Blackjack Game Timer and Expiration Feature

## Overview
Added a 5-minute session timer for blackjack games with visual warnings to keep players informed about when their game will expire.

## Features

### 1. **Game Session Timer**
- All blackjack games have a **5-minute** maximum session duration
- Timer starts when the player clicks "Deal"
- Timer is reset on each action (Hit, Stand)
- Player is clearly informed when time is running out

### 2. **Visual Warning (Last Minute)**
When the game has **less than 1 minute remaining**:
- ⏰ **Yellow warning banner** appears on screen
- Shows exact countdown: "⏰ Game expires in 45 seconds"
- Suggests: "Complete your game or use Leave Game button"
- Banner updates every second with countdown

### 3. **Toast Notifications**
- **Every 10 seconds** (in final minute): Toast warning with remaining time
- **At expiration**: Error toast "⏰ Game session expired! Your game has been abandoned."

### 4. **Auto-Abandonment**
When the 5-minute timer reaches zero:
- Game is automatically abandoned
- Player is notified via toast
- `gameState` is cleared in UI
- Player can immediately start a new game

### 5. **Manual Exit**
Players can click **"Leave Game"** button to:
- Immediately abandon the game
- Forfeit the bet
- Start a new game right away
- No need to wait for timer

## Technical Details

### State Management
```typescript
const [gameStartTime, setGameStartTime] = useState<number | null>(null);
const [timeRemaining, setTimeRemaining] = useState<number>(0);
```

### Timer Effect
- Runs every 1 second while game is in "playing" state
- Calculates remaining time: `maxTime (5 min) - elapsed time`
- Shows warning when < 60 seconds left
- Auto-abandons when time = 0
- Cleans up on component unmount

### Timer Reset
Timer resets on each action:
- ✅ Player clicks "Hit"
- ✅ Player clicks "Stand" (ends game anyway)
- ✅ Game naturally completes

### Visual Indicator
```tsx
{/* Timer Warning - Show when close to timeout */}
{gameState.gameState === "playing" && timeRemaining < 60 * 1000 && timeRemaining > 0 && (
  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500 flex items-center gap-2">
    <AlertTriangle className="h-5 w-5 text-yellow-600" />
    <div className="flex-1">
      <p className="text-sm font-semibold text-yellow-700">
        ⏰ Game expires in {Math.ceil(timeRemaining / 1000)} seconds
      </p>
      ...
```

## User Experience Flow

### Scenario 1: Player Completes Game Quickly
1. Clicks "Deal" → Timer starts (5 min)
2. Plays normally → Timer resets on each action
3. Hits "Stand" → Game ends, timer clears
4. Result displayed → Ready for new game

### Scenario 2: Player Takes Their Time
1. Clicks "Deal" → Timer starts (5 min)
2. Waits 4 minutes → Still playing
3. Timer hits 1 minute mark → **Yellow warning appears**
4. Toast notifications show: "60 sec", "50 sec", etc.
5. Player decides to Stand → Game ends before timer

### Scenario 3: Player Runs Out of Time
1. Clicks "Deal" → Timer starts (5 min)
2. Plays but takes too long
3. At 0 seconds → Game auto-abandoned
4. **Error toast**: "Game session expired! Your game has been abandoned."
5. UI clears → Can immediately start new game

### Scenario 4: Player Explicitly Leaves
1. Clicks "Deal" → Timer starts
2. Clicks "Leave Game" button → Game abandoned immediately
3. **Info toast**: "Game abandoned. Bet forfeited."
4. Can start new game immediately (no waiting for timer)

## Backend Coordination

The timer works in conjunction with backend logic:

### `getActiveBlackjackGame` Query
- Only returns games updated in last 5 minutes
- Stale games are not considered "active"

### `startBlackjack` Mutation
- Checks for active games
- If game is > 5 minutes old → Automatically deletes it
- If game is < 5 minutes old and playing → Rejects with error
- Player must either complete or explicitly abandon

## Benefits

✅ **Player Clarity**: Always know when game will expire
✅ **Prevents Abandonment**: Visual warnings encourage completion
✅ **Fair Gameplay**: No surprise auto-abandonment
✅ **Emergency Exit**: "Leave Game" button for quick abandonment
✅ **Database Cleanup**: Stale games are eventually cleaned up
✅ **UX Polish**: Smooth countdown, friendly warnings

## Related Files

- `app/routes/gamble.tsx` - Frontend timer and UI
- `convex/gambling.ts` - Backend game expiration logic
- `docs/BLACKJACK_ABANDON_FIX.md` - Related abandonment documentation

## Testing Checklist

- [ ] Start game, timer begins
- [ ] After 4 minutes, warning appears
- [ ] Timer counts down correctly
- [ ] Toast notifications appear every 10 sec in final minute
- [ ] Clicking "Leave Game" abandons immediately
- [ ] Game auto-abandons at 0 seconds
- [ ] Can start new game after abandonment
- [ ] Hitting/Standing resets timer
- [ ] Game history shows abandoned games as losses
