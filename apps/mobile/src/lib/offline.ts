import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { CHAPTERS } from "@qiraa/core";
import { chapterTranslationQuery } from "@/lib/api";
import {
  deleteRecitations,
  downloadRecitation,
  localRecitation,
  recitationsSize,
} from "@/lib/audio/recitations";
import { clearQueryCache, queryClient } from "@/lib/query-client";
import { deletePageFonts, downloadAllPageFonts, pageFontsSize, QCF_PAGES } from "@/lib/quran/fonts";

export interface DownloadJob {
  status: "running" | "done" | "failed";
  done: number;
  total: number;
}

interface Downloads {
  /** Progress of downloads started this session, keyed by job id. */
  jobs: Record<string, DownloadJob>;
  /** Bumped when downloads finish or are deleted, so views re-read the disk. */
  revision: number;
}

export const useDownloads = create<Downloads>(() => ({ jobs: {}, revision: 0 }));

export const jobId = {
  pageFonts: (version: "v1" | "v2") => `fonts:${version}`,
  translation: (id: number) => `translation:${id}`,
  recitation: (reciterId: number, chapter: number) => `recitation:${reciterId}:${chapter}`,
};

function update(id: string, job: DownloadJob) {
  useDownloads.setState((s) => ({
    jobs: { ...s.jobs, [id]: job },
    revision: job.status === "running" ? s.revision : s.revision + 1,
  }));
}

async function run(id: string, total: number, work: (progress: (done: number) => void) => Promise<void>) {
  if (useDownloads.getState().jobs[id]?.status === "running") return;
  update(id, { status: "running", done: 0, total });
  try {
    await work((done) => update(id, { status: "running", done, total }));
    update(id, { status: "done", done: total, total });
  } catch {
    const done = useDownloads.getState().jobs[id]?.done ?? 0;
    update(id, { status: "failed", done, total });
  }
}

/** Downloads every Madani page font of a QCF version for offline reading. */
export function downloadPageFonts(version: "v1" | "v2") {
  return run(jobId.pageFonts(version), QCF_PAGES, (progress) => downloadAllPageFonts(version, progress));
}

/** Fetches a translation for all 114 surahs; the query persister keeps it on disk. */
export function downloadTranslation(translationId: number) {
  return run(jobId.translation(translationId), CHAPTERS.length, async (progress) => {
    let done = 0;
    for (const chapter of CHAPTERS) {
      await queryClient.fetchQuery(chapterTranslationQuery(translationId, chapter.id));
      progress(++done);
    }
  });
}

/** Downloads one surah's recitation (audio and timings) for offline listening. */
export function downloadSurahAudio(reciterId: number, chapter: number) {
  return run(jobId.recitation(reciterId, chapter), 1, () => downloadRecitation(reciterId, chapter));
}

/** Bytes used by downloaded recitations and page fonts. */
export function offlineStorageSize(): number {
  return recitationsSize() + pageFontsSize();
}

/** Deletes a reciter's downloaded surahs. */
export function deleteReciterDownloads(reciterId: number) {
  deleteRecitations(reciterId);
  useDownloads.setState((s) => ({
    jobs: Object.fromEntries(
      Object.entries(s.jobs).filter(([id]) => !id.startsWith(`recitation:${reciterId}:`)),
    ),
    revision: s.revision + 1,
  }));
}

/** Removes downloaded fonts, translations and recitations; user data stays. */
export function clearDownloads() {
  deleteRecitations();
  deletePageFonts();
  clearQueryCache();
  useDownloads.setState((s) => ({ jobs: {}, revision: s.revision + 1 }));
}

export function formatBytes(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1) return `${Math.ceil(bytes / 1024)} KB`;
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

/** Whether a surah's recitation is on the device, kept current as downloads change. */
export function useRecitationDownloaded(reciterId: number, chapter: number): boolean {
  return useSyncExternalStore(useDownloads.subscribe, () => localRecitation(reciterId, chapter) !== null);
}
