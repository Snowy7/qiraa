import { queryOptions } from "@tanstack/react-query";
import { Directory, File, Paths } from "expo-file-system";
import { fetchChapterRecitation, type ChapterRecitation } from "@qiraa/core";
import { downloadFile } from "@/lib/download-file";
import { diskPersister, queryClient } from "@/lib/query-client";

/*
 * A recitation is one audio file per surah plus its ayah and word timings.
 * Timings persist with the query cache; a downloaded surah keeps its audio
 * and timings under documents/recitations/<reciter>/<chapter>.{mp3,json},
 * so it plays offline for as long as it stays downloaded.
 */

const DAY = 1000 * 60 * 60 * 24;

export const recitationQuery = (reciterId: number, chapter: number) =>
  queryOptions({
    queryKey: ["recitation", reciterId, chapter],
    queryFn: async ({ signal }): Promise<ChapterRecitation> => {
      const saved = timingsFile(reciterId, chapter);
      if (saved.exists) return JSON.parse(await saved.text());
      return fetchChapterRecitation(reciterId, chapter, signal);
    },
    staleTime: Infinity,
    gcTime: DAY,
    persister: diskPersister,
  });

const recitationsDirectory = new Directory(Paths.document, "recitations");

const reciterDirectory = (reciterId: number) => new Directory(recitationsDirectory, String(reciterId));

const audioFile = (reciterId: number, chapter: number) =>
  new File(reciterDirectory(reciterId), `${chapter}.mp3`);

const timingsFile = (reciterId: number, chapter: number) =>
  new File(reciterDirectory(reciterId), `${chapter}.json`);

/** The downloaded audio of a surah, if it's on the device. */
export function localRecitation(reciterId: number, chapter: number): string | null {
  const file = audioFile(reciterId, chapter);
  return file.exists ? file.uri : null;
}

/** Downloads a surah's audio and timings for offline listening. */
export async function downloadRecitation(reciterId: number, chapter: number): Promise<void> {
  const recitation = await queryClient.ensureQueryData(recitationQuery(reciterId, chapter));
  const audio = audioFile(reciterId, chapter);
  if (audio.exists) return;
  reciterDirectory(reciterId).create({ idempotent: true, intermediates: true });
  // Timings first: audio on disk always has its timings beside it.
  timingsFile(reciterId, chapter).write(JSON.stringify(recitation));
  await downloadFile(recitation.url, audio);
}

/** Chapters of a reciter that are downloaded. */
export function downloadedChapters(reciterId: number): number[] {
  const directory = reciterDirectory(reciterId);
  if (!directory.exists) return [];
  return directory
    .list()
    .filter((item) => item.name.endsWith(".mp3"))
    .map((item) => Number(item.name.replace(/\.mp3$/, "")))
    .sort((a, b) => a - b);
}

/** Bytes used by a reciter's downloads, or by every reciter's. */
export function recitationsSize(reciterId?: number): number {
  const directory = reciterId === undefined ? recitationsDirectory : reciterDirectory(reciterId);
  return directory.exists ? (directory.size ?? 0) : 0;
}

/** Deletes a reciter's downloads, or every reciter's. */
export function deleteRecitations(reciterId?: number) {
  const directory = reciterId === undefined ? recitationsDirectory : reciterDirectory(reciterId);
  if (directory.exists) directory.delete();
}
