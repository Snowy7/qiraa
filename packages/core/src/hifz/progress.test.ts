import { describe, expect, it } from "vitest";
import { reviewRecord, summarizeHifz } from "./progress";

const DAY = 24 * 60 * 60 * 1000;

describe("hifz progress", () => {
  it("builds a record on first review and grows it on the next", () => {
    const now = Date.UTC(2026, 9, 1);
    const first = reviewRecord(undefined, "good", now);
    expect(first).toMatchObject({ confidence: "good", interval: 1, streak: 1, reviewCount: 1 });
    expect(first.nextReviewAt).toBe(now + DAY);

    const second = reviewRecord(first, "solid", now + DAY);
    expect(second).toMatchObject({ confidence: "solid", interval: 7, streak: 2, reviewCount: 2 });
  });

  it("counts due verses and a streak of consecutive review days", () => {
    const now = new Date(2026, 9, 10, 12);
    const at = (daysAgo: number) => now.getTime() - daysAgo * DAY;
    const summary = summarizeHifz(
      [
        { confidence: "good", lastReviewedAt: at(1), nextReviewAt: at(0) },
        { confidence: "shaky", lastReviewedAt: at(2), nextReviewAt: at(-3) },
        { confidence: "solid", lastReviewedAt: at(4), nextReviewAt: at(-10) },
      ],
      now,
    );
    expect(summary).toMatchObject({ memorized: 2, learning: 1, due: 1, reviewedToday: 0 });
    // Reviewed yesterday and the day before, not three days ago.
    expect(summary.streak).toBe(2);
  });
});
