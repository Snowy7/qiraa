import { create } from "zustand";

type Sheet = "settings" | "surahs" | "actions" | "tafsir" | null;

/** A tapped word: where it is on screen and how it was drawn. */
export interface TappedWord {
  verseKey: string;
  position: number;
  /** Viewport rect of the word, for anchoring the popover. */
  rect: { top: number; bottom: number; left: number; width: number };
  /** The word exactly as rendered (glyph and font), for the popover. */
  text: string;
  fontFamily: string;
}

interface ReaderUiState {
  /** Which reader sheet is open. One at a time keeps focus management simple. */
  sheet: Sheet;
  /** Ayah the open sheet (actions / tafsir) is about. */
  verseKey: string | null;
  /** Word whose meaning popover is open. */
  word: TappedWord | null;
  open: (sheet: Exclude<Sheet, null>, verseKey?: string) => void;
  close: () => void;
  showWord: (word: TappedWord | null) => void;
}

/** Transient reader UI shared by the verse list, mushaf pages and sheets. */
export const useReaderUi = create<ReaderUiState>((set) => ({
  sheet: null,
  verseKey: null,
  word: null,
  open: (sheet, verseKey) =>
    set((s) => ({ sheet, word: null, verseKey: verseKey ?? s.verseKey })),
  close: () => set({ sheet: null }),
  showWord: (word) => set({ word }),
}));
