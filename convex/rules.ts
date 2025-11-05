import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { hasPermission } from "./moderation";

// Query: Get current game rules
export const getRules = query({
  handler: async (ctx) => {
    // Get the most recent rules entry
    const rules = await ctx.db
      .query("gameRules")
      .withIndex("by_createdAt")
      .order("desc")
      .first();

    if (!rules) {
      // Return default rules if none exist
      return {
        content: `QUICKBUCK GAME RULES

1. NO STOCK MANIPULATION
   - Do not crash stocks by buying and selling immediately
   - No coordinated pump-and-dump schemes
   - Let the market operate naturally

2. NO INAPPROPRIATE OR LOW-EFFORT CONTENT
   - All products and companies must have appropriate names and descriptions
   - No offensive, hateful, or discriminatory content
   - Put effort into your business ventures

3. NO MULTI-ACCOUNTING
   - One account per person
   - Do not create multiple accounts to gain unfair advantages
   - Multi-accounting will result in all accounts being banned

4. NO BYPASSING CONTENT FILTERS
   - Do not deliberately bypass censored words
   - Respect the content filtering system
   - Use creative and appropriate alternatives

5. FAIR PLAY
   - Play honestly and ethically
   - Report exploits and bugs instead of abusing them
   - Respect other players and their businesses

Violations of these rules may result in warnings, account limitations, or permanent bans.`,
        lastUpdatedAt: Date.now(),
        isDefault: true,
      };
    }

    // Enrich with updater info
    const updater = await ctx.db.get(rules.lastUpdatedBy);
    const updaterUser = updater ? await ctx.db.get(updater.userId) : null;

    return {
      content: rules.content,
      lastUpdatedAt: rules.lastUpdatedAt,
      lastUpdatedBy: updaterUser?.name || "Unknown",
      isDefault: false,
    };
  },
});

// Query: Check if current user is admin (for showing edit button)
export const checkIsAdmin = query({
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

    return (await hasPermission(ctx, player._id, "admin"));
  },
});

// Mutation: Update game rules (admin only)
export const updateRules = mutation({
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

    // Check if user is admin
    const isAdmin = await hasPermission(ctx, player._id, "admin");
    if (!isAdmin) {
      throw new Error("Only admins can update game rules");
    }

    // Validate content
    if (!args.content.trim()) {
      throw new Error("Rules content cannot be empty");
    }

    // Create new rules entry
    await ctx.db.insert("gameRules", {
      content: args.content,
      lastUpdatedBy: player._id,
      lastUpdatedAt: Date.now(),
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "Game rules updated successfully",
    };
  },
});
