import { router } from "expo-router";
import { create } from "zustand";

interface ReaderUiState {
  /** The word open in the word sheet, as `chapter:verse:position`. */
  selectedWord: string | null;
  /** The ayah open in the actions or tafsir sheet. */
  selectedVerse: string | null;
}

/** What the reader is pointing at, so the page can emphasise it under a sheet. */
export const useReaderUi = create<ReaderUiState>(() => ({
  selectedWord: null,
  selectedVerse: null,
}));

/** Opens the word sheet for `chapter:verse:position`. */
export function openWord(key: string) {
  useReaderUi.setState({ selectedWord: key });
  router.push({ pathname: "/word/[key]", params: { key } });
}

/** Opens the actions sheet for an ayah. */
export function openVerse(verseKey: string) {
  useReaderUi.setState({ selectedVerse: verseKey });
  router.push({ pathname: "/verse/[key]", params: { key: verseKey } });
}
