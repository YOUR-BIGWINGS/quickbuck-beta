import { formatCurrency } from "~/lib/game-utils";

export interface ChartDataPoint {
  timestamp: number;
  price: number;
  displayTime: string;
  formattedPrice: string;
}

/**
 * Seeded random number generator (simple LCG implementation)
 * This ensures consistent random numbers for the same seed (symbol)
 */
function seededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use a Linear Congruential Generator
  let state = Math.abs(hash);
  
  return function() {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Generates sample price history data for charting
 * Simulates a realistic price movement based on the current price and volatility
 */
export function generatePriceHistory(
  currentPrice: number,
  days: number = 7,
  symbol: string = ""
): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  // Create seeded random generator for consistent results per symbol
  const random = symbol ? seededRandom(symbol) : Math.random;
  
  // Generate a starting price using the seed
  // This creates variation in whether stocks are up or down overall
  const startMultiplier = 0.7 + (random() * 0.6); // Range: 0.7 to 1.3
  let price = currentPrice * startMultiplier;
  
  // Calculate volatility based on symbol (some stocks more volatile than others)
  const baseVolatility = 0.015 + (random() * 0.025); // Range: 1.5% to 4%
  
  // Calculate target (we want to end near current price, but with smooth progression)
  const targetPrice = currentPrice;
  const drift = (targetPrice - price) / (days + 1); // Gradual drift toward target
  
  for (let i = days; i >= 1; i--) {
    // Random walk with drift toward current price
    const randomValue = random() - 0.5; // Centered random
    const randomChange = randomValue * baseVolatility;
    
    // Add drift component to gradually move toward current price
    const driftComponent = drift / price;
    
    // Combine random walk with drift
    price = price * (1 + randomChange + driftComponent);
    
    // Don't go below 30% or above 200% of current price
    price = Math.max(currentPrice * 0.3, Math.min(currentPrice * 2.0, price));
    
    const timestamp = now - i * dayMs;
    const date = new Date(timestamp);
    
    data.push({
      timestamp,
      price: Math.round(price * 100) / 100,
      displayTime: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      formattedPrice: formatCurrency(price),
    });
  }
  
  // Always use the actual current price for the final data point (today)
  const date = new Date(now);
  data.push({
    timestamp: now,
    price: currentPrice,
    displayTime: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    formattedPrice: formatCurrency(currentPrice),
  });
  
  return data;
}

/**
 * Generates a smooth curve through the data for a more polished look
 * Preserves the first and last data points to maintain accuracy
 */
export function smoothPriceHistory(data: ChartDataPoint[]): ChartDataPoint[] {
  if (data.length < 3) return data;
  
  const smoothed: ChartDataPoint[] = [data[0]];
  
  for (let i = 1; i < data.length - 1; i++) {
    const prev = data[i - 1].price;
    const curr = data[i].price;
    const next = data[i + 1].price;
    
    const smoothedPrice = (prev + curr * 2 + next) / 4;
    
    smoothed.push({
      ...data[i],
      price: Math.round(smoothedPrice * 100) / 100,
      formattedPrice: formatCurrency(smoothedPrice),
    });
  }
  
  // Always preserve the last point as-is (current actual price)
  smoothed.push(data[data.length - 1]);
  return smoothed;
}

/**
 * Calculate price statistics
 */
export function calculatePriceStats(data: ChartDataPoint[]) {
  if (data.length === 0) {
    return {
      high: 0,
      low: 0,
      average: 0,
      change: 0,
      changePercent: 0,
    };
  }
  
  const prices = data.map((d) => d.price);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const average = prices.reduce((a, b) => a + b, 0) / prices.length;
  const change = prices[prices.length - 1] - prices[0];
  const changePercent = (change / prices[0]) * 100;
  
  return { high, low, average, change, changePercent };
}
