import { useEffect, useSyncExternalStore } from "react";

/**
 * Per-page QCF V2 mushaf fonts. Each of the 604 mushaf pages ships its own
 * woff2 file; pages are loaded on demand through the FontFace API and the
 * service worker caches them for offline reading.
 */

const loadedPages = new Set<number>();
const pendingPages = new Map<number, Promise<void>>();
const listeners = new Set<() => void>();

/** CSS font-family for a mushaf page, matching quran.com's `p{N}-v2` naming. */
export function getPageFontFamily(pageNumber: number): string {
  return `p${pageNumber}-v2`;
}

/** Loads a page font once; concurrent callers share the same promise. */
export function loadPageFont(pageNumber: number): Promise<void> {
  if (loadedPages.has(pageNumber)) return Promise.resolve();

  const pending = pendingPages.get(pageNumber);
  if (pending) return pending;

  const fontFace = new FontFace(
    getPageFontFamily(pageNumber),
    `url('/fonts/quran/hafs/v2/woff2/p${pageNumber}.woff2') format('woff2')`,
    { display: "block" },
  );

  const promise = fontFace
    .load()
    .then(() => {
      document.fonts.add(fontFace);
      loadedPages.add(pageNumber);
      listeners.forEach((notify) => notify());
    })
    .finally(() => pendingPages.delete(pageNumber));

  pendingPages.set(pageNumber, promise);
  return promise;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

/** Starts loading a page font and re-renders once it is ready. */
export function usePageFont(pageNumber: number): boolean {
  const loaded = useSyncExternalStore(subscribe, () =>
    loadedPages.has(pageNumber),
  );
  useEffect(() => {
    loadPageFont(pageNumber).catch(() => {});
  }, [pageNumber]);
  return loaded;
}
