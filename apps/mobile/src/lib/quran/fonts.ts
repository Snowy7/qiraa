import { useCallback, useEffect, useSyncExternalStore } from "react";
import * as Font from "expo-font";
import { Directory, File, Paths } from "expo-file-system";
import { pageFontFamily, type QuranScript } from "@qiraa/core";
import { downloadFile } from "@/lib/download-file";

/*
 * QCF (Madani mushaf) scripts use one font per page. Native platforms can't
 * read the web's woff2 files, so pages download as TTF from quran.com's CDN
 * on first use and stay on disk; Settings can download every page at once.
 * Static scripts (Hafs, Tajweed, IndoPak) are bundled and always ready.
 */

type QcfVersion = "v1" | "v2";

const CDN = "https://static.qurancdn.com/fonts/quran/hafs";
export const QCF_PAGES = 604;

const fontsDirectory = new Directory(Paths.document, "fonts");

const fontDirectory = (version: QcfVersion) => new Directory(fontsDirectory, version);

const fontFile = (version: QcfVersion, page: number) =>
  new File(fontDirectory(version), `p${page}.ttf`);

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

async function download(version: QcfVersion, page: number): Promise<File> {
  const file = fontFile(version, page);
  if (file.exists) return file;
  fontDirectory(version).create({ idempotent: true, intermediates: true });
  await downloadFile(`${CDN}/${version}/ttf/p${page}.ttf`, file);
  return file;
}

function loadPageFont(version: QcfVersion, page: number): Promise<void> {
  const family = pageFontFamily(version, page);
  if (loaded.has(family)) return Promise.resolve();
  const inFlight = pending.get(family);
  if (inFlight) return inFlight;

  const promise = download(version, page)
    .then((file) => Font.loadAsync({ [family]: file.uri }))
    .then(() => {
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
 * Ensures the fonts for `pages` are loaded and returns a lookup from page to
 * font family. Static scripts are always ready; page scripts return null for
 * a page until its font has loaded.
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
      : pages.filter((p) => loaded.has(pageFontFamily(font.version, p))).join(","),
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

/** Starts loading the font a mushaf page needs (only QCF scripts have one per page). */
export function preloadPageFont(script: QuranScript, page: number) {
  if (script.font.kind === "page") {
    loadPageFont(script.font.version, page).catch(() => {});
  }
}

/** Number of a QCF version's page fonts already on disk. */
export function downloadedPageFonts(version: QcfVersion): number {
  const directory = fontDirectory(version);
  return directory.exists ? directory.list().filter((item) => item.name.endsWith(".ttf")).length : 0;
}

/** Downloads every page font of a QCF version, a few at a time. */
export async function downloadAllPageFonts(
  version: QcfVersion,
  onProgress: (done: number) => void,
): Promise<void> {
  let done = 0;
  const pages = Array.from({ length: QCF_PAGES }, (_, i) => i + 1);
  for (let i = 0; i < pages.length; i += 8) {
    await Promise.all(
      pages.slice(i, i + 8).map(async (page) => {
        await download(version, page);
        onProgress(++done);
      }),
    );
  }
}

/** Bytes used by downloaded page fonts. */
export function pageFontsSize(): number {
  return fontsDirectory.exists ? (fontsDirectory.size ?? 0) : 0;
}

/** Deletes every downloaded page font (loaded ones stay usable until restart). */
export function deletePageFonts() {
  if (fontsDirectory.exists) fontsDirectory.delete();
}
