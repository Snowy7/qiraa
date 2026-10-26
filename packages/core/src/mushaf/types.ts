/**
 * Shapes of the generated offline dataset (see scripts/generate-data.ts).
 * Kept as compact tuples because the files ship to every client.
 */

/** A run of tajweed text: plain `[text]` or coloured `[text, ruleClass]`. */
export type TajweedRun =
  | readonly [text: string]
  | readonly [text: string, rule: string];

/** A stored word: glyph/plain text, or tajweed runs for the tajweed script. */
export type WordText = string | readonly TajweedRun[];

/**
 * Consecutive words of one verse on one mushaf line. `start` is the
 * position (1-based) of the first word within its verse; `end` is the
 * end-of-ayah marker, present only on the line where the verse finishes.
 */
export type Segment = readonly [
  verseKey: string,
  start: number,
  words: readonly WordText[],
  end?: string,
];

export type Line = readonly [lineNumber: number, segments: readonly Segment[]];

/** Lines of one mushaf page, ordered top to bottom. */
export type PageLines = readonly Line[];

/** One chunk file: pages keyed by page number. */
export type PageChunk = Readonly<Record<string, PageLines>>;

export interface ScriptIndex {
  pageCount: number;
  /** First verse key on each page (index 0 = page 1). */
  pageFirstVerse: readonly string[];
}

/** Word-by-word `[gloss, transliteration]` per word, keyed by verse key. */
export type WordByWordChapter = Readonly<
  Record<string, readonly (readonly [string, string])[]>
>;
