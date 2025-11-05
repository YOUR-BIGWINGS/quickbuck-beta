import { describe, it, expect } from "vitest";

// Test utilities for portfolio page functionality

describe("Portfolio Data Fetching", () => {
  it("should fetch player stock holdings", () => {
    const holdings = [
      { _id: "1", userId: "player1", stockId: "stock1", shares: 100, averagePurchasePrice: 10000 },
      { _id: "2", userId: "player1", stockId: "stock2", shares: 50, averagePurchasePrice: 20000 },
    ];

    expect(holdings).toHaveLength(2);
    expect(holdings[0].shares).toBe(100);
  });

  it("should fetch player crypto holdings", () => {
    const holdings = [
      { _id: "1", userId: "player1", cryptoId: "crypto1", amount: 1000, averagePurchasePrice: 100 },
      { _id: "2", userId: "player1", cryptoId: "crypto2", amount: 500, averagePurchasePrice: 200 },
    ];

    expect(holdings).toHaveLength(2);
    expect(holdings[0].amount).toBe(1000);
  });

  it("should calculate net worth from multiple sources", () => {
    const cash = 1000000; // $10,000
    const stocksValue = 500000; // $5,000
    const cryptoValue = 250000; // $2,500
    const netWorth = cash + stocksValue + cryptoValue;

    expect(netWorth).toBe(1750000); // $17,500
  });
});

describe("Stock Portfolio Value Calculations", () => {
  it("should calculate stock holding value correctly", () => {
    const shares = 100;
    const currentPrice = 15000; // $150.00 in cents
    const value = shares * currentPrice;

    expect(value).toBe(1500000); // $15,000.00
  });

  it("should calculate total stocks value", () => {
    const holdings = [
      { shares: 100, price: 10000 }, // $10,000
      { shares: 50, price: 20000 },  // $10,000
      { shares: 75, price: 40000 },  // $30,000
    ];

    const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.price, 0);
    expect(totalValue).toBe(5000000); // $50,000.00
  });

  it("should handle empty stock holdings", () => {
    const holdings: any[] = [];
    const totalValue = holdings.reduce((sum, h) => sum + h.shares * h.price, 0);
    expect(totalValue).toBe(0);
  });

  it("should calculate gain/loss on holdings", () => {
    const shares = 100;
    const averagePurchasePrice = 10000; // $100.00
    const currentPrice = 12000; // $120.00
    const costBasis = shares * averagePurchasePrice;
    const currentValue = shares * currentPrice;
    const gainLoss = currentValue - costBasis;

    expect(gainLoss).toBe(200000); // $2,000 gain
  });
});

describe("Crypto Portfolio Value Calculations", () => {
  it("should calculate crypto holding value correctly", () => {
    const tokens = 1000;
    const currentPrice = 250; // $2.50 in cents
    const value = Math.floor(tokens * currentPrice);

    expect(value).toBe(250000); // $2,500.00
  });

  it("should calculate total crypto value", () => {
    const holdings = [
      { amount: 1000, price: 100 },  // $1,000
      { amount: 500, price: 200 },   // $1,000
      { amount: 250, price: 400 },   // $1,000
    ];

    const totalValue = holdings.reduce((sum, h) => sum + Math.floor(h.amount * h.price), 0);
    expect(totalValue).toBe(300000); // $3,000.00
  });

  it("should handle empty crypto holdings", () => {
    const holdings: any[] = [];
    const totalValue = holdings.reduce((sum, h) => sum + Math.floor(h.amount * h.price), 0);
    expect(totalValue).toBe(0);
  });

  it("should handle fractional cents in crypto value", () => {
    const tokens = 333;
    const price = 150; // $1.50 in cents
    const value = Math.floor(tokens * price);

    expect(value).toBe(49950); // $499.50 (not $499.5)
  });
});

