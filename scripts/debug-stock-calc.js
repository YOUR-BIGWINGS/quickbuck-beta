import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = "https://exuberant-donkey-345.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  console.log("🔍 Debugging stock price calculation...\n");

  try {
    // Get the problematic stock
    const stocks = await client.query("stocks:getAllStocks");
    const stock = stocks[0];

    console.log("Stock Details:");
    console.log(`  Ticker: ${stock.ticker}`);
    console.log(`  ID: ${stock._id}`);
    console.log(`  Price: $${(stock.price / 100).toFixed(2)}`);
    console.log(`  Previous Price: $${(stock.previousPrice / 100).toFixed(2)}`);
    console.log(`  Total Shares: ${stock.totalShares}`);
    console.log(`  Market Cap: $${(stock.marketCap / 100).toFixed(2)}`);
    console.log(`  Company ID: ${stock.companyId}\n`);

    // Get the company details
    console.log("Fetching company details...");
    // We need to use a different approach since we can't query by ID directly

    console.log("\nChecking calculation variables:");
    console.log(`  currentPrice: ${stock.price} (${typeof stock.price})`);
    console.log(`  isFinite: ${Number.isFinite(stock.price)}`);
    console.log(`  > 0: ${stock.price > 0}`);
    console.log(
      `  totalShares: ${stock.totalShares} (${typeof stock.totalShares})`
    );
    console.log(`  totalShares > 0: ${stock.totalShares > 0}`);

    // Try to reproduce the calculation
    const currentPrice = stock.price;

    // Simulate the algorithm
    const volatility = 0.6; // default
    const tickVolatility = volatility / Math.sqrt(105120);

    console.log(`\nSimulating price calculation:`);
    console.log(`  volatility: ${volatility}`);
    console.log(`  tickVolatility: ${tickVolatility}`);

    const random1 = Math.random() * 2 - 1;
    const random2 = Math.random() * 2 - 1;
    const shortTermNoise = random1 * tickVolatility;
    const mediumTermNoise = random2 * tickVolatility * 0.5;
    const combinedNoise = shortTermNoise + mediumTermNoise;

    console.log(`  combinedNoise: ${combinedNoise}`);

    const trendSeed = (Date.now() / 3600000 + stock._id.slice(-4)) % 100;
    const trendBias = Math.sin(trendSeed * 0.1) * tickVolatility * 0.3;

    console.log(`  trendBias: ${trendBias}`);

    const randomFactor = 1 + combinedNoise + trendBias;
    console.log(`  randomFactor: ${randomFactor}`);

    const targetPrice = currentPrice * randomFactor;
    console.log(`  targetPrice (before mean reversion): ${targetPrice}`);

    // This is where it might break - we need company data
    console.log(
      `\n⚠️  The calculation needs company data (revenueAnnual, fundamentalMultiple, etc.)`
    );
    console.log(
      `   If the company has invalid data, fundamentalPrice could be NaN`
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error);
  }
}

main();
