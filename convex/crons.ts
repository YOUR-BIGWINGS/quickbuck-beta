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

crons.interval(
  "cleanup inactive items",
  { hours: 24 }, // Run once per day
  internal.cleanup.cleanupInactiveItems
);

crons.interval(
  "collect daily wealth tax",
  { hours: 24 }, // Run once per day
  internal.taxes.collectAllDailyTaxes
);

crons.interval(
  "check expired VIP subscriptions",
  { hours: 1 }, // Run every hour to catch expired subscriptions immediately
  internal.subscriptions.checkExpiredVIPSubscriptions
);

crons.interval(
  "cleanup old audit logs",
  { hours: 24 }, // Run once per day to clean up logs older than 3 days
  internal.auditLog.cleanupOldLogs
);

console.log("[CRONS] ✅ Cron jobs registered successfully");

export default crons;
