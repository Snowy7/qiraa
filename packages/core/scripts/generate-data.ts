/**
 * Generates the offline Quran dataset in `packages/core/data` from the
 * quran.com (Quran Foundation) content API.
 *
 * Run once (or when the upstream data changes):
 *   node packages/core/scripts/generate-data.ts
 *
 * Output (all JSON, committed to the repo):
 *   chapters.json                    114 chapters with en/ar names and page ranges
 *   juzs.json                        30 juz with their first verse
 *   scripts/<script>/index.json      page count, first verse per page, chapter page ranges
 *   scripts/<script>/p<NNN>.json     mushaf lines for 20 pages starting at NNN
 *   wbw/en/<chapter>.json            word-by-word gloss + transliteration per verse
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const API = "https://api.qurancdn.com/api/qdc";
const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "data");
const CACHE = join(tmpdir(), "noor-data-cache");
const PAGES_PER_CHUNK = 20;
const CONCURRENCY = 6;

type ApiWord = {
  verse_key: string;
  char_type_name: string;
  line_number: number;
  page_number: number;
  code_v1: string;
  code_v2: string;
  text_qpc_hafs: string;
  text_uthmani_tajweed: string;
  text_indopak: string;
  translation?: { text: string | null };
  transliteration?: { text: string | null };
};
type ApiVerse = { verse_key: string; words: ApiWord[] };

type TajweedRun = [text: string] | [text: string, rule: string];
type WordText = string | TajweedRun[];
type Segment = [verseKey: string, words: WordText[], end?: string];
type Line = [lineNumber: number, segments: Segment[]];

/** Converts `<rule class=x>..</rule>` markup into typed runs (no HTML at runtime). */
function parseTajweed(markup: string): WordText {
  const runs: TajweedRun[] = [];
  const pattern = /<rule class=([\w-]+)>(.*?)<\/rule>|([^<]+)/g;
  for (const match of markup.matchAll(pattern)) {
    if (match[1]) runs.push([match[2], match[1]]);
    else if (match[3]) runs.push([match[3]]);
  }
  if (runs.length === 1 && runs[0].length === 1) return runs[0][0];
  return runs;
}

const stripTags = (text: string) => text.replace(/<[^>]+>/g, "");

type ScriptOutput = {
  script: string;
  word: (word: ApiWord) => WordText;
  end: (word: ApiWord) => string;
};

type Job = {
  mushafId: number;
  pageCount: number;
  outputs: ScriptOutput[];
  collectWordByWord?: boolean;
};

const JOBS: Job[] = [
  {
    mushafId: 1,
    pageCount: 604,
    outputs: [
      { script: "qcf-v2", word: (w) => w.code_v2, end: (w) => w.code_v2 },
    ],
  },
  {
    mushafId: 2,
    pageCount: 604,
    outputs: [
      { script: "qcf-v1", word: (w) => w.code_v1, end: (w) => w.code_v1 },
    ],
  },
  {
    mushafId: 5,
    pageCount: 604,
    collectWordByWord: true,
    outputs: [
      {
        script: "qpc-hafs",
        word: (w) => w.text_qpc_hafs,
        end: (w) => w.text_qpc_hafs,
      },
      {
        script: "tajweed",
        word: (w) => parseTajweed(w.text_uthmani_tajweed),
        end: (w) => stripTags(w.text_uthmani_tajweed),
      },
    ],
  },
  {
    mushafId: 6,
    pageCount: 610,
    outputs: [
      {
        script: "indopak",
        word: (w) => w.text_indopak,
        end: (w) => w.text_indopak,
      },
    ],
  },
];

const WORD_FIELDS = [
  "verse_key",
  "char_type_name",
  "line_number",
  "page_number",
  "code_v1",
  "code_v2",
  "text_qpc_hafs",
  "text_uthmani_tajweed",
  "text_indopak",
].join(",");

