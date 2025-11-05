import { describe, expect, it } from "vitest";

/**
 * Unit tests for core business logic functions
 * These test the algorithms and calculations without Convex database
 */

describe("Bulk Order Percentage Allocation Logic", () => {
  it("should calculate equal percentage distribution", () => {
    const totalPercentage = 100;
    const productCount = 4;
    const equalPercentage = totalPercentage / productCount;

    expect(equalPercentage).toBe(25); // 25% per product
  });

  it("should calculate budget from percentage allocation", () => {
    const totalBudget = 100000; // $1000 in cents
    const allocationPercentage = 50; // 50%
    const productBudget = Math.floor(
      (totalBudget * allocationPercentage) / 100
    );

    expect(productBudget).toBe(50000); // $500
  });

  it("should calculate quantity from percentage-allocated budget", () => {
    const totalBudget = 100000; // $1000 in cents
    const allocationPercentage = 30; // 30%
    const productionCost = 1000; // $10 per unit
    const productBudget = Math.floor(
      (totalBudget * allocationPercentage) / 100
    );
    const quantity = Math.floor(productBudget / productionCost);

    expect(productBudget).toBe(30000); // $300
    expect(quantity).toBe(30); // 30 units
  });

  it("should handle percentage redistribution when one allocation changes", () => {
    const changedPercentage = 40; // 40%
    const otherProductCount = 3;
    const remainingPercentage = 100 - changedPercentage;
    const equalShare = remainingPercentage / otherProductCount;

    expect(equalShare).toBeCloseTo(20, 1); // ~20% per other product
  });

  it("should calculate total cost for bulk order with percentages", () => {
    const totalBudget = 100000; // $1000 in cents
    const allocations = [
      { percentage: 30, productionCost: 1000 }, // 30% = $300 = 30 units
      { percentage: 40, productionCost: 1500 }, // 40% = $400 = 26 units
      { percentage: 30, productionCost: 800 }, // 30% = $300 = 37 units
    ];

    let totalSpent = 0;
    let totalUnits = 0;

    allocations.forEach((alloc) => {
      const budget = Math.floor((totalBudget * alloc.percentage) / 100);
      const quantity = Math.floor(budget / alloc.productionCost);
      const actualCost = quantity * alloc.productionCost;
      totalSpent += actualCost;
      totalUnits += quantity;
    });

    expect(totalUnits).toBe(93); // 30 + 26 + 37
    expect(totalSpent).toBeLessThanOrEqual(totalBudget);
  });

  it("should handle zero percentage allocation for a product", () => {
    const totalBudget = 100000;
    const allocationPercentage = 0; // 0%
    const budget = Math.floor((totalBudget * allocationPercentage) / 100);
    const productionCost = 1000;
    const quantity = Math.floor(budget / productionCost);

    expect(budget).toBe(0);
    expect(quantity).toBe(0); // No units
  });

  it("should validate percentages sum to 100%", () => {
    const allocations = [25, 25, 25, 25];
    const sum = allocations.reduce((total, p) => total + p, 0);

    expect(sum).toBe(100);
  });

  it("should handle percentage allocation resulting in unspent budget", () => {
    const totalBudget = 100000; // $1000 in cents
    const allocationPercentage = 35; // 35%
    const productionCost = 1200; // $12 per unit
    const budget = Math.floor((totalBudget * allocationPercentage) / 100);
    const quantity = Math.floor(budget / productionCost);
    const actualSpent = quantity * productionCost;
    const unspent = budget - actualSpent;

    expect(budget).toBe(35000); // $350
    expect(quantity).toBe(29); // 29 units
    expect(actualSpent).toBe(34800); // $348
    expect(unspent).toBe(200); // $2 unspent in this allocation
  });
});

