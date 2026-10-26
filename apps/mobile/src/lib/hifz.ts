import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reviewRecord, summarizeHifz, type HifzRecord, type ReviewRating } from "@qiraa/core";
import { persistStorage } from "@/lib/storage";

interface HifzStore {
  /** Memorisation records keyed by verse key. */
  records: Record<string, HifzRecord>;
  recordReview: (verseKey: string, rating: ReviewRating) => void;
}

/** Spaced-repetition progress, kept on the device. */
export const useHifz = create<HifzStore>()(
  persist(
    (set, get) => ({
      records: {},
      recordReview: (verseKey, rating) =>
        set({
          records: {
            ...get().records,
            [verseKey]: reviewRecord(get().records[verseKey], rating, Date.now()),
          },
        }),
    }),
    {
      name: "qiraa-hifz",
      storage: persistStorage,
      partialize: ({ records }) => ({ records }),
    },
  ),
);

export function useHifzSummary() {
  const records = useHifz((s) => s.records);
  return useMemo(() => summarizeHifz(Object.values(records), new Date()), [records]);
}

/** Verses due for review, the most overdue first. */
export function dueVerses(limit = 20): string[] {
  const now = Date.now();
  return Object.entries(useHifz.getState().records)
    .filter(([, record]) => record.nextReviewAt <= now)
    .sort(([, a], [, b]) => a.nextReviewAt - b.nextReviewAt)
    .slice(0, limit)
    .map(([verseKey]) => verseKey);
}
