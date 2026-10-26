import { queryOptions, useQuery } from "@tanstack/react-query";
import {
  DEFAULT_TAFSIR_ID,
  fetchChapterTranslation,
  fetchTranslationResources,
  fetchVerseTafsir,
  searchQuran,
} from "@qiraa/core";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { diskPersister } from "@/lib/query-client";

/*
 * Online content from the quran.com API. Translations and tafsir persist to
 * disk, so anything read once keeps working offline.
 */

const DAY = 1000 * 60 * 60 * 24;

export function useTranslationResources() {
  return useQuery({
    queryKey: ["translation-resources"],
    queryFn: ({ signal }) => fetchTranslationResources(signal),
    staleTime: DAY,
    persister: diskPersister,
  });
}

export const chapterTranslationQuery = (translationId: number, chapter: number) =>
  queryOptions({
    queryKey: ["translation", translationId, chapter],
    queryFn: ({ signal }) =>
      fetchChapterTranslation(translationId, chapter, signal),
    staleTime: Infinity,
    gcTime: DAY,
    persister: diskPersister,
  });

export function useChapterTranslation(chapter: number, enabled: boolean) {
  const translationId = usePreferences((s) => s.translationId);
  return useQuery({ ...chapterTranslationQuery(translationId, chapter), enabled });
}

/** The tafsir to show: the user's pick, else the default for their language. */
export function useTafsirId() {
  const tafsirId = usePreferences((s) => s.tafsirId);
  const { locale } = useI18n();
  return tafsirId ?? DEFAULT_TAFSIR_ID[locale];
}

export function useVerseTafsir(verseKey: string) {
  const tafsirId = useTafsirId();
  return useQuery({
    queryKey: ["tafsir", tafsirId, verseKey],
    queryFn: ({ signal }) => fetchVerseTafsir(tafsirId, verseKey, signal),
    staleTime: Infinity,
    persister: diskPersister,
  });
}

export function useQuranSearch(query: string) {
  const { locale } = useI18n();
  return useQuery({
    queryKey: ["search", locale, query],
    queryFn: ({ signal }) =>
      searchQuran(query, { language: locale, size: 30 }, signal),
    enabled: query.length >= 2,
    staleTime: 1000 * 60 * 10,
  });
}
