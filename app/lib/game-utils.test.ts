import { describe, expect, it } from "vitest";
import {
  getTimeUntilNextTick,
  formatTimeRemaining,
  formatCurrency,
  formatCompactCurrency,
  calculatePercentageChange,
} from "./game-utils";

describe("Countdown Timer Utils", () => {
  it("should calculate time until next tick correctly", () => {
    const FIVE_MINUTES_MS = 5 * 60 * 1000;
    const now = Date.now();
    
    // If last tick was exactly 5 minutes ago (one full cycle)
    const lastTick = now - (5 * 60 * 1000);
    const timeRemaining = getTimeUntilNextTick(lastTick);
    
    // Should be very close to 5 minutes (full cycle, next tick imminent)
    expect(timeRemaining).toBeGreaterThan(0);
    expect(timeRemaining).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it("should handle tick just occurred", () => {
    const now = Date.now();
    const timeRemaining = getTimeUntilNextTick(now);
    
    // Should be close to 5 minutes (just ticked, full wait ahead)
    expect(timeRemaining).toBeGreaterThan(4.9 * 60 * 1000);
    expect(timeRemaining).toBeLessThanOrEqual(5 * 60 * 1000);
  });

  it("should format time remaining correctly", () => {
    expect(formatTimeRemaining(0)).toBe("00:00");
    expect(formatTimeRemaining(1000)).toBe("00:01");
    expect(formatTimeRemaining(60000)).toBe("01:00");
    expect(formatTimeRemaining(90000)).toBe("01:30");
    expect(formatTimeRemaining(600000)).toBe("10:00");
    expect(formatTimeRemaining(1199000)).toBe("19:59");
  });
});

describe("Currency Formatting", () => {
  it("should format cents to currency", () => {
    expect(formatCurrency(0)).toBe("$0.00");
    expect(formatCurrency(100)).toBe("$1.00");
    expect(formatCurrency(1050)).toBe("$10.50");
    expect(formatCurrency(100000)).toBe("$1,000.00");
    expect(formatCurrency(1000000)).toBe("$10,000.00");
  });

  it("should handle negative values", () => {
    expect(formatCurrency(-100)).toBe("-$1.00");
    expect(formatCurrency(-50000)).toBe("-$500.00");
  });

  it("should format compact currency with K, M, B", () => {
    expect(formatCompactCurrency(100)).toBe("$1.00");
    expect(formatCompactCurrency(10000)).toBe("$100.00");
    expect(formatCompactCurrency(100000)).toBe("$1.00K");
    expect(formatCompactCurrency(150000)).toBe("$1.50K");
    expect(formatCompactCurrency(10000000)).toBe("$100.00K");
    expect(formatCompactCurrency(100000000)).toBe("$1.00M");
    expect(formatCompactCurrency(250000000)).toBe("$2.50M");
    expect(formatCompactCurrency(10000000000)).toBe("$100.00M");
    expect(formatCompactCurrency(100000000000)).toBe("$1.00B");
  });
});

describe("Percentage Change Calculation", () => {
  it("should calculate positive percentage change", () => {
    expect(calculatePercentageChange(110, 100)).toBe(10);
    expect(calculatePercentageChange(200, 100)).toBe(100);
    expect(calculatePercentageChange(150, 100)).toBe(50);
  });

  it("should calculate negative percentage change", () => {
    expect(calculatePercentageChange(90, 100)).toBe(-10);
    expect(calculatePercentageChange(50, 100)).toBe(-50);
    expect(calculatePercentageChange(75, 100)).toBe(-25);
  });

  it("should handle zero previous value", () => {
    expect(calculatePercentageChange(100, 0)).toBe(0);
  });

  it("should handle no change", () => {
    expect(calculatePercentageChange(100, 100)).toBe(0);
  });

  it("should handle decimal results", () => {
    const result = calculatePercentageChange(105, 100);
    expect(result).toBe(5);
  });
});
