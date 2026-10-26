/// <reference lib="webworker" />
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { RangeRequestsPlugin } from "workbox-range-requests";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare let self: ServiceWorkerGlobalScope;

/*
 * Offline strategy:
 *  - App shell, UI fonts and the default script's Quran data are precached.
 *  - Other Quran data chunks and page fonts are cached the first time they load
 *    (or all at once from Settings → Offline). They are immutable, so cache-first.
 *  - quran.com content (translations, tafsir, recitation timings) is served
 *    from cache and refreshed in the background.
 *  - Surah recitation files are cached when downloaded, with range support so
 *    <audio> can seek inside them offline.
 * Cache names must match OFFLINE_CACHES in src/lib/offline.ts.
 */

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Every app URL (e.g. /quran/36 opened offline) is served the cached shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

const ok = new CacheableResponsePlugin({ statuses: [200] });

registerRoute(
  ({ url, sameOrigin }) =>
    sameOrigin && url.pathname.startsWith("/assets/data/"),
  new CacheFirst({ cacheName: "quran-data", plugins: [ok] }),
);

registerRoute(
  ({ url, sameOrigin }) =>
    sameOrigin && url.pathname.startsWith("/fonts/quran/"),
  new CacheFirst({
    cacheName: "quran-fonts",
    plugins: [
      ok,
      new ExpirationPlugin({ maxEntries: 1400, purgeOnQuotaError: true }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    url.origin === "https://api.quran.com" ||
    url.origin === "https://api.qurancdn.com",
  new StaleWhileRevalidate({
    cacheName: "quran-api",
    plugins: [
      ok,
      new ExpirationPlugin({ maxEntries: 3000, purgeOnQuotaError: true }),
    ],
  }),
);

registerRoute(
  ({ url }) =>
    url.hostname === "download.quranicaudio.com" ||
    url.hostname === "audio.qurancdn.com",
  new CacheFirst({
    cacheName: "quran-audio",
    plugins: [
      ok,
      new RangeRequestsPlugin(),
      new ExpirationPlugin({ maxEntries: 20000, purgeOnQuotaError: true }),
    ],
  }),
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
