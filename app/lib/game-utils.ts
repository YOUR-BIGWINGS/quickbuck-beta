/**
 * Calculate time remaining until next tick (5 minutes)
 * Returns time in milliseconds
 */
export function getTimeUntilNextTick(lastTickTime: number): number {
  const TICK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes in milliseconds
  const now = Date.now();
  
  // Guard against invalid lastTickTime
  if (!lastTickTime || lastTickTime <= 0) {
    return TICK_INTERVAL_MS;
  }
  
  const timeSinceLastTick = now - lastTickTime;
  
  // If time since last tick is negative (clock skew), return full interval
  if (timeSinceLastTick < 0) {
    return TICK_INTERVAL_MS;
  }
  
  const timeUntilNextTick = TICK_INTERVAL_MS - (timeSinceLastTick % TICK_INTERVAL_MS);
  
  // If calculated time is 0 or very close to the interval (likely just completed tick),
  // return full interval to prevent the timer from showing as frozen at 0
  if (timeUntilNextTick === 0 || timeUntilNextTick > TICK_INTERVAL_MS - 100) {
    return TICK_INTERVAL_MS;
  }
  
  return timeUntilNextTick;
}

/**
 * Format milliseconds to MM:SS
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format currency in cents to dollar string
 */
export function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format large numbers with K, M, B suffixes
 */
export function formatCompactCurrency(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000_000) {
    return `$${(dollars / 1_000_000_000).toFixed(2)}B`;
  }
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(2)}M`;
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(2)}K`;
  }
  return formatCurrency(cents);
}

/**
 * Format large cent values with compact notation (for market caps etc)
 */
export function formatCompactNumber(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000_000) {
    return `$${(dollars / 1_000_000_000).toFixed(1)}B`;
  }
  if (dollars >= 1_000_000) {
    return `$${(dollars / 1_000_000).toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    return `$${(dollars / 1_000).toFixed(1)}K`;
  }
  return `$${dollars.toFixed(0)}`;
}

/**
 * Calculate percentage change
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}
