import { useCallback, useEffect, useSyncExternalStore } from "react";
import { pageFontFamily, pageFontFile, type QuranScript } from "@noor/core";

/** Root URL of the self-hosted Quran fonts (see public/fonts/quran). */
export const FONT_ROOT = "/fonts/quran/";

/*
 * QCF scripts use one font per mushaf page. Fonts register through the
 * FontFace API on demand; the service worker keeps them for offline use.
 */

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function loadPageFont(version: "v1" | "v2", page: number): Promise<void> {
  const family = pageFontFamily(version, page);
  if (loaded.has(family)) return Promise.resolve();
  const inFlight = pending.get(family);
  if (inFlight) return inFlight;

  const face = new FontFace(
    family,
    `url(${FONT_ROOT}${pageFontFile(version, page)}) format("woff2")`,
    {
      display: "block",
    },
  );
  const promise = face
    .load()
    .then(() => {
      document.fonts.add(face);
      loaded.add(family);
      listeners.forEach((notify) => notify());
    })
    .finally(() => pending.delete(family));
  pending.set(family, promise);
  return promise;
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/**
 * Ensures the fonts for `pages` are loaded and returns a lookup from page
 * to font-family. Static scripts are always ready (their @font-face lives in
 * globals.css); page scripts return null for a page until its font loads.
 */
export function useScriptFonts(
  script: QuranScript,
  pages: readonly number[],
): (page: number) => string | null {
  const { font } = script;
  const pagesKey = pages.join(",");
  // A string snapshot keeps useSyncExternalStore stable between renders.
  const readyKey = useSyncExternalStore(subscribe, () =>
    font.kind === "static"
      ? "*"
      : pages
          .filter((p) => loaded.has(pageFontFamily(font.version, p)))
          .join(","),
  );

  useEffect(() => {
    if (font.kind !== "page" || !pagesKey) return;
    for (const page of pagesKey.split(",").map(Number)) {
      loadPageFont(font.version, page).catch(() => {});
    }
  }, [font, pagesKey]);

  return useCallback(
    (page: number) => {
      if (font.kind === "static") return font.family;
      const family = pageFontFamily(font.version, page);
      return readyKey.split(",").includes(String(page)) ? family : null;
    },
    [font, readyKey],
  );
}

/** Downloads every page font of a QCF script (for offline use). */
export async function prefetchPageFonts(
  version: "v1" | "v2",
  onProgress: (done: number) => void,
): Promise<void> {
  let done = 0;
  const pages = Array.from({ length: 604 }, (_, i) => i + 1);
  // A few at a time keeps the UI responsive and the network fair.
  for (let i = 0; i < pages.length; i += 8) {
    await Promise.all(
      pages.slice(i, i + 8).map(async (page) => {
        const res = await fetch(`${FONT_ROOT}${pageFontFile(version, page)}`);
        if (!res.ok) throw new Error(`Font ${page} failed: ${res.status}`);
        await res.arrayBuffer();
        onProgress(++done);
      }),
    );
  }
}