/** Fetches JSON with retries; responses are cached on disk so reruns are offline. */
async function getJson<T>(url: string, attempt = 1): Promise<T> {
  const cacheFile = join(
    CACHE,
    `${createHash("sha1").update(url).digest("hex")}.json`,
  );
  const cached = await readFile(cacheFile, "utf8").catch(() => null);
  if (cached) return JSON.parse(cached) as T;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "noor-data-generator" },
    });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    const body = await res.text();
    await mkdir(CACHE, { recursive: true });
    await writeFile(cacheFile, body);
    return JSON.parse(body) as T;
  } catch (error) {
    if (attempt >= 5) throw error;
    await new Promise((r) => setTimeout(r, attempt * 1000));
    return getJson<T>(url, attempt + 1);
  }
}

/** Runs `task` for every item with bounded concurrency, preserving order. */
async function mapPool<T, R>(
  items: T[],
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await task(items[index]);
      }
    }),
  );
  return results;
}

async function writeJson(path: string, data: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
}

const chapterOf = (verseKey: string) => Number(verseKey.split(":")[0]);

/**
 * The qdc API omits a few end-of-ayah words (e.g. 2:181). The public v4 API
 * still has them, so borrow its end word and place it on the line where the
 * verse finishes in this layout.
 */
async function patchMissingEndMarkers(pageVerses: ApiVerse[][]) {
  const lastOccurrence = new Map<string, ApiVerse>();
  const hasEnd = new Set<string>();
  for (const verses of pageVerses) {
    for (const verse of verses) {
      if (verse.words.length > 0) lastOccurrence.set(verse.verse_key, verse);
      if (verse.words.some((w) => w.char_type_name === "end"))
        hasEnd.add(verse.verse_key);
    }
  }
  for (const [verseKey, verse] of lastOccurrence) {
    if (hasEnd.has(verseKey)) continue;
    const { verse: v4 } = await getJson<{ verse: ApiVerse }>(
      `https://api.quran.com/api/v4/verses/by_key/${verseKey}?words=true&word_fields=${WORD_FIELDS}`,
    );
    const end = v4.words.find((w) => w.char_type_name === "end");
    if (!end) throw new Error(`No end marker for ${verseKey} in either API`);
    const last = verse.words.at(-1)!;
    verse.words.push({
      ...end,
      line_number: last.line_number,
      page_number: last.page_number,
    });
    console.log(`  patched end marker for ${verseKey}`);
  }
}

async function generateJob(
  job: Job,
  wordByWord: Map<string, [string, string][]>,
) {
  const pages = Array.from({ length: job.pageCount }, (_, i) => i + 1);
  const pageVerses = await mapPool(pages, async (page) => {
    const url = `${API}/verses/by_page/${page}?mushaf=${job.mushafId}&words=true&per_page=all&filter_page_words=true&word_fields=${WORD_FIELDS}`;
    const { verses } = await getJson<{ verses: ApiVerse[] }>(url);
    process.stdout.write(
      `\rmushaf ${job.mushafId}: page ${page}/${job.pageCount}   `,
    );
    return verses;
  });
  process.stdout.write("\n");
  await patchMissingEndMarkers(pageVerses);

  for (const output of job.outputs) {
    const dir = join(OUT, "scripts", output.script);
    await rm(dir, { recursive: true, force: true });

    const pageFirstVerse: string[] = [];
    const chapterPages: [number, number][] = [];
    let chunk: Record<string, Line[]> = {};
    let verseCount = 0;

    for (const [index, verses] of pageVerses.entries()) {
      const page = index + 1;
      const lines = new Map<number, Segment[]>();

      for (const verse of verses) {
        const words = verse.words.filter((w) => w.page_number === page);
        if (words.length === 0) continue;
        pageFirstVerse[index] ??= verse.verse_key;

        const chapter = chapterOf(verse.verse_key);
        const range = (chapterPages[chapter - 1] ??= [page, page]);
        range[1] = page;

        for (const word of words) {
          const segments = lines.get(word.line_number) ?? [];
          lines.set(word.line_number, segments);
          let segment = segments.at(-1);
          if (!segment || segment[0] !== verse.verse_key) {
            segment = [verse.verse_key, []];
            segments.push(segment);
          }
          if (word.char_type_name === "end") {
            segment[2] = output.end(word);
            verseCount++;
          } else {
            segment[1].push(output.word(word));
          }
        }
      }

      chunk[page] = [...lines.entries()].sort(([a], [b]) => a - b);
      if (page % PAGES_PER_CHUNK === 0 || page === job.pageCount) {
        const start = page - ((page - 1) % PAGES_PER_CHUNK);
        await writeJson(
          join(dir, `p${String(start).padStart(3, "0")}.json`),
          chunk,
        );
        chunk = {};
      }
    }

    if (verseCount !== 6236)
      throw new Error(
        `${output.script}: expected 6236 verses, got ${verseCount}`,
      );
    await writeJson(join(dir, "index.json"), {
      pageCount: job.pageCount,
      pagesPerChunk: PAGES_PER_CHUNK,
      pageFirstVerse,
      chapterPages,
    });
    console.log(
      `  ${output.script}: ${job.pageCount} pages, ${verseCount} verses`,
    );
  }

  if (job.collectWordByWord) {
    for (const verses of pageVerses) {
      for (const verse of verses) {
        const glosses = wordByWord.get(verse.verse_key) ?? [];
        wordByWord.set(verse.verse_key, glosses);
        for (const word of verse.words) {
          if (word.char_type_name !== "word") continue;
          glosses.push([
            word.translation?.text ?? "",
            word.transliteration?.text ?? "",
          ]);
        }
      }
    }
  }
}

