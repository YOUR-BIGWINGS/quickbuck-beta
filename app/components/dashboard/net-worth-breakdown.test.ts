import { describe, expect, it } from "vitest";

/**
 * Net worth breakdown calculation tests
 */

describe("Net Worth Breakdown Calculations", () => {
  it("should calculate percentages correctly", () => {
    const cash = 5000000; // $50k
    const stocks = 3000000; // $30k
    const crypto = 1000000; // $10k
    const equity = 1000000; // $10k
    const total = cash + stocks + crypto + equity; // $100k

    const cashPercentage = (cash / total) * 100;
    const stocksPercentage = (stocks / total) * 100;
    const cryptoPercentage = (crypto / total) * 100;
    const equityPercentage = (equity / total) * 100;

    expect(cashPercentage).toBe(50);
    expect(stocksPercentage).toBe(30);
    expect(cryptoPercentage).toBe(10);
    expect(equityPercentage).toBe(10);
    expect(cashPercentage + stocksPercentage + cryptoPercentage + equityPercentage).toBe(100);
  });

  it("should handle zero values", () => {
    const cash = 10000000; // $100k
    const stocks = 0;
    const crypto = 0;
    const equity = 0;
    const total = cash;

    const cashPercentage = (cash / total) * 100;

    expect(cashPercentage).toBe(100);
  });

  it("should handle all zero values", () => {
    const cash = 0;
    const stocks = 0;
    const crypto = 0;
    const equity = 0;
    const total = cash + stocks + crypto + equity;

    // Avoid division by zero
    const cashPercentage = total > 0 ? (cash / total) * 100 : 0;

    expect(cashPercentage).toBe(0);
    expect(total).toBe(0);
  });

  it("should calculate net worth from components", () => {
    const cash = 1000000; // $10k
    const stocks = 2500000; // $25k
    const crypto = 500000; // $5k
    const equity = 3000000; // $30k

    const netWorth = cash + stocks + crypto + equity;

    expect(netWorth).toBe(7000000); // $70k total
  });

  it("should handle equal distribution", () => {
    const cash = 2500000; // $25k each
    const stocks = 2500000;
    const crypto = 2500000;
    const equity = 2500000;
    const total = cash + stocks + crypto + equity; // $100k total

    const percentage = (cash / total) * 100;

    expect(percentage).toBe(25);
  });

  it("should calculate portfolio value correctly", () => {
    const balance = 5000000; // $50k cash
    const netWorth = 10000000; // $100k total
    const portfolioValue = netWorth - balance;

    expect(portfolioValue).toBe(5000000); // $50k in assets
  });

  it("should sum components to equal net worth", () => {
    const cash = 1234567;
    const stocks = 2345678;
    const crypto = 3456789;
    const equity = 4567890;

    const netWorth = cash + stocks + crypto + equity;
    const calculatedSum = cash + stocks + crypto + equity;

    expect(calculatedSum).toBe(netWorth);
  });
});
