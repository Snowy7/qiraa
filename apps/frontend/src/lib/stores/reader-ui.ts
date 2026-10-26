import { create } from "zustand";

type Sheet = "settings" | "surahs" | "actions" | "tafsir" | null;

interface ReaderUiState {
  /** Which reader sheet is open. One at a time keeps focus management simple. */
  sheet: Sheet;
  /** Ayah the open sheet (actions / tafsir) is about. */
  verseKey: string | null;
  open: (sheet: Exclude<Sheet, null>, verseKey?: string) => void;
  close: () => void;
}

/** Transient reader UI shared by the verse list, mushaf pages and sheets. */
export const useReaderUi = create<ReaderUiState>((set) => ({
  sheet: null,
  verseKey: null,
  open: (sheet, verseKey) =>
    set((s) => ({ sheet, verseKey: verseKey ?? s.verseKey })),
  close: () => set({ sheet: null }),
}));