type ApiChapter = {
  id: number;
  revelation_place: "makkah" | "madinah";
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  translated_name: { name: string };
};

async function generateChapters() {
  const [en, ar] = await Promise.all(
    ["en", "ar"].map((language) =>
      getJson<{ chapters: ApiChapter[] }>(
        `${API}/chapters?language=${language}`,
      ),
    ),
  );
  const chapters = en.chapters.map((chapter, index) => ({
    id: chapter.id,
    nameSimple: chapter.name_simple,
    nameComplex: chapter.name_complex,
    nameArabic: chapter.name_arabic,
    translatedName: {
      en: chapter.translated_name.name,
      ar: ar.chapters[index].translated_name.name,
    },
    revelationPlace: chapter.revelation_place,
    revelationOrder: chapter.revelation_order,
    versesCount: chapter.verses_count,
    bismillahPre: chapter.bismillah_pre,
  }));
  await writeJson(join(OUT, "chapters.json"), chapters);
}

async function generateJuzs() {
  const { juzs } = await getJson<{
    juzs: { juz_number: number; verse_mapping: Record<string, string> }[];
  }>("https://api.quran.com/api/v4/juzs");
  const byNumber = new Map<
    number,
    { juz: number; firstVerse: string; lastVerse: string }
  >();
  for (const { juz_number, verse_mapping } of juzs) {
    if (byNumber.has(juz_number)) continue;
    const chapters = Object.keys(verse_mapping).map(Number);
    const first = Math.min(...chapters);
    const last = Math.max(...chapters);
    byNumber.set(juz_number, {
      juz: juz_number,
      firstVerse: `${first}:${verse_mapping[first].split("-")[0]}`,
      lastVerse: `${last}:${verse_mapping[last].split("-")[1]}`,
    });
  }
  await writeJson(
    join(OUT, "juzs.json"),
    [...byNumber.values()].sort((a, b) => a.juz - b.juz),
  );
}

async function main() {
  await generateChapters();
  await generateJuzs();

  const wordByWord = new Map<string, [string, string][]>();
  for (const job of JOBS) await generateJob(job, wordByWord);

  const wbwDir = join(OUT, "wbw", "en");
  await rm(wbwDir, { recursive: true, force: true });
  const byChapter = new Map<number, Record<string, [string, string][]>>();
  for (const [verseKey, glosses] of wordByWord) {
    const chapter = byChapter.get(chapterOf(verseKey)) ?? {};
    chapter[verseKey] = glosses;
    byChapter.set(chapterOf(verseKey), chapter);
  }
  for (const [chapter, verses] of byChapter) {
    await writeJson(
      join(wbwDir, `${String(chapter).padStart(3, "0")}.json`),
      verses,
    );
  }
  console.log(`wbw: ${wordByWord.size} verses`);
}

await main();
