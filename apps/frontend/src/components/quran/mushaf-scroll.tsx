import {
  memo,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QuranScript } from "@qiraa/core";
import { mushafLineHeight, type MushafLayout } from "./mushaf-layout";
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
  layout: MushafLayout;
  /** Page scrolled to when the list mounts (remount to start elsewhere). */
  initialPage: number;
  /** The page under the reading line changed. */
  onPageChange: (page: number) => void;
  selectedVerse: string | null;
}

/**
 * Every page of the script in one vertical flow. Each page has a slot that
 * holds its space whether or not it's drawn, so only pages near the viewport
 * render and load their data and fonts. The page under the reading line is
 * found from the slots' positions, and when slots resize (text size,
 * rotation, a flowing page drawn for the first time) the reader stays on the
 * same spot. Scroll to a page with `pageSlotId`.
 */
export function MushafScroll({
  script,
  layout,
  initialPage,
  onPageChange,
  selectedVerse,
}: MushafScrollProps) {
  const list = useRef<HTMLDivElement>(null);
  const [startPage] = useState(initialPage);
  /** The list has scrolled to `startPage` (once, even if effects re-run). */
  const started = useRef(false);
  const [range, setRange] = useState<readonly [number, number]>([
    startPage,
    startPage,
  ]);
  const pages = useMemo(
    () => Array.from({ length: script.pageCount }, (_, i) => i + 1),
    [script.pageCount],
  );
  const reportPage = useEffectEvent(onPageChange);

  // Flowing pages are as tall as their words need: until a page has been
  // drawn at this size, its slot holds an estimate (15 printed lines of
  // text wrapped to the page width, plus room for a surah header).
  const flowKey = layout.flow
    ? `${layout.size.toFixed(2)}:${layout.pageWidth}`
    : null;
  const textWidth = layout.pageWidth - 1.6 * layout.size;
  const rows = Math.ceil(
    (15 * script.lineWidthEm * layout.size * 1.1) / textWidth,
  );
  const estimate = (rows + 3) * mushafLineHeight(script) * layout.size;

  useLayoutEffect(() => {
    const element = list.current;
    if (!element) return;
    const slots = element.children as HTMLCollectionOf<HTMLElement>;
    const count = script.pageCount;
    let current = startPage;
    /**
     * The spot under the reading line at the last update: a page, how far
     * into it (0–1), and where that was in the document.
     */
    let anchor: { page: number; offset: number; y: number } | null = null;
    /** Scroll position at the last update. */
    let scrolledTo = 0;

    /** Index of the slot at `y` px from the top of the list. */
    const indexAt = (y: number) => {
      let low = 0;
      let high = count - 1;
      while (low < high) {
        const middle = (low + high + 1) >> 1;
        if (slots[middle].offsetTop <= y) low = middle;
        else high = middle - 1;
      }
      return low;
    };

    /** Document position of a spot `offset` (0–1) into a page's slot. */
    const spotY = (top: number, page: number, offset: number) => {
      const slot = slots[page - 1];
      return top + slot.offsetTop + offset * slot.offsetHeight;
    };

    const update = () => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      // Slots resized since the last update (pages drawn, text size,
      // rotation): scroll by however far that moved the spot that was under
      // the reading line. Only layout counts, so scrolls made in between,
      // by the reader or the app, are never undone, and a change below the
      // spot needs no scroll at all (a fling carries on).
      if (anchor) {
        const shift = spotY(top, anchor.page, anchor.offset) - anchor.y;
        if (Math.abs(shift) > 0.5) {
          // A shorter document pulls the scroll back to its new end on its
          // own; that isn't a scroll to keep, so start from where we were.
          const end =
            document.documentElement.scrollHeight - window.innerHeight;
          const pulledBack =
            window.scrollY >= end - 1 && window.scrollY < scrolledTo;
          window.scrollTo({
            top: (pulledBack ? scrolledTo : window.scrollY) + shift,
          });
        }
      }

      const line = window.scrollY + window.innerHeight * READING_LINE - top;
      const index = indexAt(line);
      const slot = slots[index];
      const offset = clamp((line - slot.offsetTop) / slot.offsetHeight, 0, 1);
      anchor = { page: index + 1, offset, y: spotY(top, index + 1, offset) };
      scrolledTo = window.scrollY;

      const first =
        indexAt(window.scrollY - window.innerHeight * OVERSCAN - top) + 1;
      const last =
        indexAt(window.scrollY + window.innerHeight * (1 + OVERSCAN) - top) + 1;
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

    if (!started.current) {
      started.current = true;
      document.getElementById(pageSlotId(startPage))?.scrollIntoView();
    }
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
    <div ref={list} className="relative [overflow-anchor:none]">
      {pages.map((page) => {
        const rendered = page >= range[0] && page <= range[1];
        return (
          <PageSlot
            key={page}
            script={script}
            page={page}
            rendered={rendered}
            selectedVerse={rendered ? selectedVerse : null}
            flowKey={flowKey}
            estimate={estimate}
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
  flowKey,
  estimate,
}: {
  script: QuranScript;
  page: number;
  rendered: boolean;
  selectedVerse: string | null;
  /** Identifies the flowing layout (size and width); null for printed lines. */
  flowKey: string | null;
  /** Height of a flowing page that hasn't been drawn at this layout yet. */
  estimate: number;
}) {
  const slot = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState<{ key: string; height: number }>();

  // A flowing page remembers its drawn height, so it keeps its place after
  // it scrolls away and stops rendering.
  useLayoutEffect(() => {
    const element = slot.current;
    if (!flowKey || !rendered || !element) return;
    const observer = new ResizeObserver(() =>
      setDrawn({ key: flowKey, height: element.offsetHeight }),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [flowKey, rendered]);

  const height =
    flowKey && !rendered
      ? drawn?.key === flowKey
        ? drawn.height
        : estimate
      : undefined;

  return (
    <div
      ref={slot}
      id={pageSlotId(page)}
      className="mushaf-slot"
      style={height ? { height } : undefined}
    >
      {rendered && (
        <MushafPage script={script} page={page} selectedVerse={selectedVerse} />
      )}
    </div>
  );
});
