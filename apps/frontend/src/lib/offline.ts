import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CHAPTERS,
  QURAN_SCRIPTS,
  chapterTranslationUrl,
  getChapter,
  getReciter,
  toVerseKey,
  verseAudioUrl,
  type QuranScriptId,
} from "@noor/core";
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
      name: "noor-downloads",
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
  audio: (reciterId: string, chapter: number) =>
    `audio:${reciterId}:${chapter}`,
};

async function run(
  id: string,
  total: number,
  work: (tick: () => void) => Promise<void>,
) {
  const { setJob } = useDownloads.getState();
  if (useDownloads.getState().jobs[id]?.status === "running") return;
  // Ask the browser not to evict what the user explicitly downloaded.
  navigator.storage?.persist?.().catch(() => {});
  let done = 0;
  setJob(id, { status: "running", done, total });
  try {
    await work(() => setJob(id, { status: "running", done: ++done, total }));
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
  return run(jobId.script(scriptId), total, async (tick) => {
    await prefetchScriptData(scriptId);
    tick();
    if (font.kind === "page") await prefetchPageFonts(font.version, tick);
    else {
      await fetchOk(`${FONT_ROOT}${font.file}`);
      tick();
    }
  });
}

/** One request per surah for the chosen translation. */
export function downloadTranslation(translationId: number) {
  return run(
    jobId.translation(translationId),
    CHAPTERS.length,
    async (tick) => {
      for (const chapter of CHAPTERS) {
        await fetchOk(chapterTranslationUrl(translationId, chapter.id));
        tick();
      }
    },
  );
}

/** Every ayah of a surah for a reciter. */
export function downloadChapterAudio(reciterId: string, chapterId: number) {
  const chapter = getChapter(chapterId);
  if (!chapter) return Promise.resolve();
  const reciter = getReciter(reciterId);
  return run(
    jobId.audio(reciterId, chapterId),
    chapter.versesCount,
    async (tick) => {
      for (let verse = 1; verse <= chapter.versesCount; verse++) {
        await fetchOk(verseAudioUrl(reciter, toVerseKey(chapterId, verse)));
        tick();
      }
    },
  );
}

export async function clearDownloads() {
  await Promise.all(OFFLINE_CACHES.map((name) => caches.delete(name)));
  useDownloads.getState().reset();
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
