export type ThemeMode = "light" | "dark";

export type ThemePreset = "default" | "dark-default" | string; // Allow string for custom themes

export interface ThemeColors {
  primary: string;
  primaryForeground: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  // Chart colors (for leaderboards, overlays, etc)
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Sidebar colors
  sidebar: string;
  sidebarForeground: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarBorder: string;
  sidebarRing: string;
}

export interface Theme {
  id: ThemePreset;
  name: string;
  mode: ThemeMode;
  colors: ThemeColors;
}

// Default theme (current QuickBuck theme)
const defaultLightColors: ThemeColors = {
  primary: "oklch(0.6735 0.201 33.2114)", // Orange/Blue
  primaryForeground: "oklch(1 0 0)",
  background: "oklch(1 0 0)",
  foreground: "oklch(0.1371 0.036 258.5258)",
  card: "oklch(1 0 0)",
  cardForeground: "oklch(0.1371 0.036 258.5258)",
  popover: "oklch(1 0 0)",
  popoverForeground: "oklch(0.1371 0.036 258.5258)",
  secondary: "oklch(0.9684 0.0068 247.8951)",
  secondaryForeground: "oklch(0.2079 0.0399 265.7275)",
  muted: "oklch(0.9684 0.0068 247.8951)",
  mutedForeground: "oklch(0.5547 0.0407 257.4404)",
  accent: "oklch(0.9684 0.0068 247.8951)",
  accentForeground: "oklch(0.2079 0.0399 265.7275)",
  destructive: "oklch(0.6368 0.2078 25.3259)",
  destructiveForeground: "oklch(1 0 0)",
  border: "oklch(0.929 0.0126 255.5317)",
  input: "oklch(0.929 0.0126 255.5317)",
  ring: "oklch(0.6735 0.201 33.2114)",
  chart1: "oklch(0.6735 0.201 33.2114)",
  chart2: "oklch(0.7076 0.1454 19.4123)",
  chart3: "oklch(0.6907 0.1236 234.6736)",
  chart4: "oklch(0.745 0.1897 149.5728)",
  chart5: "oklch(0.6283 0.1582 296.9932)",
  sidebar: "oklch(0.9837 0.0019 264.5449)",
  sidebarForeground: "oklch(0.1371 0.036 258.5258)",
  sidebarPrimary: "oklch(0.6735 0.201 33.2114)",
  sidebarPrimaryForeground: "oklch(1 0 0)",
  sidebarAccent: "oklch(0.9684 0.0068 247.8951)",
  sidebarAccentForeground: "oklch(0.2079 0.0399 265.7275)",
  sidebarBorder: "oklch(0.929 0.0126 255.5317)",
  sidebarRing: "oklch(0.6735 0.201 33.2114)",
};

const defaultDarkColors: ThemeColors = {
  primary: "oklch(0.6735 0.201 33.2114)", // Orange/Blue
  primaryForeground: "oklch(0.9838 0.0035 247.8583)",
  background: "oklch(0.1371 0.036 258.5258)",
  foreground: "oklch(0.9838 0.0035 247.8583)",
  card: "oklch(0.1371 0.036 258.5258)",
  cardForeground: "oklch(0.9838 0.0035 247.8583)",
  popover: "oklch(0.1371 0.036 258.5258)",
  popoverForeground: "oklch(0.9838 0.0035 247.8583)",
  secondary: "oklch(0.28 0.0369 259.974)",
  secondaryForeground: "oklch(0.9838 0.0035 247.8583)",
  muted: "oklch(0.28 0.0369 259.974)",
  mutedForeground: "oklch(0.7097 0.0355 256.7889)",
  accent: "oklch(0.28 0.0369 259.974)",
  accentForeground: "oklch(0.9838 0.0035 247.8583)",
  destructive: "oklch(0.3959 0.1331 25.7205)",
  destructiveForeground: "oklch(0.9838 0.0035 247.8583)",
  border: "oklch(0.28 0.0369 259.974)",
  input: "oklch(0.28 0.0369 259.974)",
  ring: "oklch(0.6735 0.201 33.2114)",
  chart1: "oklch(0.6735 0.201 33.2114)",
  chart2: "oklch(0.7076 0.1454 19.4123)",
  chart3: "oklch(0.6907 0.1236 234.6736)",
  chart4: "oklch(0.745 0.1897 149.5728)",
  chart5: "oklch(0.6283 0.1582 296.9932)",
  sidebar: "oklch(0.1647 0.0092 264.2809)",
  sidebarForeground: "oklch(0.9838 0.0035 247.8583)",
  sidebarPrimary: "oklch(0.6735 0.201 33.2114)",
  sidebarPrimaryForeground: "oklch(0.9838 0.0035 247.8583)",
  sidebarAccent: "oklch(0.28 0.0369 259.974)",
  sidebarAccentForeground: "oklch(0.9838 0.0035 247.8583)",
  sidebarBorder: "oklch(0.28 0.0369 259.974)",
  sidebarRing: "oklch(0.6735 0.201 33.2114)",
};

