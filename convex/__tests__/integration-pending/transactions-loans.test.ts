import { convexTest } from "convex-test";
import { describe, expect, it, beforeEach } from "vitest";
import { api } from "../_generated/api";
import schema from "../schema";

describe("Transaction Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let companyId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
      });
    });
    
    playerId = await t.mutation(api.players.createPlayer, { userId });
    
    companyId = await t.mutation(api.companies.createCompany, {
      ownerId: playerId,
      name: "Test Company",
    });
  });

  it("should create a transaction record", async () => {
    const txId = await t.mutation(api.transactions.createTransaction, {
      fromAccountId: playerId,
      fromAccountType: "player",
      toAccountId: companyId,
      toAccountType: "company",
      amount: 50000, // $500
      type: "transfer",
      description: "Test transfer",
    });
    
    const tx = await t.query(api.transactions.getTransaction, {
      transactionId: txId,
    });
    
    expect(tx).toBeDefined();
    expect(tx.fromAccountId).toBe(playerId);
    expect(tx.toAccountId).toBe(companyId);
    expect(tx.amount).toBe(50000);
    expect(tx.type).toBe("transfer");
  });

  it("should transfer cash between accounts", async () => {
    const initialPlayerBalance = (await t.query(api.players.getPlayer, { playerId })).balance;
    const initialCompanyBalance = (await t.query(api.companies.getCompany, { companyId })).balance;
    
    await t.mutation(api.transactions.transferCash, {
      fromAccountId: playerId,
      fromAccountType: "player",
      toAccountId: companyId,
      toAccountType: "company",
      amount: 100000, // $1,000
      description: "Investment",
    });
    
    const player = await t.query(api.players.getPlayer, { playerId });
    const company = await t.query(api.companies.getCompany, { companyId });
    
    expect(player.balance).toBe(initialPlayerBalance - 100000);
    expect(company.balance).toBe(initialCompanyBalance + 100000);
  });

  it("should fail transfer if insufficient balance", async () => {
    await expect(
      t.mutation(api.transactions.transferCash, {
        fromAccountId: playerId,
        fromAccountType: "player",
        toAccountId: companyId,
        toAccountType: "company",
        amount: 10000000, // $100k (more than starting balance)
        description: "Too much",
      })
    ).rejects.toThrow("Insufficient balance");
  });

  it("should get player transaction history", async () => {
    // Make some transactions
    await t.mutation(api.transactions.transferCash, {
      fromAccountId: playerId,
      fromAccountType: "player",
      toAccountId: companyId,
      toAccountType: "company",
      amount: 10000,
      description: "Transfer 1",
    });
    
    await t.mutation(api.transactions.transferCash, {
      fromAccountId: playerId,
      fromAccountType: "player",
      toAccountId: companyId,
      toAccountType: "company",
      amount: 20000,
      description: "Transfer 2",
    });
    
    const history = await t.query(api.transactions.getPlayerTransactionHistory, {
      playerId,
    });
    
    expect(history.length).toBeGreaterThanOrEqual(2);
  });

  it("should get company transaction history", async () => {
    await t.mutation(api.transactions.transferCash, {
      fromAccountId: playerId,
      fromAccountType: "player",
      toAccountId: companyId,
      toAccountType: "company",
      amount: 10000,
      description: "To company",
    });
    
    const history = await t.query(api.transactions.getCompanyTransactionHistory, {
      companyId,
    });
    
    expect(history.length).toBeGreaterThanOrEqual(1);
  });

  it("should get recent transactions", async () => {
    await t.mutation(api.transactions.transferCash, {
      fromAccountId: playerId,
      fromAccountType: "player",
      toAccountId: companyId,
      toAccountType: "company",
      amount: 10000,
      description: "Recent",
    });
    
    const recent = await t.query(api.transactions.getRecentTransactions, {
      limit: 10,
    });
    
    expect(recent.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Loan Operations", () => {
  let t: any;
  let userId: any;
  let playerId: any;
  let loanId: any;

  beforeEach(async () => {
    t = convexTest(schema);
    
    userId = await t.run(async (ctx: any) => {
      return await ctx.db.insert("users", {
        tokenIdentifier: "test-user-123",
        name: "Test User",
      });
    });
    
    playerId = await t.mutation(api.players.createPlayer, { userId });
  });

  it("should create a loan", async () => {
    loanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 500000, // $5,000
      interestRate: 0.05, // 5%
    });
    
    const loan = await t.query(api.loans.getLoan, { loanId });
    
    expect(loan).toBeDefined();
    expect(loan.playerId).toBe(playerId);
    expect(loan.principalAmount).toBe(500000);
    expect(loan.remainingAmount).toBe(500000);
    expect(loan.interestRate).toBe(0.05);
    expect(loan.isRepaid).toBe(false);
    
    // Player balance should increase
    const player = await t.query(api.players.getPlayer, { playerId });
    expect(player.balance).toBe(1500000); // $10k + $5k loan
  });

  it("should not allow loan exceeding $5M", async () => {
    await expect(
      t.mutation(api.loans.createLoan, {
        playerId,
        amount: 600000000, // $6M
        interestRate: 0.05,
      })
    ).rejects.toThrow("cannot exceed");
  });

  it("should repay loan", async () => {
    loanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 500000,
      interestRate: 0.05,
    });
    
    // Repay $2,000
    await t.mutation(api.loans.repayLoan, {
      loanId,
      amount: 200000,
    });
    
    const loan = await t.query(api.loans.getLoan, { loanId });
    expect(loan.remainingAmount).toBe(300000); // $5k - $2k
    
    // Player balance should decrease
    const player = await t.query(api.players.getPlayer, { playerId });
    expect(player.balance).toBe(1300000); // $10k + $5k - $2k
  });

  it("should mark loan as repaid when fully paid", async () => {
    loanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000, // $1k
      interestRate: 0.05,
    });
    
    // Repay full amount
    await t.mutation(api.loans.repayLoan, {
      loanId,
      amount: 100000,
    });
    
    const loan = await t.query(api.loans.getLoan, { loanId });
    expect(loan.remainingAmount).toBe(0);
    expect(loan.isRepaid).toBe(true);
  });

  it("should fail to repay if insufficient balance", async () => {
    loanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000,
      interestRate: 0.05,
    });
    
    await expect(
      t.mutation(api.loans.repayLoan, {
        loanId,
        amount: 10000000, // More than balance
      })
    ).rejects.toThrow("Insufficient balance");
  });

  it("should apply loan interest", async () => {
    loanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000, // $1,000
      interestRate: 0.05, // 5% daily
    });
    
    // Apply interest (5% / 72 intervals per 20min tick)
    await t.mutation(api.loans.applyLoanInterest, { loanId });
    
    const loan = await t.query(api.loans.getLoan, { loanId });
    
    // Interest per interval = 5% / 72 ≈ 0.0694%
    // New amount ≈ $1,000 × 1.000694 ≈ $1,000.69
    expect(loan.remainingAmount).toBeGreaterThan(100000);
    expect(loan.remainingAmount).toBeLessThan(101000); // Should be small increase
  });

  it("should get player loans", async () => {
    const loan1Id = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000,
      interestRate: 0.05,
    });
    
    const loan2Id = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 200000,
      interestRate: 0.05,
    });
    
    const loans = await t.query(api.loans.getPlayerLoans, { playerId });
    
    expect(loans.length).toBe(2);
    expect(loans.map((l: any) => l._id)).toContain(loan1Id);
    expect(loans.map((l: any) => l._id)).toContain(loan2Id);
  });

  it("should get player active loans only", async () => {
    const activeLoanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000,
      interestRate: 0.05,
    });
    
    const repaidLoanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 50000,
      interestRate: 0.05,
    });
    
    // Repay second loan
    await t.mutation(api.loans.repayLoan, {
      loanId: repaidLoanId,
      amount: 50000,
    });
    
    const activeLoans = await t.query(api.loans.getPlayerActiveLoans, { playerId });
    
    expect(activeLoans.length).toBe(1);
    expect(activeLoans[0]._id).toBe(activeLoanId);
  });

  it("should calculate total player debt", async () => {
    await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000, // $1k
      interestRate: 0.05,
    });
    
    await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 200000, // $2k
      interestRate: 0.05,
    });
    
    const totalDebt = await t.query(api.loans.getPlayerTotalDebt, { playerId });
    
    expect(totalDebt).toBe(300000); // $3k total
  });

  it("should not count repaid loans in total debt", async () => {
    await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 100000,
      interestRate: 0.05,
    });
    
    const repaidLoanId = await t.mutation(api.loans.createLoan, {
      playerId,
      amount: 200000,
      interestRate: 0.05,
    });
    
    // Repay second loan
    await t.mutation(api.loans.repayLoan, {
      loanId: repaidLoanId,
      amount: 200000,
    });
    
    const totalDebt = await t.query(api.loans.getPlayerTotalDebt, { playerId });
    
    expect(totalDebt).toBe(100000); // Only $1k from active loan
  });
});
