import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

console.log("[CRONS] Registering cron jobs...");

const crons = cronJobs();

crons.interval(
  "bot tick",
  { minutes: 5 },
  internal.tick.executeTick
);

crons.interval(
  "check negative balances",
  { hours: 1 },
  internal.moderation.checkAndReportNegativeBalances
);

console.log("[CRONS] ✅ Cron jobs registered successfully");

export default crons;
