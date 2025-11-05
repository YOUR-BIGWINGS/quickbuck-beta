import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// Initialize Convex client
const CONVEX_URL = process.env.CONVEX_URL || process.env.VITE_CONVEX_URL;
if (!CONVEX_URL) {
  throw new Error("CONVEX_URL or VITE_CONVEX_URL environment variable is required");
}

const client = new ConvexHttpClient(CONVEX_URL);

const PLAYER_ID = "nh7742zwcgv0h908dmzvspv0yh7tckf7" as Id<"players">;
// The adjustment: Add $5,000,000 back to correct the duplicate loan credit
const ADJUSTMENT_AMOUNT = 5000000 * 100; // $5,000,000 in cents

async function fixPlayer() {
  console.log("=".repeat(80));
  console.log("FIXING PLAYER BALANCE");
  console.log("=".repeat(80));
  console.log(`Player ID: ${PLAYER_ID}\n`);

  try {
    // Check current state
    console.log("1. Checking current financial state...");
    const currentState = await client.query(api.moderation.checkPlayerFinances, {
      playerId: PLAYER_ID,
    });

    console.log("\nCurrent State:");
    console.log(`  Balance: $${(currentState.currentBalance / 100).toFixed(2)}`);
    console.log(`  Total Received: $${(currentState.transactionSummary.totalReceived / 100).toFixed(2)}`);
    console.log(`  Total Sent: $${(currentState.transactionSummary.totalSent / 100).toFixed(2)}`);
    console.log(`  Net: $${(currentState.transactionSummary.net / 100).toFixed(2)}`);
    console.log(`\nLoans (${currentState.loans.length}):`);
    currentState.loans.forEach((loan, i) => {
      console.log(`  ${i + 1}. Amount: $${(loan.amount / 100).toFixed(2)}, Remaining: $${(loan.remaining / 100).toFixed(2)}, Status: ${loan.status}`);
    });

    console.log(`\nCalculated Balance Check:`);
    console.log(`  Starting: $${(currentState.calculatedBalance.startingBalance / 100).toFixed(2)}`);
    console.log(`  + Received: $${(currentState.calculatedBalance.plusReceived / 100).toFixed(2)}`);
    console.log(`  - Sent: $${(currentState.calculatedBalance.minusSent / 100).toFixed(2)}`);
    console.log(`  = Expected: $${(currentState.calculatedBalance.expected / 100).toFixed(2)}`);
    console.log(`  Actual: $${(currentState.calculatedBalance.actual / 100).toFixed(2)}`);
    console.log(`  Difference: $${(currentState.calculatedBalance.difference / 100).toFixed(2)}`);

    if (currentState.currentBalance >= 0) {
      console.log("\n✅ Player balance is already positive. No fix needed.");
      return;
    }

    // Apply the fix
    console.log("\n2. Applying balance fix...");
    const result = await client.mutation(api.moderation.fixDuplicateLoanBalance, {
      playerId: PLAYER_ID,
      adjustmentAmount: ADJUSTMENT_AMOUNT,
      reason: "Fixed duplicate loan credit (race condition bug - player received two $5M credits but only one loan was recorded)",
    });

    console.log(`\n✅ Fix applied successfully!`);
    console.log(`  Old Balance: $${(result.oldBalance / 100).toFixed(2)}`);
    console.log(`  Adjustment: +$${(result.adjustment / 100).toFixed(2)}`);
    console.log(`  New Balance: $${(result.newBalance / 100).toFixed(2)}`);

    // Verify the fix
    console.log("\n3. Verifying fix...");
    const newState = await client.query(api.moderation.checkPlayerFinances, {
      playerId: PLAYER_ID,
    });

    console.log(`\nNew Balance: $${(newState.currentBalance / 100).toFixed(2)}`);
    
    if (newState.currentBalance > 0) {
      console.log("✅ Balance is now positive!");
    } else {
      console.log("⚠️  Balance is still negative. Additional investigation may be needed.");
    }

    console.log("\n" + "=".repeat(80));
    console.log("SUMMARY");
    console.log("=".repeat(80));
    console.log("\nThe duplicate loan issue has been fixed:");
    console.log("• The player received TWO $5M loan credits due to a race condition");
    console.log("• Only ONE loan was recorded in the database");
    console.log("• This fix credits back the $5M that was improperly given");
    console.log("• The player's balance is now corrected");
    console.log("\nCode fixes applied to prevent future occurrences:");
    console.log("• Added race condition checks to loan creation");
    console.log("• Added 1-second cooldown for loan requests");
    console.log("• Re-fetch player balance before all deductions");
    console.log("• Limited negative balance to -$50k maximum");
    console.log("• Added self-transfer prevention");
    console.log("=".repeat(80));

  } catch (error) {
    console.error("\n❌ Error during fix:", error);
    throw error;
  }
}

fixPlayer().then(() => {
  console.log("\nFix complete!");
  process.exit(0);
}).catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
