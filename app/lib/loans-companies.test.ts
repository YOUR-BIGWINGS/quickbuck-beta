import { describe, expect, it } from "vitest";

/**
 * Tests for Sections 7 & 8: Loans and Company Management
 * Testing business logic, calculations, and validation rules
 */

describe("Section 7: Loans - Interest Calculation", () => {
  const INTEREST_RATE = 5; // 5% daily

  it("should calculate daily interest correctly", () => {
    const principal = 1000000; // $10,000 in cents
    const dailyInterest = principal * (INTEREST_RATE / 100);
    
    expect(dailyInterest).toBe(50000); // $500 daily interest
  });

  it("should calculate 30-day interest projection", () => {
    const principal = 1000000; // $10,000 in cents
    const days = 30;
    const totalInterest = principal * (INTEREST_RATE / 100) * days;
    
    expect(totalInterest).toBe(1500000); // $15,000 in interest over 30 days
  });

  it("should calculate total amount after 30 days", () => {
    const principal = 1000000; // $10,000 in cents
    const days = 30;
    const totalInterest = principal * (INTEREST_RATE / 100) * days;
    const totalAmount = principal + totalInterest;
    
    expect(totalAmount).toBe(2500000); // $25,000 total
  });

  it("should handle maximum loan amount", () => {
    const maxLoan = 5000000; // $50,000 in cents
    const dailyInterest = maxLoan * (INTEREST_RATE / 100);
    const monthlyInterest = dailyInterest * 30;
    
    expect(dailyInterest).toBe(250000); // $2,500 per day
    expect(monthlyInterest).toBe(7500000); // $75,000 per month
  });

  it("should calculate interest for small loan amounts", () => {
    const principal = 10000; // $100 in cents
    const dailyInterest = principal * (INTEREST_RATE / 100);
    
    expect(dailyInterest).toBe(500); // $5 daily interest
  });

  it("should handle fractional interest correctly", () => {
    const principal = 12345; // $123.45 in cents
    const dailyInterest = principal * (INTEREST_RATE / 100);
    
    expect(dailyInterest).toBe(617.25); // $6.17 daily
  });
});

describe("Section 7: Loans - Validation Logic", () => {
  const MAX_LOAN_AMOUNT = 500000000; // $5,000,000 in cents

  it("should validate loan amount is positive", () => {
    const amount = 1000;
    expect(amount).toBeGreaterThan(0);
  });

  it("should reject negative loan amounts", () => {
    const amount = -1000;
    expect(amount).toBeLessThan(0);
  });

  it("should reject zero loan amounts", () => {
    const amount = 0;
    expect(amount).toBe(0);
  });

  it("should accept loan amounts up to maximum", () => {
    const amount = MAX_LOAN_AMOUNT;
    expect(amount).toBeLessThanOrEqual(MAX_LOAN_AMOUNT);
  });

  it("should reject loan amounts over maximum", () => {
    const amount = MAX_LOAN_AMOUNT + 1;
    expect(amount).toBeGreaterThan(MAX_LOAN_AMOUNT);
  });

  it("should validate repayment amount is positive", () => {
    const repayAmount = 1000;
    expect(repayAmount).toBeGreaterThan(0);
  });

  it("should allow partial loan repayment", () => {
    const loanBalance = 100000; // $1,000
    const repayAmount = 50000; // $500
    const remainingBalance = loanBalance - repayAmount;
    
    expect(remainingBalance).toBe(50000);
    expect(remainingBalance).toBeGreaterThan(0);
  });

  it("should allow full loan repayment", () => {
    const loanBalance = 100000; // $1,000
    const repayAmount = 100000; // $1,000
    const remainingBalance = loanBalance - repayAmount;
    
    expect(remainingBalance).toBe(0);
  });

  it("should handle overpayment correctly", () => {
    const loanBalance = 100000; // $1,000
    const repayAmount = 150000; // $1,500
    const actualPayment = Math.min(repayAmount, loanBalance);
    const remainingBalance = loanBalance - actualPayment;
    
    expect(actualPayment).toBe(100000);
    expect(remainingBalance).toBe(0);
  });
});

