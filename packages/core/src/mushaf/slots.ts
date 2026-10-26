import { getChapter } from "../quran/chapters";
import { parseVerseKey } from "../quran/verse-key";
import type { Line, PageLines } from "./types";

/** Every printed mushaf page has 15 line slots (Madani and IndoPak alike). */
export const LINES_PER_PAGE = 15;

export type PageSlot =
  | { kind: "line"; line: Line }
  /**
   * The opening of a surah across `span` line slots: its title frame and/or
   * Bismillah. The Madani print sometimes ends a page with the title and
   * starts the next with the Bismillah. `span` is 0 when the layout leaves
   * no room (some IndoPak pages), so the opening adds height to the page.
   */
  | {
      kind: "opening";
      chapter: number;
      title: boolean;
      bismillah: boolean;
      span: number;
    }
  /** Blank line slots. */
  | { kind: "gap"; span: number };

/** The chapter whose first word opens this line, if any. */
function chapterStartingAt(line: Line | undefined): number | null {
  const first = line?.[1][0];
  if (!first || first[1] !== 1) return null;
  const ref = parseVerseKey(first[0]);
  return ref?.verse === 1 ? ref.chapter : null;
}

/**
 * Lays a page out in its 15 printed slots. The dataset omits the slots that
 * hold a surah's title and Bismillah, so a run of missing lines before a
 * surah's first line is its opening, and a run that closes the page is the
 * opening of the surah starting on the next page (`nextPageFirstVerse`).
 */
export function pageSlots(
  lines: PageLines,
  nextPageFirstVerse?: string,
): PageSlot[] {
  const byNumber = new Map(lines.map((line) => [line[0], line]));
  const nextRef = nextPageFirstVerse ? parseVerseKey(nextPageFirstVerse) : null;
  const slots: PageSlot[] = [];
  let n = 1;
  while (n <= LINES_PER_PAGE) {
    const line = byNumber.get(n);
    if (line) {
      const starting = chapterStartingAt(line);
      const previous = slots.at(-1);
      // A surah that starts on a line with no slot reserved for its opening.
      if (starting && previous?.kind !== "opening") {
        const chapter = getChapter(starting)!;
        slots.push({
          kind: "opening",
          chapter: starting,
          title: true,
          bismillah: chapter.bismillahPre,
          span: 0,
        });
      }
      slots.push({ kind: "line", line });
      n++;
      continue;
    }

    let end = n;
    while (end <= LINES_PER_PAGE && !byNumber.has(end)) end++;
    const span = end - n;
    const closesPage = end > LINES_PER_PAGE;
    const chapterId = closesPage
      ? nextRef?.verse === 1
        ? nextRef.chapter
        : null
      : chapterStartingAt(byNumber.get(end));
    const chapter = chapterId ? getChapter(chapterId) : undefined;

    if (!chapter) {
      slots.push({ kind: "gap", span });
    } else if (closesPage) {
      // The title closes this page; the Bismillah follows if there's room.
      slots.push({
        kind: "opening",
        chapter: chapter.id,
        title: true,
        bismillah: span >= 2 && chapter.bismillahPre,
        span,
      });
    } else {
      // One slot at the top of a page under a title printed on the page before.
      const bismillahOnly = span === 1 && n === 1 && chapter.bismillahPre;
      slots.push({
        kind: "opening",
        chapter: chapter.id,
        title: !bismillahOnly,
        bismillah: chapter.bismillahPre && (bismillahOnly || span >= 2),
        span,
      });
    }
    n = end;
  }
  return slots;
}
