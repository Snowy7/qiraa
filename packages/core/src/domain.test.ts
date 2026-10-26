import { describe, expect, it } from "vitest";
import { timingIndexAt, wordAt } from "./audio/reciters";
import { INITIAL_REVIEW_STATE, review } from "./hifz/srs";
import { nextPrayer, prayerTimesFor } from "./prayer/times";
import { juzOfVerse, parseVerseKey, verseOrdinal } from "./quran/verse-key";

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
    expect(review(third, "forgot")).toMatchObject({
      interval: 1,
      repetitions: 0,
    });
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

describe("juzOfVerse", () => {
  it("maps verses to their juz", () => {
    expect(juzOfVerse("1:1")).toBe(1);
    expect(juzOfVerse("2:141")).toBe(1);
    expect(juzOfVerse("2:142")).toBe(2);
    expect(juzOfVerse("114:6")).toBe(30);
  });
});

describe("recitation timings", () => {
  const verses = [
    {
      verseKey: "1:1",
      from: 0,
      to: 6090,
      words: [
        [1, 0, 580],
        [2, 580, 1409],
      ] as const,
    },
    {
      verseKey: "1:2",
      from: 6090,
      to: 11680,
      words: [[1, 6025, 7025]] as const,
    },
  ];

  it("finds the ayah and word at a playback position", () => {
    expect(timingIndexAt(verses, 0)).toBe(0);
    expect(timingIndexAt(verses, 6089)).toBe(0);
    expect(timingIndexAt(verses, 6090)).toBe(1);
    expect(wordAt(verses[0], 600)).toBe(2);
    expect(wordAt(verses[0], 3000)).toBeNull();
  });
});