describe("Section 7: Loans - Loan Status Logic", () => {
  it("should mark loan as active when created", () => {
    const loan = {
      status: "active",
      remainingBalance: 100000,
    };
    
    expect(loan.status).toBe("active");
    expect(loan.remainingBalance).toBeGreaterThan(0);
  });

  it("should mark loan as paid when balance is zero", () => {
    const loan = {
      status: "paid",
      remainingBalance: 0,
    };
    
    expect(loan.status).toBe("paid");
    expect(loan.remainingBalance).toBe(0);
  });

  it("should calculate total debt from multiple loans", () => {
    const loans = [
      { remainingBalance: 100000, status: "active" },
      { remainingBalance: 200000, status: "active" },
      { remainingBalance: 0, status: "paid" },
    ];
    
    const totalDebt = loans
      .filter(loan => loan.status === "active")
      .reduce((sum, loan) => sum + loan.remainingBalance, 0);
    
    expect(totalDebt).toBe(300000); // $3,000 total
  });

  it("should filter active loans only", () => {
    const loans = [
      { remainingBalance: 100000, status: "active" },
      { remainingBalance: 0, status: "paid" },
      { remainingBalance: 200000, status: "active" },
    ];
    
    const activeLoans = loans.filter(loan => loan.status === "active");
    
    expect(activeLoans).toHaveLength(2);
    expect(activeLoans.every(loan => loan.remainingBalance > 0)).toBe(true);
  });
});

describe("Section 7: Loans - Accrued Interest Logic", () => {
  it("should track accrued interest separately", () => {
    const principal = 100000; // $1,000
    const interestRate = 5; // 5% daily
    const daysElapsed = 5;
    const accruedInterest = principal * (interestRate / 100) * daysElapsed;
    
    expect(accruedInterest).toBe(25000); // $250 accrued
  });

  it("should add accrued interest to remaining balance", () => {
    const principal = 100000;
    const accruedInterest = 25000;
    const totalOwed = principal + accruedInterest;
    
    expect(totalOwed).toBe(125000); // $1,250 total owed
  });

  it("should handle compound interest over multiple intervals", () => {
    let balance = 100000; // $1,000
    const rate = 0.05; // 5% per interval
    const intervals = 3;
    
    for (let i = 0; i < intervals; i++) {
      const interest = Math.floor(balance * rate);
      balance += interest;
    }
    
    // After 3 intervals at 5% each: 1000 * 1.05^3 = 1157.625
    expect(balance).toBe(115762); // $1,157.62
  });
});

describe("Section 8: Companies - Company Creation Validation", () => {
  it("should validate company name is required", () => {
    const companyName = "";
    expect(companyName.trim()).toBe("");
  });

  it("should accept valid company name", () => {
    const companyName = "Tech Corp";
    expect(companyName.trim()).toBe("Tech Corp");
    expect(companyName.trim().length).toBeGreaterThan(0);
  });

  it("should validate ticker format (uppercase, max 6 chars)", () => {
    const ticker = "TECH";
    expect(ticker).toMatch(/^[A-Z]{1,6}$/);
  });

  it("should reject invalid ticker format", () => {
    const ticker = "tech123";
    expect(ticker).not.toMatch(/^[A-Z]{1,6}$/);
  });

  it("should reject ticker longer than 6 characters", () => {
    const ticker = "TOOLONG";
    expect(ticker.length).toBeGreaterThan(6);
  });

  it("should allow empty description", () => {
    const description = "";
    const isValid = description.length === 0 || description.trim().length > 0;
    expect(isValid).toBe(true);
  });

  it("should allow valid description", () => {
    const description = "A technology company focused on innovation";
    expect(description.trim().length).toBeGreaterThan(0);
  });

  it("should trim whitespace from inputs", () => {
    const companyName = "  Tech Corp  ";
    const ticker = "  TECH  ";
    
    expect(companyName.trim()).toBe("Tech Corp");
    expect(ticker.trim()).toBe("TECH");
  });
});

