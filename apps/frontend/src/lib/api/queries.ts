import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_TAFSIR_ID,
  fetchChapterTranslation,
  fetchTranslationResources,
  fetchVerseTafsir,
  searchQuran,
} from "@noor/core";
import { usePreferences } from "@/lib/stores/preferences";

/*
 * Online content. The service worker caches these responses, so anything
 * read once (or downloaded from Settings) keeps working offline.
 */

const DAY = 1000 * 60 * 60 * 24;

export function useTranslationResources() {
  return useQuery({
    queryKey: ["translation-resources"],
    queryFn: ({ signal }) => fetchTranslationResources(signal),
    staleTime: DAY,
  });
}

export const chapterTranslationQuery = (
  translationId: number,
  chapter: number,
) =>
  queryOptions({
    queryKey: ["translation", translationId, chapter],
    queryFn: ({ signal }) =>
      fetchChapterTranslation(translationId, chapter, signal),
    staleTime: Infinity,
    gcTime: DAY,
  });

export function useChapterTranslation(chapter: number, enabled: boolean) {
  const translationId = usePreferences((s) => s.translationId);
  return useQuery({
    ...chapterTranslationQuery(translationId, chapter),
    enabled,
  });
}

/** The tafsir to show: the user's pick, else the default for their language. */
export function useTafsirId() {
  const tafsirId = usePreferences((s) => s.tafsirId);
  const language = usePreferences((s) => s.language);
  return tafsirId ?? DEFAULT_TAFSIR_ID[language];
}

export function useVerseTafsir(verseKey: string | null) {
  const tafsirId = useTafsirId();
  return useQuery({
    queryKey: ["tafsir", tafsirId, verseKey],
    queryFn: ({ signal }) => fetchVerseTafsir(tafsirId, verseKey!, signal),
    enabled: !!verseKey,
    staleTime: Infinity,
  });
}

export function useQuranSearch(query: string) {
  const language = usePreferences((s) => s.language);
  return useQuery({
    queryKey: ["search", language, query],
    queryFn: ({ signal }) => searchQuran(query, { language, size: 30 }, signal),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 10,
  });
}
