import { TOTAL_VERSES } from "../quran/chapters";
import {
  CONFIDENCE_AFTER,
  INITIAL_REVIEW_STATE,
  nextReviewAt,
  review,
  type Confidence,
  type ReviewRating,
} from "./srs";

/** What a client stores for each verse it has reviewed. */
export interface HifzRecord {
  confidence: Confidence;
  easeFactor: number;
  /** Days until the next review. */
  interval: number;
  /** Consecutive successful reviews. */
  streak: number;
  reviewCount: number;
  lastReviewedAt: number;
  nextReviewAt: number;
}

/** A verse's record after a review; `previous` is undefined on its first review. */
export function reviewRecord(
  previous: HifzRecord | undefined,
  rating: ReviewRating,
  now: number,
): HifzRecord {
  const next = review(
    previous
      ? {
          easeFactor: previous.easeFactor,
          interval: previous.interval,
          repetitions: previous.streak,
        }
      : INITIAL_REVIEW_STATE,
    rating,
  );
  return {
    confidence: CONFIDENCE_AFTER[rating],
    easeFactor: next.easeFactor,
    interval: next.interval,
    streak: next.repetitions,
    reviewCount: (previous?.reviewCount ?? 0) + 1,
    lastReviewedAt: now,
    nextReviewAt: nextReviewAt(now, next.interval),
  };
}

export interface HifzSummary {
  total: number;
  memorized: number;
  learning: number;
  due: number;
  reviewedToday: number;
  /** Consecutive days with at least one review, ending today or yesterday. */
  streak: number;
}

/** The local calendar day of a moment, as `YYYY-M-D`; streaks count these. */
export function reviewDay(time: number): string {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Everything a memorisation dashboard shows, in one pass over the records.
 * Records only keep their latest review, so pass every `reviewDay` the user
 * reviewed on for the streak to survive re-reviewing the same verses.
 */
export function summarizeHifz(
  records: Iterable<
    Pick<HifzRecord, "confidence"> &
      Partial<Pick<HifzRecord, "lastReviewedAt" | "nextReviewAt">>
  >,
  now: Date,
  days: Iterable<string> = [],
): HifzSummary {
  const today = reviewDay(now.getTime());
  const reviewDays = new Set(days);
  const summary: HifzSummary = {
    total: TOTAL_VERSES,
    memorized: 0,
    learning: 0,
    due: 0,
    reviewedToday: 0,
    streak: 0,
  };

  for (const record of records) {
    if (record.confidence === "good" || record.confidence === "solid")
      summary.memorized++;
    else summary.learning++;
    if (record.nextReviewAt !== undefined && record.nextReviewAt <= now.getTime())
      summary.due++;
    if (record.lastReviewedAt !== undefined) {
      const key = reviewDay(record.lastReviewedAt);
      reviewDays.add(key);
      if (key === today) summary.reviewedToday++;
    }
  }

  const cursor = new Date(now);
  if (!reviewDays.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (reviewDays.has(reviewDay(cursor.getTime()))) {
    summary.streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return summary;
}
