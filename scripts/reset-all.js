import { ConvexHttpClient } from "convex/browser";

// Usage:
//   node scripts/reset-all.js <SECRET>
// or set RESET_SECRET env and run:
//   RESET_SECRET=... node scripts/reset-all.js

const CONVEX_URL =
  process.env.VITE_CONVEX_URL || "https://exuberant-donkey-345.convex.cloud";
const secretArg = process.argv[2] || process.env.RESET_SECRET;

if (!secretArg) {
  console.error(
    "Usage: node scripts/reset-all.js <SECRET>\nOr set RESET_SECRET env var."
  );
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    console.log("About to reset all data in Convex deployment:", CONVEX_URL);
    console.log("This will DELETE ALL DATA. If you are sure, proceed.");

    const res = await client.mutation("admin:resetAllData", {
      confirm: secretArg,
    });
    console.log("Reset result:", res);
  } catch (err) {
    console.error("Error calling reset mutation:", err);
    process.exit(1);
  }
}

main();