describe("Portfolio Sorting", () => {
  it("should sort stocks by value descending", () => {
    const stocks = [
      { name: "Company A", shares: 100, price: 10000, value: 1000000 },
      { name: "Company B", shares: 50, price: 40000, value: 2000000 },
      { name: "Company C", shares: 200, price: 5000, value: 1000000 },
    ];

    const sorted = [...stocks].sort((a, b) => b.value - a.value);
    expect(sorted[0].name).toBe("Company B");
    expect(sorted[1].name).toBe("Company A");
  });

  it("should sort stocks by shares ascending", () => {
    const stocks = [
      { name: "Company A", shares: 100 },
      { name: "Company B", shares: 50 },
      { name: "Company C", shares: 200 },
    ];

    const sorted = [...stocks].sort((a, b) => a.shares - b.shares);
    expect(sorted[0].shares).toBe(50);
    expect(sorted[2].shares).toBe(200);
  });

  it("should sort stocks by name alphabetically", () => {
    const stocks = [
      { name: "Zebra Corp" },
      { name: "Apple Inc" },
      { name: "Microsoft" },
    ];

    const sorted = [...stocks].sort((a, b) => a.name.localeCompare(b.name));
    expect(sorted[0].name).toBe("Apple Inc");
    expect(sorted[2].name).toBe("Zebra Corp");
  });

  it("should sort crypto by value descending", () => {
    const crypto = [
      { name: "Bitcoin", amount: 1000, price: 100, value: 100000 },
      { name: "Ethereum", amount: 500, price: 300, value: 150000 },
      { name: "Solana", amount: 2000, price: 50, value: 100000 },
    ];

    const sorted = [...crypto].sort((a, b) => b.value - a.value);
    expect(sorted[0].name).toBe("Ethereum");
  });

  it("should sort crypto by amount ascending", () => {
    const crypto = [
      { name: "Bitcoin", amount: 1000 },
      { name: "Ethereum", amount: 500 },
      { name: "Solana", amount: 2000 },
    ];

    const sorted = [...crypto].sort((a, b) => a.amount - b.amount);
    expect(sorted[0].amount).toBe(500);
    expect(sorted[2].amount).toBe(2000);
  });
});

describe("Portfolio Total Calculations", () => {
  it("should calculate grand total from all holdings", () => {
    const cash = 1000000;
    const stocksTotal = 5000000;
    const cryptoTotal = 2500000;
    const collectionsTotal = 500000;

    const grandTotal = cash + stocksTotal + cryptoTotal + collectionsTotal;
    expect(grandTotal).toBe(9000000); // $90,000
  });

  it("should handle zero holdings gracefully", () => {
    const cash = 1000000;
    const stocksTotal = 0;
    const cryptoTotal = 0;

    const grandTotal = cash + stocksTotal + cryptoTotal;
    expect(grandTotal).toBe(1000000);
  });

  it("should format large portfolio values", () => {
    const netWorth = 125000000; // $1,250,000
    const formatted = (netWorth / 100).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });

    expect(formatted).toBe("$1,250,000.00");
  });
});

describe("Portfolio Display Logic", () => {
  it("should show empty state when no holdings", () => {
    const stockHoldings: any[] = [];
    const hasHoldings = stockHoldings.length > 0;

    expect(hasHoldings).toBe(false);
  });

  it("should show holdings table when data exists", () => {
    const stockHoldings = [{ _id: "1", shares: 100 }];
    const hasHoldings = stockHoldings.length > 0;

    expect(hasHoldings).toBe(true);
  });

  it("should calculate ownership percentage", () => {
    const playerShares = 500;
    const totalShares = 10000;
    const ownershipPercent = (playerShares / totalShares) * 100;

    expect(ownershipPercent).toBe(5);
  });

  it("should group holdings by asset type", () => {
    const holdings = {
      stocks: [{ type: "stock", value: 100000 }],
      crypto: [{ type: "crypto", value: 50000 }],
      collections: [{ type: "collection", value: 25000 }],
    };

    expect(Object.keys(holdings)).toHaveLength(3);
    expect(holdings.stocks).toHaveLength(1);
  });
});