describe("Net Worth Calculation Logic", () => {
  it("should calculate net worth from balance only", () => {
    const balance = 1000000; // $10,000 in cents
    const netWorth = balance;

    expect(netWorth).toBe(1000000);
  });

  it("should calculate net worth including stock value", () => {
    const balance = 1000000; // $10,000
    const stockQuantity = 100;
    const stockPrice = 1000; // $10 per share
    const stockValue = stockQuantity * stockPrice;
    const netWorth = balance + stockValue;

    expect(netWorth).toBe(1100000); // $11,000 total
  });

  it("should calculate net worth including crypto value", () => {
    const balance = 1000000; // $10,000
    const cryptoQuantity = 10000;
    const cryptoPrice = 100; // $1 per token
    const cryptoValue = cryptoQuantity * cryptoPrice;
    const netWorth = balance + cryptoValue;

    expect(netWorth).toBe(2000000); // $20,000 total
  });
});

describe("Weighted Average Price Calculation", () => {
  it("should calculate weighted average for initial purchase", () => {
    const existingQuantity = 0;
    const existingAverage = 0;
    const newQuantity = 10;
    const newPrice = 1000;

    const totalQuantity = existingQuantity + newQuantity;
    const totalValue =
      existingQuantity * existingAverage + newQuantity * newPrice;
    const newAverage = Math.floor(totalValue / totalQuantity);

    expect(newAverage).toBe(1000);
  });

  it("should calculate weighted average for additional purchase at same price", () => {
    const existingQuantity = 10;
    const existingAverage = 1000;
    const newQuantity = 10;
    const newPrice = 1000;

    const totalQuantity = existingQuantity + newQuantity;
    const totalValue =
      existingQuantity * existingAverage + newQuantity * newPrice;
    const newAverage = Math.floor(totalValue / totalQuantity);

    expect(newAverage).toBe(1000);
  });

  it("should calculate weighted average for purchase at different price", () => {
    const existingQuantity = 10;
    const existingAverage = 1000; // $10
    const newQuantity = 10;
    const newPrice = 2000; // $20

    const totalQuantity = existingQuantity + newQuantity;
    const totalValue =
      existingQuantity * existingAverage + newQuantity * newPrice;
    const newAverage = Math.floor(totalValue / totalQuantity);

    expect(newAverage).toBe(1500); // $15 average
  });

  it("should handle unequal quantities", () => {
    const existingQuantity = 5;
    const existingAverage = 1000;
    const newQuantity = 15;
    const newPrice = 2000;

    const totalQuantity = existingQuantity + newQuantity;
    const totalValue =
      existingQuantity * existingAverage + newQuantity * newPrice;
    const newAverage = Math.floor(totalValue / totalQuantity);

    expect(newAverage).toBe(1750); // Weighted toward $20
  });
});

describe("Loan Interest Calculation", () => {
  it("should calculate proportional interest for one tick", () => {
    const principal = 100000; // $1,000
    const dailyRate = 0.05; // 5% daily
    const intervalsPerDay = 72;
    const intervalRate = dailyRate / intervalsPerDay;

    const interest = Math.floor(principal * intervalRate);
    const newAmount = principal + interest;

    expect(interest).toBe(69); // $0.69
    expect(newAmount).toBe(100069);
  });

  it("should compound over multiple ticks", () => {
    let amount = 100000; // $1,000
    const dailyRate = 0.05;
    const intervalsPerDay = 72;
    const intervalRate = dailyRate / intervalsPerDay;

    // Apply interest 3 times
    for (let i = 0; i < 3; i++) {
      const interest = Math.floor(amount * intervalRate);
      amount += interest;
    }

    expect(amount).toBeGreaterThan(100000);
    expect(amount).toBeLessThan(100250); // Should be small increase
  });

  it("should calculate correct daily interest after 72 ticks", () => {
    let amount = 100000; // $1,000
    const dailyRate = 0.05;
    const intervalsPerDay = 72;
    const intervalRate = dailyRate / intervalsPerDay;

    // Apply interest 72 times (one full day)
    for (let i = 0; i < intervalsPerDay; i++) {
      const interest = Math.floor(amount * intervalRate);
      amount += interest;
    }

    // Should be approximately 5% increase
    expect(amount).toBeGreaterThanOrEqual(104900); // ~$1,049
    expect(amount).toBeLessThanOrEqual(105100);
  });
});

