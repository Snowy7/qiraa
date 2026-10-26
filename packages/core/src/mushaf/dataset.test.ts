import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHAPTERS } from "../quran/chapters";
import { QURAN_SCRIPT_IDS } from "./scripts";
import { LINES_PER_PAGE, pageSlots } from "./slots";
import { chapterPageRange } from "./verses";
import { assembleChapterVerses, pageOfVerse, wordToPlainText } from "./verses";
import type { PageChunk, PageLines, ScriptIndex } from "./types";

const DATA = join(import.meta.dirname, "../../data/scripts");

function loadScript(id: string) {
  const dir = join(DATA, id);
  const index = JSON.parse(
    readFileSync(join(dir, "index.json"), "utf8"),
  ) as ScriptIndex;
  const pages = new Map<number, PageLines>();
  for (const file of readdirSync(dir).filter((f) => f.startsWith("p"))) {
    const chunk = JSON.parse(
      readFileSync(join(dir, file), "utf8"),
    ) as PageChunk;
    for (const [page, lines] of Object.entries(chunk))
      pages.set(Number(page), lines);
  }
  return { index, pages };
}

describe.each(QURAN_SCRIPT_IDS)("%s dataset", (id) => {
  const { index, pages } = loadScript(id);

  it("has every page of the layout", () => {
    expect(pages.size).toBe(index.pageCount);
  });

  it("numbers words continuously across lines and pages", () => {
    const next = new Map<string, number>();
    for (let page = 1; page <= index.pageCount; page++) {
      for (const [, segments] of pages.get(page)!) {
        for (const [key, start, words] of segments) {
          expect(start, key).toBe(next.get(key) ?? 1);
          next.set(key, start + words.length);
        }
      }
    }
  });

  it("contains no leftover markup", () => {
    for (const lines of pages.values()) {
      for (const [, segments] of lines) {
        for (const [key, , words, end] of segments) {
          for (const word of [...words, end ?? ""]) {
            expect(wordToPlainText(word), key).not.toMatch(/[<>]/);
          }
        }
      }
    }
  });

  it("reassembles every chapter with complete, ordered verses", () => {
    for (const chapter of CHAPTERS) {
      const [first, last] = chapterPageRange(id, chapter.id);
      const range = Array.from(
        { length: last - first + 1 },
        (_, i) => first + i,
      );
      const verses = assembleChapterVerses(
        range.map((page) => ({ page, lines: pages.get(page)! })),
        chapter.id,
      );
      expect(verses.map((v) => v.verse)).toEqual(
        Array.from({ length: chapter.versesCount }, (_, i) => i + 1),
      );
      for (const verse of verses) {
        expect(verse.words.length, verse.key).toBeGreaterThan(0);
        expect(verse.end, verse.key).not.toBeNull();
      }
    }
  });

  it("opens every surah once, within the 15 line slots", () => {
    const titles: number[] = [];
    for (let page = 1; page <= index.pageCount; page++) {
      const slots = pageSlots(pages.get(page)!, index.pageFirstVerse[page]);
      const used = slots.reduce(
        (sum, slot) => sum + (slot.kind === "line" ? 1 : slot.span),
        0,
      );
      expect(used, `page ${page}`).toBe(LINES_PER_PAGE);
      for (const slot of slots)
        if (slot.kind === "opening" && slot.title) titles.push(slot.chapter);
    }
    // IndoPak starts Al-Hijr mid-line, leaving no room for its title.
    const midLine = id === "indopak" ? [15] : [];
    expect(titles).toEqual(
      CHAPTERS.map((c) => c.id).filter((c) => !midLine.includes(c)),
    );
  });
});

describe("pageOfVerse", () => {
  const { index } = loadScript("qcf-v2");

  it("finds the page a verse starts on", () => {
    expect(pageOfVerse(index, "1:1")).toBe(1);
    expect(pageOfVerse(index, "2:142")).toBe(22);
    expect(pageOfVerse(index, "2:255")).toBe(42);
    expect(pageOfVerse(index, "114:6")).toBe(604);
  });
});
