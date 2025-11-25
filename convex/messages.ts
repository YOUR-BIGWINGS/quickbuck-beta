import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// ============================================
// PLAYER MESSAGING SYSTEM
// ============================================

/**
 * Send a message from one player to another
 * If sent from mod panel, isMod should be true
 * Supports replying to messages for threading
 */
export const sendMessage = mutation({
  args: {
    recipientId: v.id("players"),
    content: v.string(),
    subject: v.optional(v.string()),
    isMod: v.optional(v.boolean()), // True when sent from mod panel
    parentMessageId: v.optional(v.id("messages")), // Reply to this message
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const sender = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!sender) throw new Error("Player not found");

    // Check if sender's account is limited or banned
    if (sender.role === "banned") {
      throw new Error("Cannot send messages while banned");
    }
    if (sender.role === "limited") {
      throw new Error("Cannot send messages while account is limited");
    }

    // Validate message content
    if (!args.content.trim()) {
      throw new Error("Message cannot be empty");
    }

    if (args.content.length > 2000) {
      throw new Error("Message is too long (max 2000 characters)");
    }

    // Check if recipient exists
    const recipient = await ctx.db.get(args.recipientId);
    if (!recipient) {
      throw new Error("Recipient not found");
    }

    // Determine thread information
    let threadRootId: Id<"messages"> | undefined = undefined;
    let parentMessageId: Id<"messages"> | undefined = args.parentMessageId;

    if (args.parentMessageId) {
      const parentMessage = await ctx.db.get(args.parentMessageId);
      if (!parentMessage) {
        throw new Error("Parent message not found");
      }

      // Verify sender is part of the conversation (either sender or recipient of parent)
      if (
        parentMessage.senderId !== sender._id &&
        parentMessage.recipientId !== sender._id
      ) {
        throw new Error("Not authorized to reply to this message");
      }

      // If parent message is already part of a thread, use its thread root
      // Otherwise, the parent message becomes the thread root
      threadRootId = parentMessage.threadRootId || args.parentMessageId;
    }

    // Create message
    await ctx.db.insert("messages", {
      senderId: sender._id,
      recipientId: args.recipientId,
      senderName: user.name || "Anonymous",
      subject: args.subject,
      content: args.content,
      isRead: false,
      sentAt: Date.now(),
      isMod: args.isMod || false,
      parentMessageId,
      threadRootId,
    });

    return {
      success: true,
      message: "Message sent successfully",
    };
  },
});

/**
 * Get all messages for the current player (inbox)
 */
export const getInbox = query({
  handler: async (ctx) => {
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

    // Get all messages where current player is the recipient
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_recipientId", (q) => q.eq("recipientId", player._id))
      .order("desc")
      .collect();

    // Enrich messages with sender player badges
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const senderBadges = await ctx.db
          .query("playerBadges")
          .withIndex("by_playerId", (q) => q.eq("playerId", message.senderId))
          .collect();

        const badges = await Promise.all(
          senderBadges.map(async (pb) => await ctx.db.get(pb.badgeId))
        );

        return {
          ...message,
          senderBadges: badges.filter((b) => b !== null),
        };
      })
    );

    return enrichedMessages;
  },
});

/**
 * Get sent messages for the current player
 */
export const getSentMessages = query({
  handler: async (ctx) => {
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

    // Get all messages where current player is the sender
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_senderId", (q) => q.eq("senderId", player._id))
      .order("desc")
      .collect();

    // Enrich messages with recipient info and badges
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const recipient = await ctx.db.get(message.recipientId);
        const recipientUser = recipient ? await ctx.db.get(recipient.userId) : null;
        
        const recipientBadges = await ctx.db
          .query("playerBadges")
          .withIndex("by_playerId", (q) => q.eq("playerId", message.recipientId))
          .collect();

        const badges = await Promise.all(
          recipientBadges.map(async (pb) => await ctx.db.get(pb.badgeId))
        );

        return {
          ...message,
          recipientName: recipientUser?.name || "Unknown",
          recipientBadges: badges.filter((b) => b !== null),
        };
      })
    );

    return enrichedMessages;
  },
});

/**
 * Mark a message as read
 */
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
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

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only the recipient can mark as read
    if (message.recipientId !== player._id) {
      throw new Error("Not authorized to mark this message as read");
    }

    await ctx.db.patch(args.messageId, {
      isRead: true,
    });

    return { success: true };
  },
});