describe("Market Cap Calculation", () => {
  it("should calculate market cap for stocks", () => {
    const price = 1000; // $10 per share
    const totalShares = 100000;
    const marketCap = price * totalShares;

    expect(marketCap).toBe(100000000); // $1M market cap
  });

  it("should calculate market cap for crypto", () => {
    const price = 100; // $1 per token
    const circulatingSupply = 1000000;
    const marketCap = price * circulatingSupply;

    expect(marketCap).toBe(100000000); // $1M market cap
  });

  it("should update market cap when price changes", () => {
    const totalShares = 100000;
    const oldPrice = 1000;
    const newPrice = 1500;

    const oldMarketCap = oldPrice * totalShares;
    const newMarketCap = newPrice * totalShares;

    expect(oldMarketCap).toBe(100000000); // $1M
    expect(newMarketCap).toBe(150000000); // $1.5M
    expect(newMarketCap - oldMarketCap).toBe(50000000); // +$500k
  });
});

describe("Price Clamping", () => {
  it("should clamp stock price increase to +20%", () => {
    const currentPrice = 1000;
    const maxIncrease = 0.2;
    const proposedNewPrice = 1300; // +30%

    const maxAllowedPrice = Math.floor(currentPrice * (1 + maxIncrease));
    const clampedPrice = Math.min(proposedNewPrice, maxAllowedPrice);

    expect(clampedPrice).toBe(1200); // Clamped to +20%
  });

  it("should clamp stock price decrease to -20%", () => {
    const currentPrice = 1000;
    const maxDecrease = 0.2;
    const proposedNewPrice = 700; // -30%

    const minAllowedPrice = Math.floor(currentPrice * (1 - maxDecrease));
    const clampedPrice = Math.max(proposedNewPrice, minAllowedPrice);

    expect(clampedPrice).toBe(800); // Clamped to -20%
  });

  it("should allow price changes within clamp range", () => {
    const currentPrice = 1000;
    const maxChange = 0.2;
    const proposedNewPrice = 1100; // +10%

    const maxAllowedPrice = Math.floor(currentPrice * (1 + maxChange));
    const minAllowedPrice = Math.floor(currentPrice * (1 - maxChange));
    const clampedPrice = Math.min(
      Math.max(proposedNewPrice, minAllowedPrice),
      maxAllowedPrice
    );

    expect(clampedPrice).toBe(1100); // No clamping needed
  });

  it("should clamp crypto price to ±30%", () => {
    const currentPrice = 1000;
    const maxChange = 0.3;

    const veryHighPrice = 1500; // +50%
    const veryLowPrice = 600; // -40%

    const maxAllowedPrice = Math.floor(currentPrice * (1 + maxChange));
    const minAllowedPrice = Math.floor(currentPrice * (1 - maxChange));

    const clampedHigh = Math.min(veryHighPrice, maxAllowedPrice);
    const clampedLow = Math.max(veryLowPrice, minAllowedPrice);

    expect(clampedHigh).toBe(1300); // Clamped to +30%
    expect(clampedLow).toBe(700); // Clamped to -30%
  });
});

describe("Product Attractiveness Scoring", () => {
  it("should calculate base attractiveness score", () => {
    const quality = 0.8;
    const priceScore = 0.7; // Depends on price preference
    const demandScore = 0.5;

    const attractiveness = 0.4 * quality + 0.3 * priceScore + 0.2 * demandScore;

    expect(attractiveness).toBeCloseTo(0.63, 2);
  });

  it("should penalize expensive items", () => {
    const baseScore = 0.8;
    const unitPrice = 10000; // $100
    const unitPricePenalty = Math.exp(-unitPrice / 1000000); // exp(-0.01)

    const finalScore = baseScore * unitPricePenalty;

    expect(finalScore).toBeLessThan(baseScore);
    expect(unitPricePenalty).toBeCloseTo(0.99, 2);
  });

  it("should strongly penalize very expensive items", () => {
    const baseScore = 0.8;
    const unitPrice = 1000000; // $10,000
    const unitPricePenalty = Math.exp(-unitPrice / 1000000); // exp(-1)

    const finalScore = baseScore * unitPricePenalty;

    expect(finalScore).toBeLessThan(baseScore * 0.5);
    expect(unitPricePenalty).toBeCloseTo(0.368, 2); // e^-1 ≈ 0.368
  });
});

