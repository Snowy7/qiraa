/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
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
 *  - quran.com content (translations, tafsir) is served from cache and refreshed.
 *  - Recitations are cached once played or downloaded, with range support so
 *    <audio> can seek inside cached files.
 * Cache names must match OFFLINE_CACHES in src/lib/offline.ts.
 */

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

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
  ({ url }) => url.origin === "https://api.quran.com",
  new StaleWhileRevalidate({
    cacheName: "quran-api",
    plugins: [
      ok,
      new ExpirationPlugin({ maxEntries: 3000, purgeOnQuotaError: true }),
    ],
  }),
);

registerRoute(
  ({ url }) => url.hostname === "everyayah.com",
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
