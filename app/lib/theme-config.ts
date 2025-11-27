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
];

export const getThemeById = (id: ThemePreset, customThemes?: Theme[]): Theme | undefined => {
  // First check built-in themes
  const builtInTheme = themes.find((theme) => theme.id === id);
  if (builtInTheme) return builtInTheme;
  
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