// QuickBuck Pro theme (Rebirth 2 unlock)
const quickbuckProColors: ThemeColors = {
  primary: "#788bff",
  primaryForeground: "#ffffff",
  background: "#ffffff",
  foreground: "#0a0a0a",
  card: "#ffffff",
  cardForeground: "#0a0a0a",
  popover: "#ffffff",
  popoverForeground: "#0a0a0a",
  secondary: "#ffffff",
  secondaryForeground: "#0a0a0a",
  muted: "#f5f5f5",
  mutedForeground: "#6b6b6b",
  accent: "#f0f0f0",
  accentForeground: "#0a0a0a",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "#e5e5e5",
  input: "#e5e5e5",
  ring: "#788bff",
  chart1: "#788bff",
  chart2: "#ffffff",
  chart3: "#5a6fd8",
  chart4: "#9aa8ff",
  chart5: "#3d4fb5",
  sidebar: "#fafafa",
  sidebarForeground: "#0a0a0a",
  sidebarPrimary: "#788bff",
  sidebarPrimaryForeground: "#ffffff",
  sidebarAccent: "#f5f5f5",
  sidebarAccentForeground: "#0a0a0a",
  sidebarBorder: "#e5e5e5",
  sidebarRing: "#788bff",
};

// ========================================
// VIP THEMES (animated/special themes)
// ========================================

// Crimson Pulse - Glassy black with pulsing maroon/crimson borders
const crimsonPulseColors: ThemeColors = {
  primary: "#dc143c", // Crimson
  primaryForeground: "#ffffff",
  background: "#0a0a0a",
  foreground: "#e8e8e8",
  card: "rgba(20, 5, 5, 0.85)",
  cardForeground: "#e8e8e8",
  popover: "rgba(20, 5, 5, 0.95)",
  popoverForeground: "#e8e8e8",
  secondary: "#2a1515",
  secondaryForeground: "#e8e8e8",
  muted: "#1a0a0a",
  mutedForeground: "#a88888",
  accent: "#8b0000",
  accentForeground: "#ffffff",
  destructive: "#ff4444",
  destructiveForeground: "#ffffff",
  border: "rgba(139, 0, 0, 0.6)",
  input: "rgba(20, 5, 5, 0.6)",
  ring: "#dc143c",
  chart1: "#dc143c",
  chart2: "#8b0000",
  chart3: "#ff6b6b",
  chart4: "#c41e3a",
  chart5: "#ff1744",
  sidebar: "rgba(10, 5, 5, 0.95)",
  sidebarForeground: "#e8e8e8",
  sidebarPrimary: "#dc143c",
  sidebarPrimaryForeground: "#ffffff",
  sidebarAccent: "#2a1515",
  sidebarAccentForeground: "#e8e8e8",
  sidebarBorder: "rgba(139, 0, 0, 0.6)",
  sidebarRing: "#dc143c",
};

// Storm - Foggy background with lightning, glassy translucent assets
const stormColors: ThemeColors = {
  primary: "#64b5f6", // Light blue
  primaryForeground: "#0d1117",
  background: "#0d1117",
  foreground: "#e6edf3",
  card: "rgba(20, 30, 45, 0.65)",
  cardForeground: "#e6edf3",
  popover: "rgba(20, 30, 45, 0.9)",
  popoverForeground: "#e6edf3",
  secondary: "#1e3a50",
  secondaryForeground: "#e6edf3",
  muted: "#162030",
  mutedForeground: "#8899aa",
  accent: "#2196f3",
  accentForeground: "#ffffff",
  destructive: "#f44336",
  destructiveForeground: "#ffffff",
  border: "rgba(100, 150, 200, 0.3)",
  input: "rgba(20, 35, 50, 0.7)",
  ring: "#64b5f6",
  chart1: "#64b5f6",
  chart2: "#90caf9",
  chart3: "#42a5f5",
  chart4: "#1e88e5",
  chart5: "#bbdefb",
  sidebar: "rgba(15, 25, 35, 0.85)",
  sidebarForeground: "#e6edf3",
  sidebarPrimary: "#64b5f6",
  sidebarPrimaryForeground: "#0d1117",
  sidebarAccent: "#1e3a50",
  sidebarAccentForeground: "#e6edf3",
  sidebarBorder: "rgba(100, 150, 200, 0.3)",
  sidebarRing: "#64b5f6",
};