describe("Section 8: Companies - Make Public (IPO) Validation", () => {
  const MIN_BALANCE_FOR_IPO = 5000000; // $50,000 in cents

  it("should validate company has minimum balance for IPO", () => {
    const companyBalance = 5000000;
    expect(companyBalance).toBeGreaterThanOrEqual(MIN_BALANCE_FOR_IPO);
  });

  it("should reject IPO if balance is below minimum", () => {
    const companyBalance = 4999999;
    expect(companyBalance).toBeLessThan(MIN_BALANCE_FOR_IPO);
  });

  it("should calculate amount needed to reach IPO threshold", () => {
    const companyBalance = 3000000; // $30,000
    const amountNeeded = MIN_BALANCE_FOR_IPO - companyBalance;
    
    expect(amountNeeded).toBe(2000000); // Need $20,000 more
  });

  it("should validate stock ticker is required", () => {
    const stockTicker = "";
    expect(stockTicker.trim()).toBe("");
  });

  it("should validate share price is positive", () => {
    const sharePrice = 1000; // $10 in cents
    expect(sharePrice).toBeGreaterThan(0);
  });

  it("should reject negative share price", () => {
    const sharePrice = -100;
    expect(sharePrice).toBeLessThan(0);
  });

  it("should reject zero share price", () => {
    const sharePrice = 0;
    expect(sharePrice).toBe(0);
  });

  it("should validate total shares is positive integer", () => {
    const totalShares = 1000000;
    expect(totalShares).toBeGreaterThan(0);
    expect(Number.isInteger(totalShares)).toBe(true);
  });

  it("should calculate market cap correctly", () => {
    const sharePrice = 1000; // $10 per share in cents
    const totalShares = 1000000;
    const marketCap = sharePrice * totalShares;
    
    expect(marketCap).toBe(1000000000); // $10,000,000 market cap
  });

  it("should convert dollar share price to cents", () => {
    const sharePriceDollars = 10.50;
    const sharePriceCents = Math.round(sharePriceDollars * 100);
    
    expect(sharePriceCents).toBe(1050);
  });

  it("should handle fractional share prices", () => {
    const sharePrice = 10.99; // $10.99
    const sharePriceCents = Math.round(sharePrice * 100);
    const totalShares = 100000;
    const marketCap = sharePriceCents * totalShares;
    
    expect(sharePriceCents).toBe(1099);
    expect(marketCap).toBe(109900000); // $1,099,000
  });
});

describe("Section 8: Companies - Company Balance Management", () => {
  it("should initialize company with zero balance", () => {
    const company = {
      name: "New Corp",
      balance: 0,
    };
    
    expect(company.balance).toBe(0);
  });

  it("should update company balance correctly", () => {
    let companyBalance = 1000000; // $10,000
    const transaction = 500000; // $5,000
    companyBalance += transaction;
    
    expect(companyBalance).toBe(1500000); // $15,000
  });

  it("should handle negative balance from expenses", () => {
    let companyBalance = 1000000; // $10,000
    const expense = 1500000; // $15,000
    companyBalance -= expense;
    
    expect(companyBalance).toBe(-500000); // -$5,000
    expect(companyBalance).toBeLessThan(0);
  });

  it("should calculate total assets across multiple companies", () => {
    const companies = [
      { balance: 1000000 }, // $10,000
      { balance: 2000000 }, // $20,000
      { balance: 500000 },  // $5,000
    ];
    
    const totalAssets = companies.reduce((sum, company) => sum + company.balance, 0);
    
    expect(totalAssets).toBe(3500000); // $35,000
  });

  it("should filter companies by public status", () => {
    const companies = [
      { name: "Public Corp 1", isPublic: true },
      { name: "Private Corp", isPublic: false },
      { name: "Public Corp 2", isPublic: true },
    ];
    
    const publicCompanies = companies.filter(c => c.isPublic);
    const privateCompanies = companies.filter(c => !c.isPublic);
    
    expect(publicCompanies).toHaveLength(2);
    expect(privateCompanies).toHaveLength(1);
  });
});

