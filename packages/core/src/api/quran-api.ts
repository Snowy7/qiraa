/**
 * Online-only content from the quran.com API: translations, tafsir and
 * search. Arabic text never comes from here; it ships in the dataset.
 * URLs are stable so platform caches (service worker, disk) can key on them.
 */

export const QURAN_API = "https://api.quran.com/api/v4";

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`quran.com API ${res.status}: ${url}`);
  return (await res.json()) as T;
}

export interface TranslationResource {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
}

export const DEFAULT_TRANSLATION_ID = 85; // M.A.S. Abdel Haleem
export const DEFAULT_TAFSIR_ID = { en: 169, ar: 16 } as const; // Ibn Kathir (abridged), Al-Muyassar

/** Well-known tafsir works offered in the reader (quran.com resource ids). */
export const TAFSIRS = [
  { id: 169, name: "Ibn Kathir (Abridged)", language: "en" },
  { id: 168, name: "Ma’arif al-Qur’an", language: "en" },
  { id: 817, name: "Tazkirul Quran", language: "en" },
  { id: 16, name: "التفسير الميسر", language: "ar" },
  { id: 91, name: "تفسير السعدي", language: "ar" },
  { id: 14, name: "تفسير ابن كثير", language: "ar" },
  { id: 15, name: "تفسير الطبري", language: "ar" },
  { id: 90, name: "تفسير القرطبي", language: "ar" },
  { id: 94, name: "تفسير البغوي", language: "ar" },
  { id: 93, name: "التفسير الوسيط", language: "ar" },
] as const;

export async function fetchTranslationResources(
  signal?: AbortSignal,
): Promise<TranslationResource[]> {
  type Raw = {
    id: number;
    name: string;
    author_name: string;
    language_name: string;
  };
  const { translations } = await getJson<{ translations: Raw[] }>(
    `${QURAN_API}/resources/translations`,
    signal,
  );
  return translations
    .map((t) => ({
      id: t.id,
      name: t.name,
      authorName: t.author_name,
      languageName: t.language_name,
    }))
    .sort(
      (a, b) =>
        a.languageName.localeCompare(b.languageName) ||
        a.name.localeCompare(b.name),
    );
}

export function chapterTranslationUrl(
  translationId: number,
  chapter: number,
): string {
  return `${QURAN_API}/quran/translations/${translationId}?chapter_number=${chapter}`;
}

/** A whole chapter's translation in one request; index 0 is verse 1. May contain footnote markup. */
export async function fetchChapterTranslation(
  translationId: number,
  chapter: number,
  signal?: AbortSignal,
): Promise<string[]> {
  const { translations } = await getJson<{ translations: { text: string }[] }>(
    chapterTranslationUrl(translationId, chapter),
    signal,
  );
  return translations.map((t) => t.text);
}

export interface TafsirEntry {
  resourceName: string;
  /** Sanitise before rendering: this is HTML from the API. */
  html: string;
  /** Verses covered when the tafsir groups several ayat together. */
  verseKeys: string[];
}

export async function fetchVerseTafsir(
  tafsirId: number,
  verseKey: string,
  signal?: AbortSignal,
): Promise<TafsirEntry> {
  const { tafsir } = await getJson<{
    tafsir: {
      resource_name: string;
      text: string;
      verses: Record<string, unknown>;
    };
  }>(`${QURAN_API}/tafsirs/${tafsirId}/by_ayah/${verseKey}`, signal);
  return {
    resourceName: tafsir.resource_name,
    html: tafsir.text,
    verseKeys: Object.keys(tafsir.verses),
  };
}

export interface SearchResult {
  verseKey: string;
  text: string;
  /** Sanitise before rendering: may contain `<em>` highlights. */
  translationHtml: string | null;
}

export interface SearchPage {
  total: number;
  results: SearchResult[];
}

export async function searchQuran(
  query: string,
  options: { page?: number; size?: number; language?: string } = {},
  signal?: AbortSignal,
): Promise<SearchPage> {
  const params = new URLSearchParams({
    q: query,
    page: String(options.page ?? 1),
    size: String(options.size ?? 20),
    language: options.language ?? "en",
  });
  const { search } = await getJson<{
    search: {
      total_results: number;
      results: {
        verse_key: string;
        text: string;
        translations?: { text: string }[];
      }[];
    };
  }>(`${QURAN_API}/search?${params}`, signal);
  return {
    total: search.total_results,
    results: search.results.map((r) => ({
      verseKey: r.verse_key,
      text: r.text,
      translationHtml: r.translations?.[0]?.text ?? null,
    })),
  };
}