// Full Custom - Base colors (will be overridden by user settings via CSS vars)
const fullCustomColors: ThemeColors = {
  primary: "#6366f1", // Indigo default
  primaryForeground: "#ffffff",
  background: "#0a0a0a",
  foreground: "#ffffff",
  card: "rgba(30, 30, 30, 0.8)",
  cardForeground: "#ffffff",
  popover: "rgba(30, 30, 30, 0.95)",
  popoverForeground: "#ffffff",
  secondary: "#2a2a2a",
  secondaryForeground: "#ffffff",
  muted: "#1a1a1a",
  mutedForeground: "#888888",
  accent: "#6366f1",
  accentForeground: "#ffffff",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",
  border: "rgba(100, 100, 100, 0.5)",
  input: "rgba(30, 30, 30, 0.6)",
  ring: "#6366f1",
  chart1: "#6366f1",
  chart2: "#8b5cf6",
  chart3: "#a855f7",
  chart4: "#d946ef",
  chart5: "#ec4899",
  sidebar: "rgba(20, 20, 20, 0.9)",
  sidebarForeground: "#ffffff",
  sidebarPrimary: "#6366f1",
  sidebarPrimaryForeground: "#ffffff",
  sidebarAccent: "#2a2a2a",
  sidebarAccentForeground: "#ffffff",
  sidebarBorder: "rgba(100, 100, 100, 0.5)",
  sidebarRing: "#6366f1",
};

export const themes: Theme[] = [
  {
    id: "default",
    name: "Default Light",
    mode: "light",
    colors: defaultLightColors,
  },
  {
    id: "dark-default",
    name: "Default Dark",
    mode: "dark",
    colors: defaultDarkColors,
  },
  {
    id: "quickbuck-pro",
    name: "QuickBuck Pro",
    mode: "light",
    colors: quickbuckProColors,
  },
];

// VIP-only themes (animated, special effects)
export const vipThemes: Theme[] = [
  {
    id: "crimson-pulse",
    name: "Crimson Pulse",
    mode: "dark",
    colors: crimsonPulseColors,
  },
  {
    id: "storm",
    name: "Storm",
    mode: "dark",
    colors: stormColors,
  },
  {
    id: "full-custom",
    name: "Full Custom",
    mode: "dark",
    colors: fullCustomColors,
  },
];

// VIP theme IDs for checking
export const VIP_THEME_IDS = ["crimson-pulse", "storm", "full-custom"];

// Check if a theme is VIP-only
export const isVipTheme = (themeId: string): boolean => {
  return VIP_THEME_IDS.includes(themeId);
};

export const getThemeById = (id: ThemePreset, customThemes?: Theme[]): Theme | undefined => {
  // First check built-in themes
  const builtInTheme = themes.find((theme) => theme.id === id);
  if (builtInTheme) return builtInTheme;
  
  // Check VIP themes
  const vipTheme = vipThemes.find((theme) => theme.id === id);
  if (vipTheme) return vipTheme;
  
  // Then check custom themes if provided
  if (customThemes) {
    return customThemes.find((theme) => theme.id === id);
  }
  
  return undefined;
};

export const applyThemeColors = (colors: ThemeColors, mode: ThemeMode) => {
  const root = document.documentElement;

  // First, remove all existing theme-related CSS variables to prevent persistence
  const existingStyles = root.style;
  const propertiesToRemove: string[] = [];

  for (let i = 0; i < existingStyles.length; i++) {
    const prop = existingStyles[i];
    // Remove all theme-related CSS variables
    if (prop.startsWith('--') && (
      prop.includes('primary') ||
      prop.includes('secondary') ||
      prop.includes('background') ||
      prop.includes('foreground') ||
      prop.includes('card') ||
      prop.includes('popover') ||
      prop.includes('muted') ||
      prop.includes('accent') ||
      prop.includes('destructive') ||
      prop.includes('border') ||
      prop.includes('input') ||
      prop.includes('ring') ||
      prop.includes('chart') ||
      prop.includes('sidebar')
    )) {
      propertiesToRemove.push(prop);
    }
  }

  // Remove the collected properties
  propertiesToRemove.forEach(prop => root.style.removeProperty(prop));

  // Apply new colors with important priority to override CSS class rules
  Object.entries(colors).forEach(([key, value]) => {
    // Convert camelCase to kebab-case for CSS variables
    let cssVar = key.replace(/([A-Z])/g, "-$1").toLowerCase();

    // Handle special cases for chart colors (chart1 -> chart-1)
    if (key.startsWith("chart")) {
      cssVar = cssVar.replace("chart", "chart-");
    }

    // Use important priority to override .dark class CSS rules
    root.style.setProperty(`--${cssVar}`, value, "important");
  });

  // Apply dark mode class
  root.classList.toggle("dark", mode === "dark");
};
