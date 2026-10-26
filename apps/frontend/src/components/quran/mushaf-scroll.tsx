import {
  memo,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QuranScript } from "@qiraa/core";
import { MushafPage } from "./mushaf-page";

/** Pages render this many screen heights above and below the viewport. */
const OVERSCAN = 1;
/** The page being read is the one under this line (fraction of the viewport). */
const READING_LINE = 0.3;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

/** Element id of a page's slot, for scrolling to it. */
export const pageSlotId = (page: number) => `mushaf-page-${page}`;

interface MushafScrollProps {
  script: QuranScript;
  /** Page scrolled to when the list mounts (remount to start elsewhere). */
  initialPage: number;
  /** The page under the reading line changed. */
  onPageChange: (page: number) => void;
  selectedVerse: string | null;
}

/**
 * Every page of the script in one vertical flow. All slots share one height
 * (`.mushaf-slot`), so the scroll position maps to pages by arithmetic: only
 * pages near the viewport render and load their data and fonts, and when the
 * slots resize (text size, rotation) the reader stays on the same spot.
 * Scroll to a page with `pageSlotId`.
 */
export function MushafScroll({
  script,
  initialPage,
  onPageChange,
  selectedVerse,
}: MushafScrollProps) {
  const list = useRef<HTMLDivElement>(null);
  const [startPage] = useState(initialPage);
  const [range, setRange] = useState<readonly [number, number]>([
    startPage,
    startPage,
  ]);
  const pages = useMemo(
    () => Array.from({ length: script.pageCount }, (_, i) => i + 1),
    [script.pageCount],
  );
  const reportPage = useEffectEvent(onPageChange);

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const count = script.pageCount;
    let current = startPage;
    /** Where the reading line is: a page and how far into it (0–1). */
    let anchor = { page: startPage, offset: 0 };
    let height = 0;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const pitch = rect.height / count;
      // Slots resized (text size, screen width): put the reading line back
      // on the same spot of the same page before reading the position.
      if (height && rect.height !== height) {
        window.scrollTo({
          top:
            top +
            (anchor.page - 1 + anchor.offset) * pitch -
            window.innerHeight * READING_LINE,
        });
      }
      height = rect.height;

      const line = window.scrollY + window.innerHeight * READING_LINE - top;
      const index = clamp(Math.floor(line / pitch), 0, count - 1);
      anchor = { page: index + 1, offset: clamp(line / pitch - index, 0, 1) };

      const pageAt = (y: number) =>
        clamp(Math.floor((y - top) / pitch) + 1, 1, count);
      const first = pageAt(window.scrollY - window.innerHeight * OVERSCAN);
      const last = pageAt(
        window.scrollY + window.innerHeight * (1 + OVERSCAN),
      );
      setRange((r) => (r[0] === first && r[1] === last ? r : [first, last]));

      if (anchor.page !== current) {
        current = anchor.page;
        reportPage(current);
      }
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(update);

    document.getElementById(pageSlotId(startPage))?.scrollIntoView();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    observer.observe(element);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, [script.pageCount, startPage]);

  return (
    <div ref={list} className="[overflow-anchor:none]">
      {pages.map((page) => {
        const rendered = page >= range[0] && page <= range[1];
        return (
          <PageSlot
            key={page}
            script={script}
            page={page}
            rendered={rendered}
            selectedVerse={rendered ? selectedVerse : null}
          />
        );
      })}
    </div>
  );
}

const PageSlot = memo(function PageSlot({
  script,
  page,
  rendered,
  selectedVerse,
}: {
  script: QuranScript;
  page: number;
  rendered: boolean;
  selectedVerse: string | null;
}) {
  return (
    <div id={pageSlotId(page)} className="mushaf-slot">
      {rendered && (
        <MushafPage script={script} page={page} selectedVerse={selectedVerse} />
      )}
    </div>
  );
});
