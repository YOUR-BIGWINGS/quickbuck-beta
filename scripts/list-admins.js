import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL =
  process.env.VITE_CONVEX_URL || "https://exuberant-donkey-345.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

async function main() {
  try {
    const res = await client.query("gameConfig:getConfig", { key: "admins" });
    console.log("Admins list (from gameConfig):", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
