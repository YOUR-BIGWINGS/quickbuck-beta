/**
 * Test script to manually trigger a tick and verify stock prices are updating
 * Run with: node scripts/test-tick.js
 */

import { ConvexHttpClient } from "convex/browser";

// Load your Convex URL from environment
const CONVEX_URL =
  process.env.VITE_CONVEX_URL || "https://exuberant-donkey-345.convex.cloud";

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log("🚀 Testing tick execution...");
  console.log(`Connected to: ${CONVEX_URL}\n`);

  try {
    // Get last tick before execution
    console.log("📊 Fetching tick history...");
    const historyBefore = await client.query("tick:getTickHistory");
    const lastTickBefore = historyBefore?.[0];

    if (lastTickBefore) {
      console.log(`Last tick: #${lastTickBefore.tickNumber}`);
      console.log(
        `Timestamp: ${new Date(lastTickBefore.timestamp).toLocaleString()}`
      );
      console.log(
        `Time ago: ${Math.round(
          (Date.now() - lastTickBefore.timestamp) / 1000 / 60
        )} minutes ago\n`
      );
    } else {
      console.log("No ticks found in history\n");
    }

    // Execute a manual tick
    console.log("⚡ Executing manual tick...");
    const result = await client.mutation("tick:manualTick");

    console.log("\n✅ Tick completed successfully!");
    console.log(`Tick Number: #${result.tickNumber}`);
    console.log(`Bot Purchases: ${result.botPurchases}`);
    console.log(`Stock Updates: ${result.stockUpdates}`);
    console.log(`Crypto Updates: ${result.cryptoUpdates}`);

    // Get stock prices to verify they updated
    console.log("\n📈 Checking stock prices...");
    const stocks = await client.query("stocks:getAllStocks");

    if (stocks && stocks.length > 0) {
      console.log(`\nFound ${stocks.length} stocks:`);
      stocks.slice(0, 5).forEach((stock) => {
        const price = stock.price / 100;
        const prevPrice = stock.previousPrice / 100;
        const change =
          prevPrice > 0
            ? (((price - prevPrice) / prevPrice) * 100).toFixed(2)
            : 0;
        console.log(
          `  ${stock.ticker}: $${price.toFixed(2)} (${
            change > 0 ? "+" : ""
          }${change}%)`
        );
      });
    }

    console.log("\n✨ Test completed!");
    console.log("\n💡 Next steps:");
    console.log(
      "  1. Wait 5 minutes and run this script again to verify cron is working"
    );
    console.log("  2. Check your admin dashboard at /admin/tick");
    console.log("  3. Monitor the Convex dashboard for cron execution logs");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error("\nTroubleshooting:");
    console.error("  1. Ensure Convex deployment is running: npx convex dev");
    console.error("  2. Check CONVEX_URL is correct in .env.local");
    console.error("  3. Verify functions are deployed: npx convex dev --once");
  }
}

main();
