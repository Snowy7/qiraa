import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadingMode } from "@/lib/preferences";
import { persistStorage } from "@/lib/storage";

export interface ReadingPosition {
  chapter: number;
  verse: number;
  mode: ReadingMode;
  at: number;
}

interface ReadingPositionStore {
  /** Where the reader last was; drives "Continue reading" and quick actions. */
  last: ReadingPosition | null;
  save: (chapter: number, verse: number, mode: ReadingMode) => void;
}

export const useReadingPosition = create<ReadingPositionStore>()(
  persist(
    (set) => ({
      last: null,
      save: (chapter, verse, mode) =>
        set({ last: { chapter, verse, mode, at: Date.now() } }),
    }),
    {
      name: "qiraa-reading-position",
      storage: persistStorage,
      partialize: ({ last }) => ({ last }),
    },
  ),
);
