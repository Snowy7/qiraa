import { LINES_PER_PAGE, type QuranScript } from "@qiraa/core";

/** Largest Quran font size the user's text-size preference allows (in points). */
const SIZE_CAP = 38;

export interface MushafMetrics {
  fontSize: number;
  lineHeight: number;
  /** Width every justified line spans: the printed line, in points. */
  lineWidth: number;
  padding: number;
  footer: number;
  /** Height of a page's 15 line slots plus padding and footer. */
  height: number;
}

export function mushafMetrics(script: QuranScript, fontSize: number): MushafMetrics {
  const lineHeight = Math.round(fontSize * script.lineHeight * 0.88);
  const padding = Math.round(fontSize * 0.6);
  const footer = Math.round(fontSize * 1.5);
  return {
    fontSize,
    lineHeight,
    lineWidth: fontSize * script.lineWidthEm,
    padding,
    footer,
    height: padding * 2 + LINES_PER_PAGE * lineHeight + footer,
  };
}

/**
 * Font size that fits a page into the available box. Lines always fit the
 * width; `height` is given when a whole page must fit on screen (page
 * turning) and omitted when pages scroll, where a page may be taller.
 */
export function fitMushafFontSize(
  script: QuranScript,
  scale: number,
  width: number,
  height?: number,
): number {
  // 0.8em margins, as on the web: a few lines set slightly wider than the printed line.
  let size = Math.min(width / (script.lineWidthEm + 1.6), SIZE_CAP * scale);
  if (height !== undefined) {
    size = Math.min(size, height / (LINES_PER_PAGE * script.lineHeight * 0.88 + 2.7));
  }
  return Math.floor(size * 10) / 10;
}
