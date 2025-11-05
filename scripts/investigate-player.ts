import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// Initialize Convex client
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("CONVEX_URL or VITE_CONVEX_URL environment variable is required");
}

const client = new ConvexHttpClient(CONVEX_URL);

const PLAYER_ID = "nh7bpj2xf1b9qw7x3gx803gr7h7tfqk7" as Id<"players">;

async function investigatePlayer() {
  console.log("=".repeat(80));
  console.log("PLAYER INVESTIGATION REPORT");
  console.log("=".repeat(80));
  console.log(`Player ID: ${PLAYER_ID}\n`);

  try {
    // 1. Get player basic info
    console.log("1. PLAYER BASIC INFO");
    console.log("-".repeat(80));
    const player = await client.query(api.players.getPlayer, { playerId: PLAYER_ID });
    if (!player) {
      console.log("❌ ERROR: Player not found!");
      return;
    }
    console.log(`Balance: $${(player.balance / 100).toFixed(2)}`);
    console.log(`Net Worth: $${(player.netWorth / 100).toFixed(2)}`);
    console.log(`Role: ${player.role || "normal"}`);
    console.log(`Created: ${new Date(player.createdAt).toISOString()}`);
    console.log(`Updated: ${new Date(player.updatedAt).toISOString()}`);
    console.log();

    // 2. Get all transactions
    console.log("2. TRANSACTION HISTORY");
    console.log("-".repeat(80));
    const transactions = await client.query(api.transactions.getPlayerTransactionHistory, {
      playerId: PLAYER_ID,
    });
    console.log(`Total Transactions: ${transactions.length}`);
    
    let totalReceived = 0;
    let totalSent = 0;
    
    console.log("\nRecent Transactions:");
    transactions.slice(0, 20).forEach((tx, i) => {
      const isReceived = tx.toAccountId === PLAYER_ID;
      const isSent = tx.fromAccountId === PLAYER_ID;
      
      if (isReceived) totalReceived += tx.amount;
      if (isSent) totalSent += tx.amount;
      
      console.log(`\n  [${i + 1}] ${new Date(tx.createdAt).toISOString()}`);
      console.log(`      Type: ${tx.assetType}`);
      console.log(`      Amount: $${(tx.amount / 100).toFixed(2)}`);
      console.log(`      Direction: ${isReceived ? "RECEIVED" : "SENT"}`);
      console.log(`      From: ${tx.fromAccountId} (${tx.fromAccountType})`);
      console.log(`      To: ${tx.toAccountId} (${tx.toAccountType})`);
      console.log(`      Description: ${tx.description}`);
    });
    
    console.log(`\nTransaction Summary:`);
    console.log(`  Total Received: $${(totalReceived / 100).toFixed(2)}`);
    console.log(`  Total Sent: $${(totalSent / 100).toFixed(2)}`);
    console.log(`  Net: $${((totalReceived - totalSent) / 100).toFixed(2)}`);
    console.log();

    // 3. Get loans
    console.log("3. LOANS");
    console.log("-".repeat(80));
    const loans = await client.query(api.loans.getPlayerLoans, { playerId: PLAYER_ID });
    console.log(`Total Loans: ${loans.length}`);
    
    let totalDebt = 0;
    loans.forEach((loan, i) => {
      console.log(`\n  Loan ${i + 1}:`);
      console.log(`    Original Amount: $${(loan.amount / 100).toFixed(2)}`);
      console.log(`    Remaining: $${(loan.remainingBalance / 100).toFixed(2)}`);
      console.log(`    Accrued Interest: $${(loan.accruedInterest / 100).toFixed(2)}`);
      console.log(`    Interest Rate: ${loan.interestRate}%`);
      console.log(`    Status: ${loan.status}`);
      console.log(`    Created: ${new Date(loan.createdAt).toISOString()}`);
      console.log(`    Last Interest: ${new Date(loan.lastInterestApplied).toISOString()}`);
      
      if (loan.status === "active") {
        totalDebt += loan.remainingBalance;
      }
    });
    console.log(`\nTotal Active Debt: $${(totalDebt / 100).toFixed(2)}`);
    console.log();

    // 4. Stock holdings removed
    console.log("4. STOCK HOLDINGS (REMOVED)");
    console.log("-".repeat(80));
    console.log("Stock market functionality has been removed.");
    const totalStockValue = 0;
    console.log();

    // 5. Get companies
    console.log("5. OWNED COMPANIES");
    console.log("-".repeat(80));
    const companies = await client.query(api.companies.getPlayerCompanies, {
      playerId: PLAYER_ID,
    });
    console.log(`Total Companies: ${companies.length}`);
    
    let totalCompanyValue = 0;
    companies.forEach((company, i) => {
      const companyValue = company.balance;
      totalCompanyValue += companyValue;
      
      console.log(`\n  Company ${i + 1}: ${company.name}`);
      console.log(`    Balance: $${(company.balance / 100).toFixed(2)}`);
      console.log(`    Total Value: $${(companyValue / 100).toFixed(2)}`);
      console.log(`    Public: ${company.isPublic}`);
    });
    console.log(`\nTotal Company Value: $${(totalCompanyValue / 100).toFixed(2)}`);
    console.log();

    // 7. Get gambling history (skip - requires auth)
    console.log("7. GAMBLING HISTORY");
    console.log("-".repeat(80));
    console.log("Skipped (requires authentication)");
    console.log();

    // 8. Check for active blackjack game (skip for now - requires auth)
    console.log("8. ACTIVE BLACKJACK GAMES");
    console.log("-".repeat(80));
    console.log("Skipped (requires authentication)");
    console.log();

    // 9. ANALYSIS SUMMARY
    console.log("=".repeat(80));
    console.log("ANALYSIS SUMMARY");
    console.log("=".repeat(80));
    
    const calculatedBalance = player.balance;
    const calculatedNetWorth = calculatedBalance + totalStockValue + totalCompanyValue - totalDebt;
    
    console.log(`Current Balance: $${(player.balance / 100).toFixed(2)}`);
    console.log(`Calculated Net Worth: $${(calculatedNetWorth / 100).toFixed(2)}`);
    console.log(`Reported Net Worth: $${(player.netWorth / 100).toFixed(2)}`);
    console.log();
    console.log("Components:");
    console.log(`  + Cash Balance: $${(calculatedBalance / 100).toFixed(2)}`);
    console.log(`  + Stock Value: $${(totalStockValue / 100).toFixed(2)}`);
    console.log(`  + Company Value: $${(totalCompanyValue / 100).toFixed(2)}`);
    console.log(`  - Active Debt: $${(totalDebt / 100).toFixed(2)}`);
    console.log();
    
    if (player.balance < 0) {
      console.log("❌ ISSUE FOUND: Player has NEGATIVE BALANCE!");
      console.log(`   Balance: $${(player.balance / 100).toFixed(2)}`);
      console.log();
      console.log("Possible Causes:");
      console.log("  1. Loan interest accrual allowing negative balance");
      console.log("  2. Race condition in transactions");
      console.log("  3. Insufficient balance check missing in some mutation");
      console.log("  4. Blackjack game state issue");
      console.log("  5. Transfer exploit");
    }
    
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error during investigation:", error);
  }
}

investigatePlayer().then(() => {
  console.log("\nInvestigation complete!");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
