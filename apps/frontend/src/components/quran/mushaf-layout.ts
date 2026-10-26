import {
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import type { QuranScript } from "@qiraa/core";

/** Line height of mushaf pages, in em. */
export const mushafLineHeight = (script: QuranScript) =>
  script.lineHeight * 0.88;

/** CSS variables a `.mushaf-stage` gives its pages (see globals.css). */
export function stageStyle(script: QuranScript, layout: MushafLayout | null) {
  return {
    "--line-em": script.lineWidthEm,
    "--mushaf-lh": mushafLineHeight(script),
    "--mushaf-size": layout ? `${layout.size}px` : undefined,
  } as CSSProperties;
}

/** A scroll-view page at the default text size is this wide (42rem). */
const READING_WIDTH = 672;
/** Space between the two pages of a spread. */
const SPREAD_GAP = 24;
/** Header and page bar a page leaves room for, from tablet up. */
const READER_CHROME = 128;

export interface MushafLayout {
  /** Font size of the pages, in px. */
  size: number;
  /** A printed line doesn't fit at this size: the words flow instead. */
  flow: boolean;
  /** Width available to one page, in px. */
  pageWidth: number;
}

/**
 * Sizes the mushaf for its stage. At the default text size a page keeps its
 * printed lines, as large as the stage allows (in the pages view also as tall
 * as the screen, from tablet up). The chosen text size scales that, and is
 * honoured even when a printed line no longer fits: the words then flow as
 * justified text, so a page can run past the screen but stays readable.
 */
export function useMushafLayout(
  stage: RefObject<HTMLElement | null>,
  script: QuranScript,
  view: "scroll" | "pages",
  spread: number,
  scale: number,
): MushafLayout | null {
  const [box, setBox] = useState<{ width: number; viewport: number[] }>();

  useLayoutEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      const style = getComputedStyle(element);
      const width =
        element.clientWidth -
        parseFloat(style.paddingInlineStart) -
        parseFloat(style.paddingInlineEnd);
      const viewport = [window.innerWidth, window.innerHeight];
      setBox((current) =>
        current?.width === width && current.viewport.join() === viewport.join()
          ? current
          : { width, viewport },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [stage]);

  if (!box) return null;
  const [viewportWidth, viewportHeight] = box.viewport;
  // Page side padding in em, as `--pad-em` in globals.css.
  const pageEm = script.lineWidthEm + (viewportWidth < 640 ? 1 : 1.6);
  const pageWidth = (box.width - SPREAD_GAP * (spread - 1)) / spread;
  const fitWidth = pageWidth / pageEm;
  const fitHeight =
    viewportWidth >= 768
      ? (viewportHeight - READER_CHROME) / (17.2 * mushafLineHeight(script))
      : Infinity;
  const printed = Math.min(
    fitWidth,
    view === "scroll" ? READING_WIDTH / pageEm : fitHeight,
  );
  const size = printed * scale;
  return { size, flow: size > fitWidth * 1.001, pageWidth };
}
