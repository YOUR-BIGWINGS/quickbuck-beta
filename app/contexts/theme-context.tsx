"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type ThemePreset,
  type ThemeMode,
  themes,
  getThemeById,
  applyThemeColors,
  VIP_THEME_IDS,
} from "~/lib/theme-config";

interface CustomThemeSettings {
  backgroundUrl?: string;
  backgroundColor: string;
  cardBackground: string;
  cardOpacity: number;
  borderColor: string;
  textColor: string;
  accentColor: string;
  blurAmount: number;
}

interface ThemeContextValue {
  preset: ThemePreset;
  mode: ThemeMode;
  setPreset: (preset: ThemePreset, themeColors?: any, themeMode?: ThemeMode) => void;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  applyCustomThemeSettings: (settings: CustomThemeSettings) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Helper to apply VIP theme CSS class
function applyVipThemeClass(themeId: string) {
  const root = document.documentElement;
  const body = document.body;
  
  // Remove all VIP theme classes
  VIP_THEME_IDS.forEach(id => {
    root.classList.remove(`theme-${id}`);
    body.classList.remove(`theme-${id}`);
  });
  
  // Add the new VIP theme class if it's a VIP theme
  if (VIP_THEME_IDS.includes(themeId)) {
    root.classList.add(`theme-${themeId}`);
    body.classList.add(`theme-${themeId}`);
  }
}

// Helper to apply custom theme CSS variables for Full Custom theme
function applyCustomThemeCssVars(settings: CustomThemeSettings) {
  const root = document.documentElement;
  
  // Set custom CSS variables
  root.style.setProperty('--user-bg-color', settings.backgroundColor);
  root.style.setProperty('--user-card-bg', settings.cardBackground);
  root.style.setProperty('--user-card-opacity', String(settings.cardOpacity / 100));
  root.style.setProperty('--user-border-color', settings.borderColor);
  root.style.setProperty('--user-text-color', settings.textColor);
  root.style.setProperty('--user-accent-color', settings.accentColor);
  root.style.setProperty('--user-blur', `${settings.blurAmount}px`);
  
  if (settings.backgroundUrl) {
    root.style.setProperty('--user-bg-image', `url(${settings.backgroundUrl})`);
  } else {
    root.style.setProperty('--user-bg-image', 'none');
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>("default");
  const [mode, setModeState] = useState<ThemeMode>("light");

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const storedPreset = localStorage.getItem("themePreset") as ThemePreset;
      const storedColors = localStorage.getItem("themeColors");
      const storedMode = localStorage.getItem("theme") as ThemeMode;
      const storedCustomSettings = localStorage.getItem("customThemeSettings");
      const initialPreset = storedPreset || "default";

      // Get the theme and use its defined mode (not user preference)
      const theme = getThemeById(initialPreset);
      if (theme) {
        const lockedMode = theme.mode;
        setPresetState(initialPreset);
        setModeState(lockedMode);
        localStorage.setItem("theme", lockedMode);
        applyThemeColors(theme.colors, lockedMode);
        applyVipThemeClass(initialPreset);
        
        // Apply custom settings for Full Custom theme
        if (initialPreset === "full-custom" && storedCustomSettings) {
          try {
            const customSettings = JSON.parse(storedCustomSettings);
            applyCustomThemeCssVars(customSettings);
          } catch (e) {
            console.error("Error parsing custom theme settings:", e);
          }
        }
      } else if (storedColors && storedMode) {
        // Custom theme - use stored colors and mode
        try {
          const colors = JSON.parse(storedColors);
          setPresetState(initialPreset);
          setModeState(storedMode);
          applyThemeColors(colors, storedMode);
          applyVipThemeClass(initialPreset);
        } catch (parseError) {
          console.error("Error parsing stored theme colors:", parseError);
          // Fallback to default theme
          const defaultTheme = themes[0];
          const lockedMode = defaultTheme.mode;
          setPresetState(defaultTheme.id);
          setModeState(lockedMode);
          localStorage.setItem("theme", lockedMode);
          applyThemeColors(defaultTheme.colors, lockedMode);
          applyVipThemeClass(defaultTheme.id);
        }
      } else {
        // Fallback to default theme
        const defaultTheme = themes[0];
        const lockedMode = defaultTheme.mode;
        setPresetState(defaultTheme.id);
        setModeState(lockedMode);
        localStorage.setItem("theme", lockedMode);
        applyThemeColors(defaultTheme.colors, lockedMode);
        applyVipThemeClass(defaultTheme.id);
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  }, []);

  const setPreset = useCallback((newPreset: ThemePreset, themeColors?: any, themeMode?: ThemeMode) => {
    setPresetState(newPreset);
    try {
      localStorage.setItem("themePreset", newPreset);
      
      // If colors and mode are provided (custom theme), use them directly
      if (themeColors && themeMode) {
        setModeState(themeMode);
        localStorage.setItem("theme", themeMode);
        // Store colors for custom themes so they persist on page reload
        localStorage.setItem("themeColors", JSON.stringify(themeColors));
        applyThemeColors(themeColors, themeMode);
        applyVipThemeClass(newPreset);
      } else {
        // Otherwise look up the theme
        const theme = getThemeById(newPreset);
        if (theme) {
          // Mode is now locked to the preset's defined mode
          const lockedMode = theme.mode;
          setModeState(lockedMode);
          localStorage.setItem("theme", lockedMode);
          // Clear stored colors for built-in themes (not needed)
          localStorage.removeItem("themeColors");
          applyThemeColors(theme.colors, lockedMode);
          applyVipThemeClass(newPreset);
        }
      }
    } catch (error) {
      console.error("Error setting theme preset:", error);
    }
  }, []);

  const applyCustomThemeSettings = useCallback((settings: CustomThemeSettings) => {
    try {
      localStorage.setItem("customThemeSettings", JSON.stringify(settings));
      applyCustomThemeCssVars(settings);
    } catch (error) {
      console.error("Error applying custom theme settings:", error);
    }
  }, []);

  // setMode and toggleMode are now no-ops since mode is locked to preset
  const setMode = useCallback(
    (newMode: ThemeMode) => {
      // Mode changes are ignored - mode is determined by preset only
      console.log("Mode is locked to preset theme, ignoring manual mode change");
    },
    []
  );

  const toggleMode = useCallback(() => {
    // Toggle is disabled - mode is determined by preset only
    console.log("Mode toggle is disabled - select a different theme preset instead");
  }, []);

  return (
    <ThemeContext.Provider value={{ preset, mode, setPreset, toggleMode, setMode, applyCustomThemeSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
