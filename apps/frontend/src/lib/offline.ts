import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CHAPTERS,
  QURAN_SCRIPTS,
  chapterTranslationUrl,
  getChapter,
  type QuranScriptId,
} from "@qiraa/core";
import { queryClient } from "@/lib/query-client";
import { recitationQuery } from "@/lib/stores/audio";
import { prefetchScriptData } from "@/lib/quran/data";
import { FONT_ROOT, prefetchPageFonts } from "@/lib/quran/fonts";

/*
 * Explicit offline downloads. Each job simply requests the same URLs the app
 * uses while reading; the service worker (src/sw.ts) stores the responses,
 * so nothing here duplicates the caching logic.
 */

/** Runtime caches created by the service worker; cleared by "Clear downloads". */
export const OFFLINE_CACHES = [
  "quran-data",
  "quran-fonts",
  "quran-api",
  "quran-audio",
] as const;

type JobState =
  | { status: "running"; done: number; total: number }
  | { status: "done" }
  | { status: "failed" };

interface DownloadsState {
  jobs: Record<string, JobState>;
  setJob: (id: string, state: JobState) => void;
  reset: () => void;
}

/** Download progress and completion, persisted so finished downloads stay marked. */
export const useDownloads = create<DownloadsState>()(
  persist(
    (set) => ({
      jobs: {},
      setJob: (id, state) => set((s) => ({ jobs: { ...s.jobs, [id]: state } })),
      reset: () => set({ jobs: {} }),
    }),
    {
      name: "qiraa-downloads",
      // Interrupted jobs are not resumed; forget them on reload.
      partialize: ({ jobs }) => ({
        jobs: Object.fromEntries(
          Object.entries(jobs).filter(([, job]) => job.status === "done"),
        ),
      }),
    },
  ),
);

export const jobId = {
  script: (id: QuranScriptId) => `script:${id}`,
  translation: (id: number) => `translation:${id}`,
  audio: (reciterId: number, chapter: number) =>
    `audio:${reciterId}:${chapter}`,
};

/**
 * Runs a download job with progress. `progress()` advances by one step;
 * `progress(n)` sets the absolute amount (used for byte counts).
 */
async function run(
  id: string,
  total: number,
  work: (progress: (done?: number) => void) => Promise<void>,
) {
  const { setJob } = useDownloads.getState();
  if (useDownloads.getState().jobs[id]?.status === "running") return;
  // Ask the browser not to evict what the user explicitly downloaded.
  navigator.storage?.persist?.().catch(() => {});
  let done = 0;
  setJob(id, { status: "running", done, total });
  try {
    let shownPercent = 0;
    await work((value) => {
      done = value ?? done + 1;
      // Byte progress arrives in small chunks; only re-render on whole percents.
      const percent = Math.floor((done / total) * 100);
      if (percent === shownPercent) return;
      shownPercent = percent;
      setJob(id, { status: "running", done, total });
    });
    setJob(id, { status: "done" });
  } catch (error) {
    console.error(`Download ${id} failed`, error);
    setJob(id, { status: "failed" });
  }
}

async function fetchOk(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await res.arrayBuffer();
}

/** Layout data plus fonts for a script (604 page fonts for the QCF scripts). */
export function downloadScript(scriptId: QuranScriptId) {
  const { font } = QURAN_SCRIPTS[scriptId];
  const total = font.kind === "page" ? 605 : 2;
  return run(jobId.script(scriptId), total, async (progress) => {
    await prefetchScriptData(scriptId);
    progress();
    if (font.kind === "page") {
      await prefetchPageFonts(font.version, () => progress());
    } else {
      await fetchOk(`${FONT_ROOT}${font.file}`);
      progress();
    }
  });
}

/** One request per surah for the chosen translation. */
export function downloadTranslation(translationId: number) {
  return run(
    jobId.translation(translationId),
    CHAPTERS.length,
    async (progress) => {
      for (const chapter of CHAPTERS) {
        await fetchOk(chapterTranslationUrl(translationId, chapter.id));
        progress();
      }
    },
  );
}

/** A surah's recitation file (and its timings) for offline listening. */
export async function downloadChapterAudio(
  reciterId: number,
  chapterId: number,
) {
  if (!getChapter(chapterId)) return;
  // Fetched again (not reused from memory) so the service worker caches the
  // timings too: they may have loaded before it took control.
  const recitation = await queryClient.fetchQuery({
    ...recitationQuery(reciterId, chapterId),
    staleTime: 0,
  });
  return run(
    jobId.audio(reciterId, chapterId),
    recitation.sizeBytes,
    async (progress) => {
      const res = await fetch(recitation.url);
      if (!res.ok || !res.body)
        throw new Error(`${res.status} ${recitation.url}`);
      const reader = res.body.getReader();
      let received = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        progress(received);
      }
    },
  );
}

/**
 * Deletes everything downloaded for offline use, then reloads: data and
 * timings already loaded this session would otherwise be reused from memory
 * by a later download instead of being fetched (and cached) again.
 */
export async function clearDownloads() {
  await Promise.all(OFFLINE_CACHES.map((name) => caches.delete(name)));
  useDownloads.getState().reset();
  location.reload();
}

export async function storageUsage(): Promise<number | null> {
  const estimate = await navigator.storage?.estimate?.();
  return estimate?.usage ?? null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
