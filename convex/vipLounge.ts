import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================
// VIP LOUNGE CHAT SYSTEM
// ============================================

/**
 * Send a message to the VIP lounge
 * Only VIP users can send messages
 */
export const sendVIPMessage = mutation({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) throw new Error("Player not found");

    // Check if player is VIP
    if (!player.isVIP) {
      throw new Error("Only VIP members can send messages in the VIP lounge");
    }

    // Check if player's account is limited or banned
    if (player.role === "banned") {
      throw new Error("Cannot send messages while banned");
    }
    if (player.role === "limited") {
      throw new Error("Cannot send messages while account is limited");
    }

    // Validate message content
    if (!args.content.trim()) {
      throw new Error("Message cannot be empty");
    }

    if (args.content.length > 500) {
      throw new Error("Message is too long (max 500 characters)");
    }

    // Create message
    await ctx.db.insert("vipLoungeMessages", {
      playerId: player._id,
      playerName: user.name || "Anonymous VIP",
      content: args.content.trim(),
      sentAt: Date.now(),
    });

    return {
      success: true,
      message: "Message sent to VIP lounge",
    };
  },
});

/**
 * Get recent VIP lounge messages
 * Only VIP users can view messages
 */
export const getVIPLoungeMessages = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return [];

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) return [];

    // Check if player is VIP
    if (!player.isVIP) {
      return [];
    }

    const limit = args.limit || 100;

    // Get recent messages
    const messages = await ctx.db
      .query("vipLoungeMessages")
      .withIndex("by_sentAt")
      .order("desc")
      .take(limit);

    // Enrich messages with sender badges
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const senderBadges = await ctx.db
          .query("playerBadges")
          .withIndex("by_playerId", (q) => q.eq("playerId", message.playerId))
          .collect();

        const badges = await Promise.all(
          senderBadges.map(async (pb) => await ctx.db.get(pb.badgeId))
        );

        return {
          ...message,
          senderBadges: badges.filter((b): b is NonNullable<typeof b> => b !== null && b !== undefined),
        };
      })
    );

    return enrichedMessages.reverse(); // Return in chronological order
  },
});

/**
 * Check if current user has VIP access
 */
export const checkVIPAccess = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return false;

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) return false;

    return player.isVIP === true;
  },
});
