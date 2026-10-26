import {
  CONFIDENCE_AFTER,
  INITIAL_REVIEW_STATE,
  TOTAL_VERSES,
  nextReviewAt,
  parseVerseKey,
  review,
  type Confidence,
  type ReviewRating,
} from "@noor/core";
import { db } from "./index";
import type { HifzProgress } from "./types";

/** Records a review of a verse (creating its entry on first review). */
export async function recordReview(
  verseKey: string,
  rating: ReviewRating,
): Promise<void> {
  const ref = parseVerseKey(verseKey);
  if (!ref) throw new Error(`Invalid verse key: ${verseKey}`);
  const now = Date.now();
  const existing = await db.hifzProgress
    .where("verseKey")
    .equals(verseKey)
    .first();
  const state = existing
    ? {
        easeFactor: existing.easeFactor,
        interval: existing.interval,
        repetitions: existing.streak,
      }
    : INITIAL_REVIEW_STATE;
  const next = review(state, rating);
  const fields = {
    confidence: CONFIDENCE_AFTER[rating],
    lastReviewedAt: now,
    nextReviewAt: nextReviewAt(now, next.interval),
    easeFactor: next.easeFactor,
    interval: next.interval,
    streak: next.repetitions,
    updatedAt: now,
  };

  if (existing) {
    await db.hifzProgress.update(existing.id, {
      ...fields,
      reviewCount: existing.reviewCount + 1,
    });
  } else {
    await db.hifzProgress.add({
      id: crypto.randomUUID(),
      verseKey,
      chapterId: ref.chapter,
      verseNumber: ref.verse,
      reviewCount: 1,
      createdAt: now,
      ...fields,
    });
  }
}

export function getDueReviews(limit = 20): Promise<HifzProgress[]> {
  return db.hifzProgress
    .where("nextReviewAt")
    .belowOrEqual(Date.now())
    .limit(limit)
    .sortBy("nextReviewAt");
}

export function getVerseConfidence(
  verseKey: string,
): Promise<Confidence | undefined> {
  return db.hifzProgress
    .where("verseKey")
    .equals(verseKey)
    .first()
    .then((entry) => entry?.confidence);
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

const dayKey = (time: number) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/** Everything the dashboards show, computed in a single pass. */
export async function getHifzSummary(): Promise<HifzSummary> {
  const all = await db.hifzProgress.toArray();
  const now = Date.now();
  const today = dayKey(now);
  const reviewDays = new Set<string>();
  const summary: HifzSummary = {
    total: TOTAL_VERSES,
    memorized: 0,
    learning: 0,
    due: 0,
    reviewedToday: 0,
    streak: 0,
  };

  for (const entry of all) {
    if (entry.confidence === "good" || entry.confidence === "solid")
      summary.memorized++;
    else summary.learning++;
    if (entry.nextReviewAt !== undefined && entry.nextReviewAt <= now)
      summary.due++;
    if (entry.lastReviewedAt !== undefined) {
      const key = dayKey(entry.lastReviewedAt);
      reviewDays.add(key);
      if (key === today) summary.reviewedToday++;
    }
  }

  const cursor = new Date();
  if (!reviewDays.has(today)) cursor.setDate(cursor.getDate() - 1);
  while (reviewDays.has(dayKey(cursor.getTime()))) {
    summary.streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return summary;
}
