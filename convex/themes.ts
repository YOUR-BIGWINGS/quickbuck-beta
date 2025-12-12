import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Helper to check if user is admin
async function checkIsAdmin(ctx: any): Promise<{ isAdmin: boolean; playerId?: Id<"players"> }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return { isAdmin: false };
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  if (!user) {
    return { isAdmin: false };
  }

  const player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .unique();

  if (!player) {
    return { isAdmin: false };
  }

  const isAdmin = player.role === "admin";
  return { isAdmin, playerId: player._id };
}

// Helper to generate theme colors from primary and secondary colors
function generateThemeColors(primaryColor: string, secondaryColor: string, mode: "light" | "dark") {
  // Base colors that will be generated
  const colors: any = {
    primary: primaryColor,
    primaryForeground: mode === "light" ? "#ffffff" : "#000000",
    secondary: secondaryColor,
    secondaryForeground: mode === "light" ? "#0a0a0a" : "#ffffff",
  };

  // Generate the rest based on mode
  if (mode === "light") {
    colors.background = "#ffffff";
    colors.foreground = "#0a0a0a";
    colors.card = "#ffffff";
    colors.cardForeground = "#0a0a0a";
    colors.popover = "#ffffff";
    colors.popoverForeground = "#0a0a0a";
    colors.muted = "#f5f5f5";
    colors.mutedForeground = "#6b6b6b";
    colors.accent = "#f0f0f0";
    colors.accentForeground = "#0a0a0a";
    colors.destructive = "#ef4444";
    colors.destructiveForeground = "#ffffff";
    colors.border = "#e5e5e5";
    colors.input = "#e5e5e5";
    colors.ring = primaryColor;
    colors.chart1 = primaryColor;
    colors.chart2 = secondaryColor;
    colors.chart3 = adjustColorBrightness(primaryColor, -20);
    colors.chart4 = adjustColorBrightness(secondaryColor, 20);
    colors.chart5 = adjustColorBrightness(primaryColor, 20);
    colors.sidebar = "#fafafa";
    colors.sidebarForeground = "#0a0a0a";
    colors.sidebarPrimary = primaryColor;
    colors.sidebarPrimaryForeground = "#ffffff";
    colors.sidebarAccent = "#f5f5f5";
    colors.sidebarAccentForeground = "#0a0a0a";
    colors.sidebarBorder = "#e5e5e5";
    colors.sidebarRing = primaryColor;
  } else {
    colors.background = "#0a0a0a";
    colors.foreground = "#ffffff";
    colors.card = "#1a1a1a";
    colors.cardForeground = "#ffffff";
    colors.popover = "#1a1a1a";
    colors.popoverForeground = "#ffffff";
    colors.muted = "#2a2a2a";
    colors.mutedForeground = "#a0a0a0";
    colors.accent = "#2a2a2a";
    colors.accentForeground = "#ffffff";
    colors.destructive = "#dc2626";
    colors.destructiveForeground = "#ffffff";
    colors.border = "#2a2a2a";
    colors.input = "#2a2a2a";
    colors.ring = primaryColor;
    colors.chart1 = primaryColor;
    colors.chart2 = secondaryColor;
    colors.chart3 = adjustColorBrightness(primaryColor, 20);
    colors.chart4 = adjustColorBrightness(secondaryColor, -20);
    colors.chart5 = adjustColorBrightness(primaryColor, -20);
    colors.sidebar = "#0f0f0f";
    colors.sidebarForeground = "#ffffff";
    colors.sidebarPrimary = primaryColor;
    colors.sidebarPrimaryForeground = "#ffffff";
    colors.sidebarAccent = "#2a2a2a";
    colors.sidebarAccentForeground = "#ffffff";
    colors.sidebarBorder = "#2a2a2a";
    colors.sidebarRing = primaryColor;
  }

  return colors;
}

// Simple color adjustment helper (for hex colors)
function adjustColorBrightness(color: string, percent: number): string {
  // If it's not a hex color, return as-is
  if (!color.startsWith("#")) {
    return color;
  }

  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;

  return (
    "#" +
    (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    )
      .toString(16)
      .slice(1)
  );
}

// Query: Get all custom themes
export const getCustomThemes = query({
  handler: async (ctx) => {
    const themes = await ctx.db.query("customThemes").collect();
    return themes;
  },
});

