/**
 * SM-2 style spaced repetition tuned for Quran memorisation.
 * A rating maps to a quality: forgot (0), shaky (1), good (2), solid (3).
 */

export type Confidence = "new" | "learning" | "shaky" | "good" | "solid";
export type ReviewRating = "forgot" | "shaky" | "good" | "solid";

export interface ReviewState {
  easeFactor: number;
  /** Days until the next review. */
  interval: number;
  /** Consecutive successful reviews. */
  repetitions: number;
}

export const INITIAL_REVIEW_STATE: ReviewState = { easeFactor: 2.5, interval: 0, repetitions: 0 };

const QUALITY: Record<ReviewRating, 0 | 1 | 2 | 3> = { forgot: 0, shaky: 1, good: 2, solid: 3 };

/** The confidence label stored after a review with this rating. */
export const CONFIDENCE_AFTER: Record<ReviewRating, Confidence> = {
  forgot: "new",
  shaky: "shaky",
  good: "good",
  solid: "solid",
};

/** Rating implied when a user marks a verse with a confidence directly. */
export const RATING_FOR_CONFIDENCE: Record<Confidence, ReviewRating> = {
  new: "forgot",
  learning: "shaky",
  shaky: "shaky",
  good: "good",
  solid: "solid",
};

export function review(state: ReviewState, rating: ReviewRating): ReviewState {
  const quality = QUALITY[rating];
  const { easeFactor, interval, repetitions } = state;

  if (quality === 0) {
    return { repetitions: 0, interval: 1, easeFactor: Math.max(1.3, easeFactor - 0.2) };
  }
  if (quality === 1) {
    return {
      repetitions: 0,
      interval: Math.max(1, Math.min(3, Math.round(interval * 0.5))),
      easeFactor: Math.max(1.3, easeFactor - 0.15),
    };
  }

  const reps = repetitions + 1;
  const solid = quality === 3;
  const nextInterval =
    reps === 1
      ? solid ? 2 : 1
      : reps === 2
        ? solid ? 7 : 6
        : Math.round(interval * easeFactor * (solid ? 1.2 : 1));
  return {
    repetitions: reps,
    interval: nextInterval,
    easeFactor: solid ? easeFactor + 0.1 : easeFactor,
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function nextReviewAt(from: number, intervalDays: number): number {
  return from + intervalDays * DAY_MS;
}
