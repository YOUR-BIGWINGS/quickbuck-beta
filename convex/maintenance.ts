import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hasPermission } from "./moderation";

// Query: Get current maintenance mode status
export const getMaintenanceStatus = query({
  handler: async (ctx) => {
    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .unique();

    return {
      isEnabled: config?.value?.enabled || false,
      message: config?.value?.message || "The server is under maintenance. Please try again later.",
      startedAt: config?.value?.startedAt || null,
      reason: config?.value?.reason || "",
    };
  },
});

// Mutation: Enable maintenance mode (admin only)
export const enableMaintenanceMode = mutation({
  args: {
    message: v.optional(v.string()),
    reason: v.optional(v.string()),
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

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) {
      throw new Error("Player not found");
    }

    // Check admin permission
    const isAdmin = await hasPermission(ctx, player._id, "admin");
    if (!isAdmin) {
      throw new Error("Only admins can enable maintenance mode");
    }

    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .unique();

    const maintenanceConfig = {
      enabled: true,
      message: args.message || "The server is under maintenance. Please try again later.",
      reason: args.reason || "",
      startedAt: Date.now(),
      enabledBy: player._id,
    };

    if (config) {
      await ctx.db.patch(config._id, {
        value: maintenanceConfig,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("gameConfig", {
        key: "maintenance_mode",
        value: maintenanceConfig,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Maintenance mode enabled",
      maintenanceConfig,
    };
  },
});

// Mutation: Disable maintenance mode (admin only)
export const disableMaintenanceMode = mutation({
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

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) {
      throw new Error("Player not found");
    }

    // Check admin permission
    const isAdmin = await hasPermission(ctx, player._id, "admin");
    if (!isAdmin) {
      throw new Error("Only admins can disable maintenance mode");
    }

    const config = await ctx.db
      .query("gameConfig")
      .withIndex("by_key", (q) => q.eq("key", "maintenance_mode"))
      .unique();

    if (config) {
      await ctx.db.patch(config._id, {
        value: {
          enabled: false,
          disabledAt: Date.now(),
          disabledBy: player._id,
        },
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      message: "Maintenance mode disabled",
    };
  },
});
