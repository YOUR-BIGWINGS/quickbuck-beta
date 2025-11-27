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
} from "~/lib/theme-config";

interface ThemeContextValue {
  preset: ThemePreset;
  mode: ThemeMode;
  setPreset: (preset: ThemePreset, themeColors?: any, themeMode?: ThemeMode) => void;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPresetState] = useState<ThemePreset>("default");
  const [mode, setModeState] = useState<ThemeMode>("light");

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const storedPreset = localStorage.getItem("themePreset") as ThemePreset;
      const initialPreset = storedPreset || "default";

      // Get the theme and use its defined mode (not user preference)
      const theme = getThemeById(initialPreset);
      if (theme) {
        const lockedMode = theme.mode;
        setPresetState(initialPreset);
        setModeState(lockedMode);
        localStorage.setItem("theme", lockedMode);
        applyThemeColors(theme.colors, lockedMode);
      } else {
        // Fallback to default theme
        const defaultTheme = themes[0];
        const lockedMode = defaultTheme.mode;
        setPresetState(defaultTheme.id);
        setModeState(lockedMode);
        localStorage.setItem("theme", lockedMode);
        applyThemeColors(defaultTheme.colors, lockedMode);
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
        applyThemeColors(themeColors, themeMode);
      } else {
        // Otherwise look up the theme
        const theme = getThemeById(newPreset);
        if (theme) {
          // Mode is now locked to the preset's defined mode
          const lockedMode = theme.mode;
          setModeState(lockedMode);
          localStorage.setItem("theme", lockedMode);
          applyThemeColors(theme.colors, lockedMode);
        }
      }
    } catch (error) {
      console.error("Error setting theme preset:", error);
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
    <ThemeContext.Provider value={{ preset, mode, setPreset, toggleMode, setMode }}>
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
