import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

const CONVEX_URL =
  process.env.VITE_CONVEX_URL || "https://exuberant-donkey-345.convex.cloud";
const userEmail = process.argv[2];

if (!userEmail) {
  console.error("Usage: node scripts/grant-admin.js <userEmail>");
  console.error("Example: node scripts/grant-admin.js user@example.com");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    console.log(`Granting admin role to user with email: ${userEmail}`);

    const result = await client.mutation(api.moderation.grantAdminRole, {
      userEmail,
    });

    console.log("✓ Success!");
    console.log(result.message);
    console.log(`Player ID: ${result.playerId}`);
    console.log(
      "\nThe user now has admin access to the moderation panel at /panel"
    );
  } catch (err) {
    console.error("✗ Error:", err.message || err);
  }
}

main();
