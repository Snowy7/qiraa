import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { reviewDay, reviewRecord, summarizeHifz, type HifzRecord, type ReviewRating } from "@qiraa/core";
import { persistStorage } from "@/lib/storage";

/** Review days kept for the streak: a year is plenty. */
const MAX_REVIEW_DAYS = 400;

interface HifzStore {
  /** Memorisation records keyed by verse key. */
  records: Record<string, HifzRecord>;
  /** Days with at least one review (`reviewDay`), oldest first. */
  reviewDays: string[];
  recordReview: (verseKey: string, rating: ReviewRating) => void;
}

/** Spaced-repetition progress, kept on the device. */
export const useHifz = create<HifzStore>()(
  persist(
    (set, get) => ({
      records: {},
      reviewDays: [],
      recordReview: (verseKey, rating) => {
        const now = Date.now();
        const today = reviewDay(now);
        const { records, reviewDays } = get();
        set({
          records: { ...records, [verseKey]: reviewRecord(records[verseKey], rating, now) },
          reviewDays: reviewDays.at(-1) === today ? reviewDays : [...reviewDays, today].slice(-MAX_REVIEW_DAYS),
        });
      },
    }),
    {
      name: "qiraa-hifz",
      storage: persistStorage,
      partialize: ({ records, reviewDays }) => ({ records, reviewDays }),
    },
  ),
);

export function useHifzSummary() {
  const records = useHifz((s) => s.records);
  const reviewDays = useHifz((s) => s.reviewDays);
  return useMemo(
    () => summarizeHifz(Object.values(records), new Date(), reviewDays),
    [records, reviewDays],
  );
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
