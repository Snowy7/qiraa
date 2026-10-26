import {
  queryOptions,
  useQuery,
  type QueryClient,
} from "@tanstack/react-query";
import {
  assembleChapterVerses,
  chunkStartFor,
  pageOfVerse,
  parseVerseKey,
  type PageChunk,
  type QuranScriptId,
  type ScriptIndex,
  type WordByWordChapter,
} from "@noor/core";
import { queryClient } from "@/lib/query-client";

/*
 * The offline dataset from @noor/core, split into lazily imported chunks.
 * Vite emits each JSON file as its own hashed asset, so chunks download on
 * demand, cache forever, and are kept offline by the service worker.
 */

const indexFiles = import.meta.glob<ScriptIndex>(
  "@noor-data/scripts/*/index.json",
  {
    import: "default",
  },
);
const chunkFiles = import.meta.glob<PageChunk>("@noor-data/scripts/*/p*.json", {
  import: "default",
});
const wordByWordFiles = import.meta.glob<WordByWordChapter>(
  "@noor-data/wbw/en/*.json",
  {
    import: "default",
  },
);

function loadFile<T>(
  files: Record<string, () => Promise<T>>,
  suffix: string,
): Promise<T> {
  const entry = Object.entries(files).find(([path]) => path.endsWith(suffix));
  if (!entry) throw new Error(`Missing Quran data file: ${suffix}`);
  return entry[1]();
}

const pad3 = (n: number) => String(n).padStart(3, "0");

// Static data never changes at runtime: keep it for the whole session.
const forever = {
  staleTime: Infinity,
  gcTime: Infinity,
  retry: false,
} as const;

export const scriptIndexQuery = (script: QuranScriptId) =>
  queryOptions({
    queryKey: ["quran-data", script, "index"],
    queryFn: () => loadFile(indexFiles, `/scripts/${script}/index.json`),
    ...forever,
  });

const chunkQuery = (script: QuranScriptId, chunkStart: number) =>
  queryOptions({
    queryKey: ["quran-data", script, "chunk", chunkStart],
    queryFn: () =>
      loadFile(chunkFiles, `/scripts/${script}/p${pad3(chunkStart)}.json`),
    ...forever,
  });

async function loadPage(
  client: QueryClient,
  script: QuranScriptId,
  page: number,
) {
  const index = await client.ensureQueryData(scriptIndexQuery(script));
  const chunk = await client.ensureQueryData(
    chunkQuery(script, chunkStartFor(index, page)),
  );
  const lines = chunk[page];
  if (!lines) throw new Error(`Page ${page} is not in the ${script} layout`);
  return lines;
}

export const pageQuery = (script: QuranScriptId, page: number) =>
  queryOptions({
    queryKey: ["quran-data", script, "page", page],
    queryFn: () => loadPage(queryClient, script, page),
    ...forever,
  });

export const chapterVersesQuery = (script: QuranScriptId, chapter: number) =>
  queryOptions({
    queryKey: ["quran-data", script, "chapter", chapter],
    queryFn: async () => {
      const index = await queryClient.ensureQueryData(scriptIndexQuery(script));
      const [first, last] = index.chapterPages[chapter - 1];
      const numbers = Array.from(
        { length: last - first + 1 },
        (_, i) => first + i,
      );
      const pages = await Promise.all(
        numbers.map(async (page) => ({
          page,
          lines: await loadPage(queryClient, script, page),
        })),
      );
      return assembleChapterVerses(pages, chapter);
    },
    ...forever,
  });

export const useScriptIndex = (script: QuranScriptId) =>
  useQuery(scriptIndexQuery(script));

/** Lines of one mushaf page in the chosen script. */
export const usePage = (script: QuranScriptId, page: number) =>
  useQuery(pageQuery(script, page));

/** Every verse of a chapter, word by word, in the chosen script. */
export const useChapterVerses = (script: QuranScriptId, chapter: number) =>
  useQuery(chapterVersesQuery(script, chapter));

export function useWordByWord(chapter: number, enabled: boolean) {
  return useQuery({
    queryKey: ["quran-data", "wbw", "en", chapter],
    queryFn: () => loadFile(wordByWordFiles, `/wbw/en/${pad3(chapter)}.json`),
    enabled,
    ...forever,
  });
}

/** Imports every chunk of a script so the service worker caches it. */
export async function prefetchScriptData(script: QuranScriptId) {
  const files = Object.entries(chunkFiles).filter(([path]) =>
    path.includes(`/scripts/${script}/`),
  );
  await Promise.all(files.map(([, load]) => load()));
}

/** A single verse in the chosen script, loading only the pages it sits on. */
export function useVerse(script: QuranScriptId, verseKey: string) {
  return useQuery({
    queryKey: ["quran-data", script, "verse", verseKey],
    queryFn: async () => {
      const index = await queryClient.ensureQueryData(scriptIndexQuery(script));
      const first = pageOfVerse(index, verseKey);
      const pages = [first, first + 1].filter((p) => p <= index.pageCount);
      const loaded = await Promise.all(
        pages.map(async (page) => ({
          page,
          lines: await loadPage(queryClient, script, page),
        })),
      );
      const verse = assembleChapterVerses(
        loaded,
        parseVerseKey(verseKey)!.chapter,
      ).find((v) => v.key === verseKey);
      if (!verse) throw new Error(`Verse ${verseKey} not found`);
      return verse;
    },
    ...forever,
  });
}
