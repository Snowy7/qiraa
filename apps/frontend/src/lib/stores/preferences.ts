import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_RECITER_ID,
  DEFAULT_SCRIPT,
  DEFAULT_TRANSLATION_ID,
  RECITERS,
  isQuranScriptId,
  type QuranScriptId,
} from "@qiraa/core";
import { db } from "@/lib/db";
import { useLocation } from "@/lib/stores/location";

export type ThemePreference = "light" | "dark" | "system";
export type Language = "en" | "ar";
export type ReadingMode = "verses" | "mushaf";

export interface Preferences {
  theme: ThemePreference;
  language: Language;
  script: QuranScriptId;
  readingMode: ReadingMode;
  /** Multiplier on the per-device base size of Quran text (0.8 – 1.6). */
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
}

export const DEFAULT_PREFERENCES: Preferences = {
  theme: "system",
  language: "en",
  script: DEFAULT_SCRIPT,
  readingMode: "verses",
  quranTextScale: 1,
  translationTextScale: 1,
  showTranslation: true,
  showWordByWord: false,
  translationId: DEFAULT_TRANSLATION_ID,
  tafsirId: null,
  reciterId: DEFAULT_RECITER_ID,
  playbackRate: 1,
  followRecitation: true,
};

interface PreferencesStore extends Preferences {
  set: (patch: Partial<Preferences>) => void;
}

const STORAGE_KEY = "qiraa-preferences";

/** User preferences, persisted to localStorage so they apply before first render. */
export const usePreferences = create<PreferencesStore>()(
  persist(
    (set) => ({
      ...DEFAULT_PREFERENCES,
      set: (patch) => set(patch),
    }),
    {
      name: STORAGE_KEY,
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
    const fallback = DEFAULT_PREFERENCES[key];
    const candidate = prefs[key];
    if (candidate === undefined) continue;
    if (key === "script" && !isQuranScriptId(candidate)) continue;
    if (
      key === "tafsirId" &&
      candidate !== null &&
      typeof candidate !== "number"
    )
      continue;
    if (key !== "tafsirId" && typeof candidate !== typeof fallback) continue;
    Object.assign(result, { [key]: candidate });
  }
  return result;
}

/** Old everyayah reciter ids → quran.com ids (Maher isn't available; use Alafasy). */
const LEGACY_RECITERS: Record<number, number> = {
  1: 2,
  2: 10,
  3: 3,
  4: 5,
  5: 4,
  6: 7,
  7: 7,
  8: 9,
  9: 6,
  10: 12,
};

/**
 * One-time import of settings saved by the previous version of the app
 * (Dexie settings table, next-themes and the old language store).
 */
export async function migrateLegacyPreferences(): Promise<void> {
  if (localStorage.getItem(STORAGE_KEY)) return;

  const patch: Partial<Preferences> = {};
  const theme = localStorage.getItem("theme");
  if (theme === "light" || theme === "dark" || theme === "system")
    patch.theme = theme;
  try {
    const language = JSON.parse(localStorage.getItem("noor-language") ?? "null")
      ?.state?.language;
    if (language === "ar" || language === "en") patch.language = language;
  } catch {
    // ignore malformed legacy state
  }

  const settings = new Map(
    (await db.settings.toArray()).map((s) => [s.key, s.value]),
  );
  const arabic = settings.get("arabicFontSize");
  if (typeof arabic === "number")
    patch.quranTextScale = clamp(arabic / 28, 0.8, 1.6);
  const translation = settings.get("translationFontSize");
  if (typeof translation === "number")
    patch.translationTextScale = clamp(translation / 16, 0.85, 1.4);
  const mode = settings.get("readingMode");
  if (mode === "mushaf") patch.readingMode = "mushaf";
  if (mode === "word-by-word") patch.showWordByWord = true;
  const reciter = settings.get("reciterId");
  if (typeof reciter === "number" && LEGACY_RECITERS[reciter])
    patch.reciterId = LEGACY_RECITERS[reciter];
  const speed = settings.get("playbackSpeed");
  if (typeof speed === "number") patch.playbackRate = speed;

  if (!RECITERS.some((r) => r.id === patch.reciterId)) delete patch.reciterId;
  usePreferences.getState().set(patch);

  // The old app cached the prayer-times location under its own key.
  try {
    const old = JSON.parse(
      localStorage.getItem("noor_cached_location") ?? "null",
    );
    if (
      old &&
      typeof old.lat === "number" &&
      !useLocation.getState().location
    ) {
      const label = [old.city, old.country].filter(Boolean).join(", ") || null;
      useLocation.setState({ location: { lat: old.lat, lng: old.lng, label } });
    }
  } catch {
    // ignore malformed legacy state
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
