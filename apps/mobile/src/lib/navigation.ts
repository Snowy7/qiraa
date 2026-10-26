import { router, type Href } from "expo-router";
import { pageOfVerse, parseVerseKey, toVerseKey } from "@qiraa/core";
import { usePreferences, type ReadingMode } from "@/lib/preferences";
import { getScriptIndex } from "@/lib/quran/data";

/** The reader route for a verse in a reading mode (verse list or mushaf page). */
export function readerHref(verseKey: string, mode: ReadingMode = usePreferences.getState().readingMode): Href {
  const ref = parseVerseKey(verseKey);
  if (!ref) return "/quran";
  if (mode === "mushaf") {
    const page = pageOfVerse(getScriptIndex(usePreferences.getState().script), verseKey);
    return `/mushaf/${page}`;
  }
  return ref.verse > 1 ? `/quran/${ref.chapter}?verse=${ref.verse}` : `/quran/${ref.chapter}`;
}

/** Opens a verse in the user's preferred reading mode. */
export function openInReader(verseKey: string) {
  router.push(readerHref(verseKey));
}

/** Where "Continue reading" goes: the last position, in the mode it was read in. */
export function continueReadingHref(last: { chapter: number; verse: number; mode: ReadingMode } | null): Href {
  return last ? readerHref(toVerseKey(last.chapter, last.verse), last.mode) : "/quran/1";
}
