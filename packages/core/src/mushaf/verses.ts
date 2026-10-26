import chapterPagesJson from "../../data/chapter-pages.json";
import { parseVerseKey, verseOrdinal } from "../quran/verse-key";
import type { QuranScriptId } from "./scripts";
import type { PageLines, ScriptIndex, WordText } from "./types";

/** Pages per data chunk file (must match scripts/generate-data.ts). */
export const PAGES_PER_CHUNK = 20;

const CHAPTER_PAGES: Record<QuranScriptId, readonly (readonly number[])[]> =
  chapterPagesJson;

/** `[firstPage, lastPage]` of a chapter in a script's layout (bundled, no fetch). */
export function chapterPageRange(
  script: QuranScriptId,
  chapter: number,
): readonly [number, number] {
  const [first, last] = CHAPTER_PAGES[script][chapter - 1];
  return [first, last];
}

/** First page of the chunk file that holds `page`. */
export function chunkStartFor(page: number): number {
  return page - ((page - 1) % PAGES_PER_CHUNK);
}

/** Mushaf page on which a verse starts, in the given script's layout. */
export function pageOfVerse(index: ScriptIndex, verseKey: string): number {
  const target = verseOrdinal(verseKey);
  let low = 0;
  let high = index.pageFirstVerse.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (verseOrdinal(index.pageFirstVerse[mid]) <= target) low = mid;
    else high = mid - 1;
  }
  return low + 1;
}

export interface VerseWord {
  text: WordText;
  /** Mushaf page the word sits on; QCF scripts need it to pick the font. */
  page: number;
}

export interface AssembledVerse {
  key: string;
  chapter: number;
  verse: number;
  words: VerseWord[];
  end: VerseWord | null;
}

/**
 * Reassembles verses of one chapter from mushaf pages, for the
 * verse-by-verse reading modes. Pages must be given in order.
 */
export function assembleChapterVerses(
  pages: readonly { page: number; lines: PageLines }[],
  chapter: number,
): AssembledVerse[] {
  const verses = new Map<string, AssembledVerse>();
  for (const { page, lines } of pages) {
    for (const [, segments] of lines) {
      for (const [key, , words, end] of segments) {
        const ref = parseVerseKey(key);
        if (!ref || ref.chapter !== chapter) continue;
        let verse = verses.get(key);
        if (!verse) {
          verse = { key, chapter, verse: ref.verse, words: [], end: null };
          verses.set(key, verse);
        }
        for (const text of words) verse.words.push({ text, page });
        if (end !== undefined) verse.end = { text: end, page };
      }
    }
  }
  return [...verses.values()];
}

/** Plain text of a word, flattening tajweed runs. */
export function wordToPlainText(word: WordText): string {
  return typeof word === "string" ? word : word.map(([text]) => text).join("");
}