// Mutation: Create a custom theme (admin only)
export const createCustomTheme = mutation({
  args: {
    name: v.string(),
    mode: v.union(v.literal("light"), v.literal("dark")),
    primaryColor: v.string(),
    secondaryColor: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const { isAdmin, playerId } = await checkIsAdmin(ctx);
    if (!isAdmin || !playerId) {
      throw new Error("Only admins can create custom themes");
    }

    // Generate a unique ID for the theme
    const themeId = `custom-${args.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    // Check if theme with this name already exists
    const existing = await ctx.db
      .query("customThemes")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      throw new Error("A theme with this name already exists");
    }

    // Create the theme
    const themeDocId = await ctx.db.insert("customThemes", {
      id: themeId,
      name: args.name,
      mode: args.mode,
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      createdByAdminId: playerId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { success: true, themeId, themeDocId };
  },
});

// Mutation: Delete a custom theme (admin only)
export const deleteCustomTheme = mutation({
  args: {
    themeDocId: v.id("customThemes"),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const { isAdmin } = await checkIsAdmin(ctx);
    if (!isAdmin) {
      throw new Error("Only admins can delete custom themes");
    }

    await ctx.db.delete(args.themeDocId);
    return { success: true };
  },
});

// Mutation: Update a custom theme (admin only)
export const updateCustomTheme = mutation({
  args: {
    themeDocId: v.id("customThemes"),
    name: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("light"), v.literal("dark"))),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const { isAdmin } = await checkIsAdmin(ctx);
    if (!isAdmin) {
      throw new Error("Only admins can update custom themes");
    }

    const existingTheme = await ctx.db.get(args.themeDocId);
    if (!existingTheme) {
      throw new Error("Theme not found");
    }

    // If name is being changed, check for duplicates
    if (args.name && args.name !== existingTheme.name) {
      const duplicate = await ctx.db
        .query("customThemes")
        .filter((q) => q.eq(q.field("name"), args.name))
        .first();

      if (duplicate) {
        throw new Error("A theme with this name already exists");
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) updates.name = args.name;
    if (args.mode !== undefined) updates.mode = args.mode;
    if (args.primaryColor !== undefined) updates.primaryColor = args.primaryColor;
    if (args.secondaryColor !== undefined) updates.secondaryColor = args.secondaryColor;

    // Update the id if name changed
    if (args.name) {
      updates.id = `custom-${args.name.toLowerCase().replace(/\s+/g, "-")}-${existingTheme.createdAt}`;
    }

    await ctx.db.patch(args.themeDocId, updates);
    return { success: true };
  },
});

// ========================================
// VIP USER CUSTOM THEME SETTINGS
// ========================================

// Helper to get current VIP player
async function getCurrentVIPPlayer(ctx: any): Promise<{ playerId: any; isVIP: boolean } | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.subject))
    .unique();

  if (!user) return null;

  const player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", user._id))
    .unique();

  if (!player) return null;

  return { playerId: player._id, isVIP: player.isVIP === true };
}

// Query: Get user's custom theme settings
export const getUserCustomThemeSettings = query({
  handler: async (ctx) => {
    const playerInfo = await getCurrentVIPPlayer(ctx);
    if (!playerInfo || !playerInfo.isVIP) {
      return null;
    }

    const settings = await ctx.db
      .query("userCustomThemeSettings")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerInfo.playerId))
      .unique();

    return settings;
  },
});

// Mutation: Save user's custom theme settings
export const saveUserCustomThemeSettings = mutation({
  args: {
    backgroundUrl: v.optional(v.string()),
    backgroundColor: v.string(),
    cardBackground: v.string(),
    cardOpacity: v.number(),
    borderColor: v.string(),
    textColor: v.string(),
    accentColor: v.string(),
    blurAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const playerInfo = await getCurrentVIPPlayer(ctx);
    if (!playerInfo || !playerInfo.isVIP) {
      throw new Error("VIP access required to save custom theme settings");
    }

    // Check if settings already exist
    const existing = await ctx.db
      .query("userCustomThemeSettings")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerInfo.playerId))
      .unique();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        backgroundUrl: args.backgroundUrl,
        backgroundColor: args.backgroundColor,
        cardBackground: args.cardBackground,
        cardOpacity: args.cardOpacity,
        borderColor: args.borderColor,
        textColor: args.textColor,
        accentColor: args.accentColor,
        blurAmount: args.blurAmount,
        updatedAt: Date.now(),
      });
    } else {
      // Create new
      await ctx.db.insert("userCustomThemeSettings", {
        playerId: playerInfo.playerId,
        backgroundUrl: args.backgroundUrl,
        backgroundColor: args.backgroundColor,
        cardBackground: args.cardBackground,
        cardOpacity: args.cardOpacity,
        borderColor: args.borderColor,
        textColor: args.textColor,
        accentColor: args.accentColor,
        blurAmount: args.blurAmount,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

// Mutation: Upsert a theme (create new or update existing by originalThemeId)
// Used when editing built-in themes - creates a custom override
export const upsertTheme = mutation({
  args: {
    originalThemeId: v.string(), // The original theme id (e.g., "light-cloud")
    name: v.string(),
    mode: v.union(v.literal("light"), v.literal("dark")),
    primaryColor: v.string(),
    secondaryColor: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const { isAdmin, playerId } = await checkIsAdmin(ctx);
    if (!isAdmin || !playerId) {
      throw new Error("Only admins can modify themes");
    }

    // Check if a custom theme override already exists for this theme
    const existing = await ctx.db
      .query("customThemes")
      .filter((q) => q.eq(q.field("id"), args.originalThemeId))
      .first();

    if (existing) {
      // Update the existing override
      await ctx.db.patch(existing._id, {
        name: args.name,
        mode: args.mode,
        primaryColor: args.primaryColor,
        secondaryColor: args.secondaryColor,
        updatedAt: Date.now(),
      });
      return { success: true, themeId: args.originalThemeId, isNew: false };
    } else {
      // Create a new custom theme with the same ID to override the built-in
      await ctx.db.insert("customThemes", {
        id: args.originalThemeId,
        name: args.name,
        mode: args.mode,
        primaryColor: args.primaryColor,
        secondaryColor: args.secondaryColor,
        createdByAdminId: playerId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { success: true, themeId: args.originalThemeId, isNew: true };
    }
  },
});
