import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

// Internal mutation to log actions (called from other mutations)
export const logAction = internalMutation({
  args: {
    actorId: v.optional(v.id("players")),
    actorName: v.optional(v.string()),
    actorRole: v.optional(v.string()),
    targetId: v.optional(v.id("players")),
    targetName: v.optional(v.string()),
    actionType: v.string(),
    category: v.union(
      v.literal("moderation"),
      v.literal("ticket"),
      v.literal("player"),
      v.literal("company"),
      v.literal("transaction"),
      v.literal("system"),
      v.literal("admin")
    ),
    description: v.string(),
    metadata: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("auditLog", {
      actorId: args.actorId,
      actorName: args.actorName,
      actorRole: args.actorRole,
      targetId: args.targetId,
      targetName: args.targetName,
      actionType: args.actionType,
      category: args.category,
      description: args.description,
      metadata: args.metadata,
      ipAddress: args.ipAddress,
      timestamp: Date.now(),
    });
  },
});

// Query audit logs with detailed search and filtering
export const searchAuditLogs = query({
  args: {
    category: v.optional(v.string()),
    actionType: v.optional(v.string()),
    actorId: v.optional(v.id("players")),
    targetId: v.optional(v.id("players")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    searchText: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if user is a moderator or admin
    const role = player.role || "normal";
    if (!["mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions - requires mod or higher");
    }

    let logs;

    // Use indexes when possible for better performance
    if (args.actorId) {
      logs = await ctx.db
        .query("auditLog")
        .withIndex("by_actorId", (q) => q.eq("actorId", args.actorId))
        .order("desc")
        .collect();
    } else if (args.targetId) {
      logs = await ctx.db
        .query("auditLog")
        .withIndex("by_targetId", (q) => q.eq("targetId", args.targetId))
        .order("desc")
        .collect();
    } else if (args.category) {
      logs = await ctx.db
        .query("auditLog")
        .withIndex("by_category", (q) => q.eq("category", args.category as any))
        .order("desc")
        .collect();
    } else if (args.actionType) {
      logs = await ctx.db
        .query("auditLog")
        .withIndex("by_actionType", (q) => q.eq("actionType", args.actionType as any))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db
        .query("auditLog")
        .withIndex("by_timestamp")
        .order("desc")
        .collect();
    }

    // Apply additional filters
    if (args.startDate) {
      logs = logs.filter((log) => log.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((log) => log.timestamp <= args.endDate!);
    }
    if (args.searchText && args.searchText.length > 0) {
      const searchLower = args.searchText.toLowerCase();
      logs = logs.filter(
        (log) =>
          log.description.toLowerCase().includes(searchLower) ||
          log.actionType.toLowerCase().includes(searchLower) ||
          log.actorName?.toLowerCase().includes(searchLower) ||
          log.targetName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply limit if specified
    if (args.limit && args.limit > 0) {
      logs = logs.slice(0, args.limit);
    }

    return logs;
  },
});

// Get recent audit logs (simplified version)
export const getRecentLogs = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if user is a moderator or admin
    const role = player.role || "normal";
    if (!["mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    const limit = args.limit || 100;
    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);

    return logs;
  },
});

// Get audit log statistics
export const getAuditStats = query({
  args: {
    days: v.optional(v.number()), // Number of days to look back
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      throw new Error("Player not found");
    }

    // Check if user is a moderator or admin
    const role = player.role || "normal";
    if (!["mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    const days = args.days || 7;
    const cutoffTime = Date.now() - days * 24 * 60 * 60 * 1000;

    const logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    const recentLogs = logs.filter((log) => log.timestamp >= cutoffTime);

    // Calculate statistics
    const categoryCounts: Record<string, number> = {};
    const actionTypeCounts: Record<string, number> = {};

    for (const log of recentLogs) {
      categoryCounts[log.category] = (categoryCounts[log.category] || 0) + 1;
      actionTypeCounts[log.actionType] = (actionTypeCounts[log.actionType] || 0) + 1;
    }

    return {
      totalActions: recentLogs.length,
      categoryCounts,
      actionTypeCounts,
      oldestLogTimestamp: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
      newestLogTimestamp: logs.length > 0 ? logs[0].timestamp : null,
    };
  },
});

// Internal mutation to clean up old audit logs (older than 3 days)
export const cleanupOldLogs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), threeDaysAgo))
      .collect();

    console.log(`[AUDIT_CLEANUP] Found ${oldLogs.length} logs older than 3 days`);

    let deletedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    console.log(`[AUDIT_CLEANUP] Deleted ${deletedCount} old audit logs`);

    return { deletedCount };
  },
});

// Manual cleanup trigger (admin only)
export const manualCleanup = mutation({
  args: {
    daysOld: v.optional(v.number()), // Default 3 days
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      throw new Error("Player not found");
    }

    // Only admins can manually trigger cleanup
    const role = player.role || "normal";
    if (role !== "admin") {
      throw new Error("Insufficient permissions - admin only");
    }

    const daysOld = args.daysOld || 3;
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), cutoffTime))
      .collect();

    let deletedCount = 0;
    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
      deletedCount++;
    }

    // Log the cleanup action
    await ctx.db.insert("auditLog", {
      actorId: player._id,
      actorName: user.name || "Unknown",
      actorRole: role,
      actionType: "audit_log_cleanup",
      category: "system",
      description: `Manual cleanup of ${deletedCount} audit logs older than ${daysOld} days`,
      metadata: JSON.stringify({ deletedCount, daysOld }),
      timestamp: Date.now(),
    });

    return { deletedCount };
  },
});

// Export logs for backup (admin only)
export const exportLogs = query({
  args: {
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      throw new Error("Player not found");
    }

    // Only admins can export logs
    const role = player.role || "normal";
    if (role !== "admin") {
      throw new Error("Insufficient permissions - admin only");
    }

    let logs = await ctx.db
      .query("auditLog")
      .withIndex("by_timestamp")
      .order("desc")
      .collect();

    if (args.startDate) {
      logs = logs.filter((log) => log.timestamp >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((log) => log.timestamp <= args.endDate!);
    }

    return logs;
  },
});