/**
 * Delete a message
 */
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
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

    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("Message not found");

    // Only recipient can delete messages from inbox
    if (message.recipientId !== player._id) {
      throw new Error("Not authorized to delete this message");
    }

    await ctx.db.delete(args.messageId);

    return { success: true };
  },
});

/**
 * Get unread message count for current player
 */
export const getUnreadCount = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.subject))
      .unique();

    if (!user) return 0;

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    if (!player) return 0;

    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient_read", (q) =>
        q.eq("recipientId", player._id).eq("isRead", false)
      )
      .collect();

    return unreadMessages.length;
  },
});

/**
 * Search for players by name (for sending messages)
 */
export const searchPlayers = query({
  args: {
    searchQuery: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    if (!args.searchQuery.trim() || args.searchQuery.length < 2) {
      return [];
    }

    const query = args.searchQuery.toLowerCase().trim();

    // Get all users
    const users = await ctx.db.query("users").collect();

    // Filter users by name
    const matchingUsers = users.filter((u) =>
      u.name?.toLowerCase().includes(query)
    );

    // Get player data for matching users
    const results = await Promise.all(
      matchingUsers.slice(0, 10).map(async (user) => {
        const player = await ctx.db
          .query("players")
          .withIndex("by_userId", (q) => q.eq("userId", user._id))
          .unique();

        if (!player) return null;

        // Don't show banned players
        if (player.role === "banned") return null;

        // Get player badges
        const playerBadgeRecords = await ctx.db
          .query("playerBadges")
          .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
          .collect();

        const playerBadges = await Promise.all(
          playerBadgeRecords.map(async (pb) => await ctx.db.get(pb.badgeId))
        );

        return {
          playerId: player._id,
          playerName: user.name || "Anonymous",
          role: player.role,
          playerBadges: playerBadges.filter((b) => b !== null),
        };
      })
    );

    return results.filter((r) => r !== null);
  },
});

/**
 * Get all messages in a thread
 */
export const getThreadMessages = query({
  args: {
    threadRootId: v.id("messages"),
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

    // Get the root message first
    const rootMessage = await ctx.db.get(args.threadRootId);
    if (!rootMessage) return [];

    // Verify player is part of the thread
    if (
      rootMessage.senderId !== player._id &&
      rootMessage.recipientId !== player._id
    ) {
      throw new Error("Not authorized to view this thread");
    }

    // Get all messages in the thread (including the root)
    const threadMessages = await ctx.db
      .query("messages")
      .withIndex("by_threadRootId", (q) => q.eq("threadRootId", args.threadRootId))
      .collect();

    // Include the root message
    const allMessages = [rootMessage, ...threadMessages];

    // Enrich with sender info and badges
    const enrichedMessages = await Promise.all(
      allMessages.map(async (message) => {
        const senderBadges = await ctx.db
          .query("playerBadges")
          .withIndex("by_playerId", (q) => q.eq("playerId", message.senderId))
          .collect();

        const badges = await Promise.all(
          senderBadges.map(async (pb) => await ctx.db.get(pb.badgeId))
        );

        const senderPlayer = await ctx.db.get(message.senderId);
        const senderUser = senderPlayer ? await ctx.db.get(senderPlayer.userId) : null;

        return {
          ...message,
          senderName: senderUser?.name || message.senderName,
          senderBadges: badges.filter((b) => b !== null),
        };
      })
    );

    // Sort by time
    enrichedMessages.sort((a, b) => a.sentAt - b.sentAt);

    return enrichedMessages;
  },
});

/**
 * Get reply count for a message
 */
export const getReplyCount = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // Check if message is a root or has a thread root
    const message = await ctx.db.get(args.messageId);
    if (!message) return 0;

    // Count direct replies
    const directReplies = await ctx.db
      .query("messages")
      .withIndex("by_parentMessageId", (q) => q.eq("parentMessageId", args.messageId))
      .collect();

    // If this is a thread root, also count all messages in the thread
    const threadReplies = await ctx.db
      .query("messages")
      .withIndex("by_threadRootId", (q) => q.eq("threadRootId", args.messageId))
      .collect();

    return Math.max(directReplies.length, threadReplies.length);
  },
});
