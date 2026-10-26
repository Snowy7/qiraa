import { describe, expect, it } from "vitest";
import { INITIAL_REVIEW_STATE, review } from "./hifz/srs";
import { nextPrayer, prayerTimesFor } from "./prayer/times";
import { parseVerseKey, verseOrdinal } from "./quran/verse-key";

describe("verse keys", () => {
  it("orders verses across the whole Quran", () => {
    expect(verseOrdinal("1:1")).toBe(1);
    expect(verseOrdinal("2:1")).toBe(8);
    expect(verseOrdinal("114:6")).toBe(6236);
  });

  it("rejects keys outside a chapter", () => {
    expect(parseVerseKey("1:8")).toBeNull();
    expect(parseVerseKey("115:1")).toBeNull();
    expect(parseVerseKey("2:255")).toEqual({ chapter: 2, verse: 255 });
  });
});

describe("spaced repetition", () => {
  it("grows intervals on solid recall and resets when forgotten", () => {
    const first = review(INITIAL_REVIEW_STATE, "solid");
    const second = review(first, "solid");
    const third = review(second, "solid");
    expect([first.interval, second.interval]).toEqual([2, 7]);
    expect(third.interval).toBeGreaterThan(second.interval);
    expect(review(third, "forgot")).toMatchObject({ interval: 1, repetitions: 0 });
  });
});

describe("prayer times", () => {
  const makkah = { lat: 21.4225, lng: 39.8262 };

  it("rolls over to tomorrow's Fajr after Isha", () => {
    const today = new Date("2026-03-10T00:00:00+03:00");
    const isha = prayerTimesFor(makkah, today).at(-1)!.time;
    const afterIsha = new Date(isha.getTime() + 60_000);
    const next = nextPrayer(makkah, afterIsha);
    expect(next.name).toBe("fajr");
    expect(next.time.getTime()).toBeGreaterThan(afterIsha.getTime());
  });
});
