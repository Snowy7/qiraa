import { CHAPTERS, JUZS } from "./chapters";

/** A verse reference such as `2:255`. */
export type VerseKey = `${number}:${number}`;

export interface VerseRef {
  chapter: number;
  verse: number;
}

export function toVerseKey(chapter: number, verse: number): VerseKey {
  return `${chapter}:${verse}`;
}

/** Parses `2:255`; returns null for malformed or out-of-range keys. */
export function parseVerseKey(key: string): VerseRef | null {
  const match = /^(\d{1,3}):(\d{1,3})$/.exec(key);
  if (!match) return null;
  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  const meta = CHAPTERS[chapter - 1];
  if (!meta || verse < 1 || verse > meta.versesCount) return null;
  return { chapter, verse };
}

// Verses before each chapter, so verse keys compare in O(1).
const VERSES_BEFORE: readonly number[] = CHAPTERS.reduce<number[]>(
  (acc, chapter, index) => {
    acc.push(
      index === 0 ? 0 : acc[index - 1] + CHAPTERS[index - 1].versesCount,
    );
    return acc;
  },
  [],
);

/** 1-based position of a verse in the whole Quran (1:1 = 1, 114:6 = 6236). */
export function verseOrdinal(key: string): number {
  const ref = parseVerseKey(key);
  if (!ref) throw new Error(`Invalid verse key: ${key}`);
  return VERSES_BEFORE[ref.chapter - 1] + ref.verse;
}

/** Juz (1–30) that contains the verse. */
export function juzOfVerse(key: string): number {
  const ordinal = verseOrdinal(key);
  let juz = 1;
  for (const entry of JUZS) {
    if (verseOrdinal(entry.firstVerse) <= ordinal) juz = entry.juz;
    else break;
  }
  return juz;
}
