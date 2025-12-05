import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { hasPermission } from "./moderation";

// Mutation: Create and send a global alert (admin only)
export const sendGlobalAlert = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    type: v.union(v.literal("info"), v.literal("warning"), v.literal("success"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Check high_mod or admin permission
    const hasHighModAccess = await hasPermission(ctx, currentPlayer._id, "high_mod");
    if (!hasHighModAccess) {
      throw new Error("Only high mods and admins can send global alerts");
    }

    // Validate inputs
    if (args.title.trim().length === 0) {
      throw new Error("Alert title cannot be empty");
    }
    if (args.message.trim().length === 0) {
      throw new Error("Alert message cannot be empty");
    }
    if (args.title.length > 200) {
      throw new Error("Alert title must be 200 characters or less");
    }
    if (args.message.length > 2000) {
      throw new Error("Alert message must be 2000 characters or less");
    }

    // Create the alert
    const alertId = await ctx.db.insert("globalAlerts", {
      createdBy: currentPlayer._id,
      title: args.title.trim(),
      message: args.message.trim(),
      type: args.type,
      readBy: [],
      sentAt: Date.now(),
      createdAt: Date.now(),
    });

    return alertId;
  },
});

// Query: Get all unread global alerts for current player
export const getUnreadAlerts = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      return [];
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) {
      return [];
    }

    // Get all alerts, ordered newest first
    const allAlerts = await ctx.db
      .query("globalAlerts")
      .order("desc")
      .collect();

    // Filter to only unread alerts for this player
    const unreadAlerts = allAlerts.filter(
      (alert) => !alert.readBy || !alert.readBy.includes(currentPlayer._id)
    );

    return unreadAlerts;
  },
});

// Query: Get all global alerts (for mod panel viewing history)
export const getAllAlerts = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Check mod permission (allows both mods and admins)
    const hasModAccess = await hasPermission(ctx, currentPlayer._id, "mod");
    if (!hasModAccess) {
      throw new Error("Only mods and admins can view all alerts");
    }

    // Get all alerts, ordered newest first
    const allAlerts = await ctx.db
      .query("globalAlerts")
      .order("desc")
      .collect();

    return allAlerts;
  },
});

// Mutation: Mark an alert as read by current player
export const markAlertAsRead = mutation({
  args: {
    alertId: v.id("globalAlerts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      throw new Error("Alert not found");
    }

    // Add player to readBy array if not already there
    const readBy = alert.readBy || [];
    if (!readBy.includes(currentPlayer._id)) {
      readBy.push(currentPlayer._id);
      await ctx.db.patch(args.alertId, {
        readBy,
      });
    }

    return true;
  },
});

// Mutation: Delete an alert (admin only)
export const deleteAlert = mutation({
  args: {
    alertId: v.id("globalAlerts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    const currentPlayer = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!currentPlayer) {
      throw new Error("Player not found");
    }

    // Check high_mod or admin permission
    const hasHighModAccess = await hasPermission(ctx, currentPlayer._id, "high_mod");
    if (!hasHighModAccess) {
      throw new Error("Only high mods and admins can delete alerts");
    }

    const alert = await ctx.db.get(args.alertId);
    if (!alert) {
      throw new Error("Alert not found");
    }

    await ctx.db.delete(args.alertId);
    return true;
  },
});