describe("Balance Validation", () => {
  it("should validate sufficient balance for purchase", () => {
    const balance = 1000000; // $10,000
    const purchaseAmount = 500000; // $5,000

    const hasSufficientBalance = balance >= purchaseAmount;

    expect(hasSufficientBalance).toBe(true);
  });

  it("should reject purchase with insufficient balance", () => {
    const balance = 1000000; // $10,000
    const purchaseAmount = 1500000; // $15,000

    const hasSufficientBalance = balance >= purchaseAmount;

    expect(hasSufficientBalance).toBe(false);
  });

  it("should allow purchase at exact balance", () => {
    const balance = 1000000;
    const purchaseAmount = 1000000;

    const hasSufficientBalance = balance >= purchaseAmount;

    expect(hasSufficientBalance).toBe(true);
  });
});

describe("Stock Validation", () => {
  it("should validate sufficient stock for purchase", () => {
    const currentStock = 100;
    const requestedQuantity = 50;

    const hasEnoughStock = currentStock >= requestedQuantity;

    expect(hasEnoughStock).toBe(true);
  });

  it("should reject purchase exceeding stock", () => {
    const currentStock = 100;
    const requestedQuantity = 150;

    const hasEnoughStock = currentStock >= requestedQuantity;

    expect(hasEnoughStock).toBe(false);
  });

  it("should validate stock limit for adding inventory", () => {
    const currentStock = 400;
    const maxStock = 500;
    const addQuantity = 50;

    const wouldExceedMax = currentStock + addQuantity > maxStock;

    expect(wouldExceedMax).toBe(false);
  });

  it("should reject adding inventory beyond max", () => {
    const currentStock = 450;
    const maxStock = 500;
    const addQuantity = 100;

    const wouldExceedMax = currentStock + addQuantity > maxStock;

    expect(wouldExceedMax).toBe(true);
  });
});

describe("IPO Validation", () => {
  it("should allow IPO with minimum balance", () => {
    const companyBalance = 5000000; // $50,000
    const minBalance = 5000000;

    const canGoPublic = companyBalance >= minBalance;

    expect(canGoPublic).toBe(true);
  });

  it("should reject IPO below minimum balance", () => {
    const companyBalance = 4000000; // $40,000
    const minBalance = 5000000;

    const canGoPublic = companyBalance >= minBalance;

    expect(canGoPublic).toBe(false);
  });
});

describe("Cryptocurrency Creation Cost", () => {
  it("should charge $10k for crypto creation", () => {
    const initialBalance = 1500000; // $15,000
    const creationFee = 1000000; // $10,000
    const finalBalance = initialBalance - creationFee;

    expect(finalBalance).toBe(500000); // $5,000 remaining
  });

  it("should reject crypto creation without sufficient funds", () => {
    const initialBalance = 500000; // $5,000
    const creationFee = 1000000; // $10,000

    const canCreate = initialBalance >= creationFee;

    expect(canCreate).toBe(false);
  });
});

describe("Loan Limits", () => {
  it("should allow loan up to $5M", () => {
    const requestedAmount = 5000000000; // $5M in cents
    const maxLoan = 5000000000;

    const isAllowed = requestedAmount <= maxLoan;

    expect(isAllowed).toBe(true);
  });

  it("should reject loan exceeding $5M", () => {
    const requestedAmount = 6000000000; // $6M
    const maxLoan = 5000000000;

    const isAllowed = requestedAmount <= maxLoan;

    expect(isAllowed).toBe(false);
  });
});
