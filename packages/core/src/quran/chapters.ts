import chaptersJson from "../../data/chapters.json";
import juzsJson from "../../data/juzs.json";

export type RevelationPlace = "makkah" | "madinah";

export interface Chapter {
  id: number;
  nameSimple: string;
  nameComplex: string;
  nameArabic: string;
  translatedName: { en: string; ar: string };
  revelationPlace: RevelationPlace;
  revelationOrder: number;
  versesCount: number;
  /** Whether the surah is preceded by a standalone Bismillah line. */
  bismillahPre: boolean;
}

export interface Juz {
  juz: number;
  firstVerse: string;
  lastVerse: string;
}

/** All 114 chapters, bundled so the index renders instantly and offline. */
export const CHAPTERS = chaptersJson as readonly Chapter[];

export const JUZS: readonly Juz[] = juzsJson;

export const TOTAL_VERSES = 6236;

export function getChapter(id: number): Chapter | undefined {
  return CHAPTERS[id - 1];
}

export function isChapterId(id: number): boolean {
  return Number.isInteger(id) && id >= 1 && id <= CHAPTERS.length;
}

/** Case-insensitive match on English, Arabic, translated name or number. */
export function searchChapters(query: string): readonly Chapter[] {
  const q = query.trim().toLowerCase();
  if (!q) return CHAPTERS;
  const normalized = q.replace(/[^a-z0-9؀-ۿ]/g, "");
  return CHAPTERS.filter(
    (c) =>
      String(c.id) === q ||
      c.nameSimple
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .includes(normalized) ||
      c.nameArabic.includes(q) ||
      c.translatedName.en.toLowerCase().includes(q) ||
      c.translatedName.ar.includes(q),
  );
}
