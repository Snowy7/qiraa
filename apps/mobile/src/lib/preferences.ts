import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_RECITER_ID,
  DEFAULT_SCRIPT,
  DEFAULT_TRANSLATION_ID,
  isQuranScriptId,
  type QuranScriptId,
} from "@qiraa/core";
import { persistStorage } from "@/lib/storage";

export type ThemePreference = "light" | "dark" | "system";
export type ReadingMode = "verses" | "mushaf";
/** Continuous vertical scroll through the mushaf, or one page at a time. */
export type MushafLayout = "scroll" | "pages";

export interface Preferences {
  theme: ThemePreference;
  script: QuranScriptId;
  readingMode: ReadingMode;
  mushafLayout: MushafLayout;
  /** Multiplier on the base size of Quran text (0.8 – 1.6). */
  quranTextScale: number;
  /** Multiplier on the base size of translation text (0.85 – 1.4). */
  translationTextScale: number;
  showTranslation: boolean;
  showWordByWord: boolean;
  translationId: number;
  /** null follows the UI language's default tafsir. */
  tafsirId: number | null;
  /** quran.com audio reciter id. */
  reciterId: number;
  playbackRate: number;
  /** Keep the ayah being recited in view (scroll / turn the page). */
  followRecitation: boolean;
  /** Keep the screen on while a reader is open. */
  keepAwake: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  script: DEFAULT_SCRIPT,
  readingMode: "verses",
  mushafLayout: "scroll",
  quranTextScale: 1,
  translationTextScale: 1,
  showTranslation: true,
  showWordByWord: false,
  translationId: DEFAULT_TRANSLATION_ID,
  tafsirId: null,
  reciterId: DEFAULT_RECITER_ID,
  playbackRate: 1,
  followRecitation: true,
  keepAwake: true,
};

interface PreferencesStore extends Preferences {
  set: (patch: Partial<Preferences>) => void;
}

/** User preferences, persisted to SQLite and read synchronously at startup. */
export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (patch) => set(patch),
    }),
    {
      name: "qiraa-preferences",
      storage: persistStorage,
      version: 1,
      partialize: ({ set: _set, ...prefs }) => prefs,
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);

/** Drops unknown or invalid persisted values so a bad entry can't break the app. */
function sanitize(value: unknown): Partial<Preferences> {
  if (!value || typeof value !== "object") return {};
  const prefs = value as Partial<Record<keyof Preferences, unknown>>;
  const result: Partial<Preferences> = {};
  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]) {
    const candidate = prefs[key];
    if (candidate === undefined) continue;
    if (key === "script" && !isQuranScriptId(candidate)) continue;
    if (key === "tafsirId") {
      if (candidate !== null && typeof candidate !== "number") continue;
    } else if (typeof candidate !== typeof DEFAULT_PREFERENCES[key]) continue;
    Object.assign(result, { [key]: candidate });
  }
  return result;
}
