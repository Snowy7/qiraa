import {
  assembleChapterVerses,
  chapterPageRange,
  chunkStartFor,
  pageOfVerse,
  parseVerseKey,
  type AssembledVerse,
  type PageChunk,
  type PageLines,
  type QuranScriptId,
  type ScriptIndex,
  type WordByWordChapter,
} from "@qiraa/core";

/*
 * The offline dataset from @qiraa/core ships inside the app bundle. Metro
 * includes every JSON file under these folders but evaluates a file only when
 * it's first required, so reads are synchronous and startup never pays for
 * the whole Quran. Nothing here touches the network.
 */
const scriptFiles = require.context("../../../../../packages/core/data/scripts", true, /\.json$/);
const wordByWordFiles = require.context("../../../../../packages/core/data/wbw/en", false, /\.json$/);

const pad3 = (n: number) => String(n).padStart(3, "0");

/** First verse of every page in a script's layout. */
export function getScriptIndex(script: QuranScriptId): ScriptIndex {
  return scriptFiles<ScriptIndex>(`./${script}/index.json`);
}

/** Lines of one mushaf page in a script's layout. */
export function getMushafPage(script: QuranScriptId, page: number): PageLines {
  const chunk = scriptFiles<PageChunk>(`./${script}/p${pad3(chunkStartFor(page))}.json`);
  const lines = chunk[page];
  if (!lines) throw new Error(`Page ${page} is not in the ${script} layout`);
  return lines;
}

const chapterCache = new Map<string, AssembledVerse[]>();

/** Every verse of a chapter, word by word, in a script (assembled once, then cached). */
export function getChapterVerses(script: QuranScriptId, chapter: number): AssembledVerse[] {
  const key = `${script}:${chapter}`;
  let verses = chapterCache.get(key);
  if (!verses) {
    const [first, last] = chapterPageRange(script, chapter);
    const pages = Array.from({ length: last - first + 1 }, (_, i) => ({
      page: first + i,
      lines: getMushafPage(script, first + i),
    }));
    verses = assembleChapterVerses(pages, chapter);
    chapterCache.set(key, verses);
  }
  return verses;
}

/** A single verse, assembled from just the pages it sits on. */
export function getVerse(script: QuranScriptId, verseKey: string): AssembledVerse | undefined {
  const ref = parseVerseKey(verseKey);
  if (!ref) return undefined;
  const index = getScriptIndex(script);
  const first = pageOfVerse(index, verseKey);
  const pages = [first, first + 1]
    .filter((page) => page <= index.pageCount)
    .map((page) => ({ page, lines: getMushafPage(script, page) }));
  return assembleChapterVerses(pages, ref.chapter).find((v) => v.key === verseKey);
}

/** English word-by-word `[gloss, transliteration]` for a chapter, keyed by verse. */
export function getWordByWord(chapter: number): WordByWordChapter {
  return wordByWordFiles<WordByWordChapter>(`./${pad3(chapter)}.json`);
}
