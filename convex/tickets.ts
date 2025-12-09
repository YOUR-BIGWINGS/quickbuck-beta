import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Submit a new ticket
export const createTicket = mutation({
  args: {
    category: v.union(
      v.literal("player_behavior"),
      v.literal("bug_report"),
      v.literal("content_violation"),
      v.literal("exploit_abuse"),
      v.literal("other")
    ),
    subject: v.string(),
    description: v.string(),
    targetPlayerId: v.optional(v.id("players")),
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

    // Get target player name if provided
    let targetPlayerName: string | undefined;
    if (args.targetPlayerId) {
      const targetPlayer = await ctx.db.get(args.targetPlayerId);
      if (targetPlayer) {
        const targetUser = await ctx.db.get(targetPlayer.userId);
        targetPlayerName = targetUser?.name || "Unknown";
      }
    }

    const ticketId = await ctx.db.insert("tickets", {
      reporterId: player._id,
      reporterName: user.name || "Anonymous",
      category: args.category,
      subject: args.subject,
      description: args.description,
      targetPlayerId: args.targetPlayerId,
      targetPlayerName,
      status: "open",
      priority: "medium", // Default priority
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log to audit log
    // Note: Uncomment after running `npx convex dev` to generate types
    // await ctx.scheduler.runAfter(0, internal.auditLog.logAction, {
    //   actorId: player._id,
    //   actorName: user.name || "Anonymous",
    //   actorRole: player.role || "normal",
    //   targetId: args.targetPlayerId,
    //   targetName: targetPlayerName,
    //   actionType: "ticket_created",
    //   category: "ticket",
    //   description: `Created ticket: ${args.subject} (${args.category})`,
    //   metadata: JSON.stringify({ ticketId, category: args.category }),
    // });

    return ticketId;
  },
});

// Get tickets for current user
export const getMyTickets = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      return [];
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      return [];
    }

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_reporterId", (q) => q.eq("reporterId", player._id))
      .order("desc")
      .collect();

    return tickets;
  },
});

// Get all tickets (for moderators)
export const getAllTickets = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    category: v.optional(v.string()),
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
    if (!["lil_mod", "mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    let tickets = await ctx.db.query("tickets").order("desc").collect();

    // Apply filters
    if (args.status) {
      tickets = tickets.filter((t) => t.status === args.status);
    }
    if (args.priority) {
      tickets = tickets.filter((t) => t.priority === args.priority);
    }
    if (args.category) {
      tickets = tickets.filter((t) => t.category === args.category);
    }

    return tickets;
  },
});

// Assign ticket to a moderator
export const assignTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    modId: v.id("players"),
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
    if (!["lil_mod", "mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    const assignedMod = await ctx.db.get(args.modId);
    if (!assignedMod) {
      throw new Error("Moderator not found");
    }

    const assignedModUser = await ctx.db.get(assignedMod.userId);

    await ctx.db.patch(args.ticketId, {
      assignedToModId: args.modId,
      assignedToModName: assignedModUser?.name || "Unknown",
      status: "in_progress",
      updatedAt: Date.now(),
    });

    // Log to audit log
    // Note: Uncomment after running `npx convex dev` to generate types
    // await ctx.scheduler.runAfter(0, internal.auditLog.logAction, {
    //   actorId: player._id,
    //   actorName: user.name || "Unknown",
    //   actorRole: role,
    //   actionType: "ticket_assigned",
    //   category: "ticket",
    //   description: `Assigned ticket #${args.ticketId} to ${assignedModUser?.name || "Unknown"}`,
    //   metadata: JSON.stringify({ ticketId: args.ticketId, modId: args.modId }),
    // });

    return { success: true };
  },
});

// Update ticket priority
export const updateTicketPriority = mutation({
  args: {
    ticketId: v.id("tickets"),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
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
    if (!["lil_mod", "mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    await ctx.db.patch(args.ticketId, {
      priority: args.priority,
      updatedAt: Date.now(),
    });

    // Log to audit log
    // Note: Uncomment after running `npx convex dev` to generate types
    // await ctx.scheduler.runAfter(0, internal.auditLog.logAction, {
    //   actorId: player._id,
    //   actorName: user.name || "Unknown",
    //   actorRole: role,
    //   actionType: "ticket_priority_updated",
    //   category: "ticket",
    //   description: `Updated ticket #${args.ticketId} priority to ${args.priority}`,
    //   metadata: JSON.stringify({ ticketId: args.ticketId, priority: args.priority }),
    // });

    return { success: true };
  },
});

// Resolve ticket
export const resolveTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    resolution: v.string(),
    status: v.union(v.literal("resolved"), v.literal("closed")),
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
    if (!["lil_mod", "mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      throw new Error("Ticket not found");
    }

    await ctx.db.patch(args.ticketId, {
      status: args.status,
      resolution: args.resolution,
      resolvedByModId: player._id,
      resolvedByModName: user.name || "Unknown",
      resolvedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Log to audit log
    // Note: Uncomment after running `npx convex dev` to generate types
    // await ctx.scheduler.runAfter(0, internal.auditLog.logAction, {
    //   actorId: player._id,
    //   actorName: user.name || "Unknown",
    //   actorRole: role,
    //   actionType: "ticket_resolved",
    //   category: "ticket",
    //   description: `Resolved ticket #${args.ticketId}: ${args.resolution}`,
    //   metadata: JSON.stringify({ ticketId: args.ticketId, status: args.status }),
    // });

    return { success: true };
  },
});

// Get ticket by ID
export const getTicketById = query({
  args: {
    ticketId: v.id("tickets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) {
      return null;
    }

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!player) {
      return null;
    }

    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) {
      return null;
    }

    // Check if user is the reporter or a moderator
    const role = player.role || "normal";
    const isModerator = ["lil_mod", "mod", "high_mod", "admin"].includes(role);
    const isReporter = ticket.reporterId === player._id;

    if (!isModerator && !isReporter) {
      return null;
    }

    return ticket;
  },
});

// Get ticket statistics (for mods)
export const getTicketStats = query({
  args: {},
  handler: async (ctx) => {
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
    if (!["lil_mod", "mod", "high_mod", "admin"].includes(role)) {
      throw new Error("Insufficient permissions");
    }

    const allTickets = await ctx.db.query("tickets").collect();

    const stats = {
      total: allTickets.length,
      open: allTickets.filter((t) => t.status === "open").length,
      inProgress: allTickets.filter((t) => t.status === "in_progress").length,
      resolved: allTickets.filter((t) => t.status === "resolved").length,
      closed: allTickets.filter((t) => t.status === "closed").length,
      urgent: allTickets.filter((t) => t.priority === "urgent" && t.status !== "resolved" && t.status !== "closed").length,
      high: allTickets.filter((t) => t.priority === "high" && t.status !== "resolved" && t.status !== "closed").length,
    };

    return stats;
  },
});
