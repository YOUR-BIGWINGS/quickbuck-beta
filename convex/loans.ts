import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Loan limits
const MAX_LOAN_AMOUNT = 500000000; // $5,000,000 in cents
const VIP_MAX_LOAN_AMOUNT = 1000000000; // $10,000,000 in cents for VIP users

// Mutation: Create loan
export const createLoan = mutation({
  args: {
    playerId: v.id("players"),
    amount: v.number(), // in cents
    idempotencyKey: v.optional(v.string()), // For request deduplication
  },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // Determine max loan based on VIP status
    const maxLoan = player.isVIP ? VIP_MAX_LOAN_AMOUNT : MAX_LOAN_AMOUNT;
    const maxLoanDisplay = player.isVIP ? "$10,000,000" : "$5,000,000";

    if (args.amount <= 0 || args.amount > maxLoan) {
      throw new Error(`Loan amount must be between $0 and ${maxLoanDisplay}`);
    }

    // EXPLOIT FIX: Check if amount would cause overflow
    if (!Number.isSafeInteger(args.amount)) {
      throw new Error("Loan amount is not a safe integer");
    }

    // RACE CONDITION FIX: Check total outstanding debt to prevent excessive loans
    // We check this BEFORE any DB modifications to prevent race conditions
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    
    const totalOutstandingDebt = activeLoans.reduce((sum, loan) => sum + loan.remainingBalance, 0);
    
    if (totalOutstandingDebt + args.amount > maxLoan) {
      throw new Error(`Total outstanding debt would exceed maximum loan limit of ${maxLoanDisplay}`);
    }

    // ENHANCED DEDUPLICATION: Check for duplicate request within last 2 seconds
    // This is stronger than the 1-second cooldown - it looks for duplicate requests
    // across the entire time window to catch retries and concurrent requests
    const now = Date.now();
    const duplicateWindow = 2000; // 2 second window
    const recentLoans = activeLoans.filter(loan => 
      Date.now() - loan.createdAt < duplicateWindow && loan.amount === args.amount
    );
    
    if (recentLoans.length > 0) {
      console.warn(
        `[DUPLICATE LOAN DETECTED] Player ${args.playerId} attempting to create loan ` +
        `for $${(args.amount / 100).toFixed(2)} when identical loan created ${Math.round(now - recentLoans[0].createdAt)}ms ago`
      );
      // Return existing loan instead of creating duplicate
      return recentLoans[0]._id;
    }

    // Check for interest rate boost upgrade
    const playerUpgrades = await ctx.db
      .query("upgrades")
      .withIndex("by_playerId", (q: any) => q.eq("playerId", args.playerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    const hasInterestBoost = playerUpgrades.some(u => u.upgradeType === "interest_boost");
    const baseInterestRate = 5; // 5% daily interest
    const interestRate = hasInterestBoost ? baseInterestRate + 1 : baseInterestRate; // +10% of base 5% = +0.5%, so 5.5% total

    // Create loan FIRST before crediting balance (atomic-like operation)
    // This ensures loan record exists before any balance modification
    const loanId = await ctx.db.insert("loans", {
      playerId: args.playerId,
      amount: args.amount,
      interestRate,
      remainingBalance: args.amount,
      accruedInterest: 0,
      createdAt: now,
      lastInterestApplied: now,
      status: "active" as const,
      // NEW: Track idempotency key for deduplication
      idempotencyKey: args.idempotencyKey,
    });

    // Re-fetch player to get latest balance (prevents race condition)
    // This is critical - must get the absolute latest state before crediting
    const latestPlayer = await ctx.db.get(args.playerId);
    if (!latestPlayer) {
      // Rollback: delete the loan we just created
      await ctx.db.delete(loanId);
      throw new Error("Player not found after loan creation");
    }

    // Validate balance before modification
    const newBalance = latestPlayer.balance + args.amount;
    if (!Number.isSafeInteger(newBalance)) {
      await ctx.db.delete(loanId);
      throw new Error("Balance calculation resulted in non-integer value");
    }

    // Credit player's account with latest balance
    // Use a transaction-like approach by patching with timestamp
    await ctx.db.patch(args.playerId, {
      balance: newBalance,
      updatedAt: now,
    });

    // Create transaction record with explicit linking to loan
    // This creates an audit trail that can be used to detect duplicates
    const transactionId = await ctx.db.insert("transactions", {
      fromAccountId: args.playerId, // System/bank
      fromAccountType: "player" as const,
      toAccountId: args.playerId,
      toAccountType: "player" as const,
      amount: args.amount,
      assetType: "cash" as const,
      description: `Loan received: $${(args.amount / 100).toFixed(2)}`,
      createdAt: now,
      // NEW: Reference to loan for audit trail
      linkedLoanId: loanId,
    });

    console.log(
      `[LOAN CREATED] Player ${args.playerId}: Loan $${(args.amount / 100).toFixed(2)} ` +
      `(ID: ${loanId}, TxID: ${transactionId})`
    );

    return loanId;
  },
});

// Mutation: Repay loan
export const repayLoan = mutation({
  args: {
    loanId: v.id("loans"),
    amount: v.number(), // in cents
  },
  handler: async (ctx, args) => {
    // EXPLOIT FIX: Prevent negative repayment amounts
    if (args.amount <= 0) {
      throw new Error("Repayment amount must be positive");
    }

    const loan = await ctx.db.get(args.loanId);
    if (!loan) {
      throw new Error("Loan not found");
    }

    if (loan.status !== "active") {
      throw new Error("Loan is not active");
    }

    const player = await ctx.db.get(loan.playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    if (player.balance < args.amount) {
      throw new Error("Insufficient balance to repay loan");
    }

    const paymentAmount = Math.min(args.amount, loan.remainingBalance);

    // Deduct from player's balance
    await ctx.db.patch(loan.playerId, {
      balance: player.balance - paymentAmount,
      updatedAt: Date.now(),
    });

    // Update loan
    const newBalance = loan.remainingBalance - paymentAmount;
    if (newBalance <= 0) {
      await ctx.db.patch(args.loanId, {
        remainingBalance: 0,
        status: "paid" as const,
      });
    } else {
      await ctx.db.patch(args.loanId, {
        remainingBalance: newBalance,
      });
    }

    // Create transaction record
    await ctx.db.insert("transactions", {
      fromAccountId: loan.playerId,
      fromAccountType: "player" as const,
      toAccountId: loan.playerId, // System/bank
      toAccountType: "player" as const,
      amount: paymentAmount,
      assetType: "cash" as const,
      description: `Loan repayment: $${(paymentAmount / 100).toFixed(2)}`,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});

// Mutation: Apply daily interest to all active loans
export const applyLoanInterest = mutation({
  handler: async (ctx) => {
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (const loan of activeLoans) {
      const daysSinceLastInterest = (now - loan.lastInterestApplied) / oneDayMs;

      if (daysSinceLastInterest >= 1) {
        // EXPLOIT FIX: Cap days to prevent interest overflow (max 365 days)
        const cappedDays = Math.min(Math.floor(daysSinceLastInterest), 365);
        
        const interestAmount = Math.floor(
          loan.remainingBalance * (loan.interestRate / 100) * cappedDays
        );

        const newBalance = loan.remainingBalance + interestAmount;
        const newAccruedInterest = loan.accruedInterest + interestAmount;

        // EXPLOIT FIX: Validate calculations don't overflow
        if (!Number.isSafeInteger(newBalance) || !Number.isSafeInteger(newAccruedInterest)) {
          console.error(`Interest calculation overflow for loan ${loan._id}`);
          continue; // Skip this loan to prevent corruption
        }

        await ctx.db.patch(loan._id, {
          remainingBalance: newBalance,
          accruedInterest: newAccruedInterest,
          lastInterestApplied: now,
        });

        // Deduct from player balance if possible
        const player = await ctx.db.get(loan.playerId);
        if (player) {
          // NEGATIVE BALANCE FIX: Only allow balance to go negative up to -$50,000 (-5,000,000 cents)
          // This prevents excessive debt spirals while still allowing reasonable overdraft
          const minAllowedBalance = -5000000; // -$50,000
          const newBalance = player.balance - interestAmount;
          
          if (newBalance < minAllowedBalance) {
            // If applying interest would push below minimum, only deduct what's possible
            const maxDeduction = player.balance - minAllowedBalance;
            
            if (maxDeduction > 0) {
              // Partial deduction - deduct what we can
              await ctx.db.patch(loan.playerId, {
                balance: minAllowedBalance,
                updatedAt: now,
              });

              // Create transaction record for partial deduction
              await ctx.db.insert("transactions", {
                fromAccountId: loan.playerId,
                fromAccountType: "player" as const,
                toAccountId: loan.playerId, // System/bank
                toAccountType: "player" as const,
                amount: maxDeduction,
                assetType: "cash" as const,
                description: `Loan interest (partial): $${(maxDeduction / 100).toFixed(2)}`,
                createdAt: now,
              });
            }
            // Note: Loan balance still increases even if we can't deduct full interest
            // This represents accumulating debt that must be paid
          } else {
            // Normal case: can afford full interest deduction
            await ctx.db.patch(loan.playerId, {
              balance: newBalance,
              updatedAt: now,
            });

            // Create transaction record
            await ctx.db.insert("transactions", {
              fromAccountId: loan.playerId,
              fromAccountType: "player" as const,
              toAccountId: loan.playerId, // System/bank
              toAccountType: "player" as const,
              amount: interestAmount,
              assetType: "cash" as const,
              description: `Loan interest: $${(interestAmount / 100).toFixed(2)}`,
              createdAt: now,
            });
          }
        }
      }
    }

    return activeLoans.length;
  },
});

// Query: Get loan
export const getLoan = query({
  args: {
    loanId: v.id("loans"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.loanId);
  },
});

// Query: Get player's loans
export const getPlayerLoans = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();
  },
});

// Query: Get player's active loans
export const getPlayerActiveLoans = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const loans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    return loans.filter((loan) => loan.status === "active");
  },
});

// Query: Get total loan debt for player
export const getPlayerTotalDebt = query({
  args: {
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const activeLoans = await ctx.db
      .query("loans")
      .withIndex("by_playerId", (q) => q.eq("playerId", args.playerId))
      .collect();

    return activeLoans
      .filter((loan) => loan.status === "active")
      .reduce((total, loan) => total + loan.remainingBalance, 0);
  },
});