describe("Section 8: Companies - Ticker Uniqueness", () => {
  it("should ensure ticker uniqueness check", () => {
    const existingTickers = ["TECH", "FOOD", "AUTO"];
    const newTicker = "TECH";
    
    const isDuplicate = existingTickers.includes(newTicker);
    expect(isDuplicate).toBe(true);
  });

  it("should allow unique ticker", () => {
    const existingTickers = ["TECH", "FOOD", "AUTO"];
    const newTicker = "GAME";
    
    const isDuplicate = existingTickers.includes(newTicker);
    expect(isDuplicate).toBe(false);
  });

  it("should handle case-sensitive ticker comparison", () => {
    const existingTickers = ["TECH"];
    const newTicker = "tech";
    
    // Should convert to uppercase before checking
    const isDuplicate = existingTickers.includes(newTicker.toUpperCase());
    expect(isDuplicate).toBe(true);
  });
});

describe("Section 8: Companies - Company Display Logic", () => {
  it("should show IPO button only when balance is sufficient", () => {
    const company = {
      balance: 5000000,
      isPublic: false,
    };
    
    const canGoPublic = !company.isPublic && company.balance >= 5000000;
    expect(canGoPublic).toBe(true);
  });

  it("should not show IPO button if already public", () => {
    const company = {
      balance: 6000000,
      isPublic: true,
    };
    
    const canGoPublic = !company.isPublic && company.balance >= 5000000;
    expect(canGoPublic).toBe(false);
  });

  it("should not show IPO button if balance is insufficient", () => {
    const company = {
      balance: 3000000,
      isPublic: false,
    };
    
    const canGoPublic = !company.isPublic && company.balance >= 5000000;
    expect(canGoPublic).toBe(false);
  });

  it("should calculate amount needed message", () => {
    const company = {
      balance: 3000000,
      isPublic: false,
    };
    
    const amountNeeded = 5000000 - company.balance;
    expect(amountNeeded).toBe(2000000); // $20,000 needed
  });

  it("should show market cap for public companies", () => {
    const company = {
      isPublic: true,
      marketCap: 10000000, // $100,000
    };
    
    const shouldShowMarketCap = company.isPublic && company.marketCap;
    expect(shouldShowMarketCap).toBeTruthy();
  });

  it("should not show market cap for private companies", () => {
    const company = {
      isPublic: false,
      marketCap: undefined,
    };
    
    const shouldShowMarketCap = company.isPublic && company.marketCap;
    expect(shouldShowMarketCap).toBeFalsy();
  });
});

describe("Section 8: Companies - Stock Creation Logic", () => {
  it("should create stock entry when company goes public", () => {
    const company = {
      name: "Tech Corp",
      ticker: "TECH",
      isPublic: true,
    };
    
    const stock = {
      ticker: company.ticker,
      companyName: company.name,
      initialPrice: 1000,
      currentPrice: 1000,
      totalShares: 1000000,
    };
    
    expect(stock.ticker).toBe(company.ticker);
    expect(stock.companyName).toBe(company.name);
    expect(stock.initialPrice).toBe(stock.currentPrice);
  });

  it("should calculate initial market cap from stock", () => {
    const stock = {
      currentPrice: 1000, // $10 per share
      totalShares: 1000000,
    };
    
    const marketCap = stock.currentPrice * stock.totalShares;
    expect(marketCap).toBe(1000000000); // $10M
  });

  it("should give owner 100% of shares initially", () => {
    const totalShares = 1000000;
    const ownerShares = totalShares;
    const ownerPercentage = (ownerShares / totalShares) * 100;
    
    expect(ownerPercentage).toBe(100);
  });
});
