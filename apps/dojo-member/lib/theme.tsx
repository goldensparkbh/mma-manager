import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme, type ColorSchemeName } from "react-native";
import { NAWADY_BRAND } from "./brand";
import { BrandedSplash } from "./branded-splash";

export type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "app_theme";

export const lightColors = {
  bg: "#f1f5f9",
  card: "#ffffff",
  text: "#0f172a",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: NAWADY_BRAND.primary,
  primaryDark: NAWADY_BRAND.primaryDark,
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  dangerBg: "#fef2f2",
  tabBar: "#ffffff",
  heroDark: NAWADY_BRAND.primary,
};

export const darkColors = {
  bg: "#0f172a",
  card: "#1e293b",
  text: "#f1f5f9",
  textMuted: "#94a3b8",
  border: "#334155",
  primary: NAWADY_BRAND.primaryLight,
  primaryDark: NAWADY_BRAND.primary,
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#f87171",
  dangerBg: "#450a0a",
  tabBar: "#1e293b",
  heroDark: NAWADY_BRAND.primaryDarker,
};

/** @deprecated use useThemeColors() */
export const colors = lightColors;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };

export function withAlpha(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof lightColors;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark" || saved === "system") setModeState(saved);
      setReady(true);
    })();
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    await AsyncStorage.setItem(THEME_KEY, next);
    setModeState(next);
  }, []);

  const resolved: ColorSchemeName =
    mode === "system" ? systemScheme ?? "light" : mode;

  const isDark = resolved === "dark";
  const palette = isDark ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, isDark, colors: palette, setMode }),
    [mode, isDark, palette, setMode],
  );

  if (!ready) return <BrandedSplash />;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme required");
  return ctx;
}

export function useThemeColors() {
  return useTheme().colors;
}
