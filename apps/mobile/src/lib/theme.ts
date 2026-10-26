import { useMemo } from "react";
import { Uniwind, useCSSVariable } from "uniwind";
import type { ThemePreference } from "@/lib/preferences";

/** Palette tokens from global.css, for native props that take a colour string. */
const TOKENS = {
  background: "--color-background",
  foreground: "--color-foreground",
  card: "--color-card",
  primary: "--color-primary",
  primaryForeground: "--color-primary-foreground",
  secondary: "--color-secondary",
  mutedForeground: "--color-muted-foreground",
  accent: "--color-accent",
  destructive: "--color-destructive",
  border: "--color-border",
  quranInk: "--color-quran-ink",
  verseHighlight: "--color-verse-highlight",
  recitingWord: "--color-reciting-word",
} as const;

export type ThemeColor = keyof typeof TOKENS;
export type ThemeColors = Record<ThemeColor, string>;

const NAMES = Object.keys(TOKENS) as ThemeColor[];

/** The current theme's palette as colour strings (re-renders on theme change). */
export function useThemeColors(): ThemeColors {
  const values = useCSSVariable(NAMES.map((name) => TOKENS[name]));
  return useMemo(() => {
    const colors = {} as ThemeColors;
    NAMES.forEach((name, i) => {
      colors[name] = String(values[i] ?? "transparent");
    });
    return colors;
  }, [values]);
}

/** Applies the theme preference; Uniwind also sets the native colour scheme. */
export function applyTheme(theme: ThemePreference) {
  Uniwind.setTheme(theme);
}
