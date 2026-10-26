import { db } from "./index";
import type { ReadingHistoryEntry } from "./types";

/** Remembers where the reader is in a chapter (one entry per chapter). */
export async function saveReadingPosition(
  chapterId: number,
  verseNumber: number,
  readingMode: ReadingHistoryEntry["readingMode"],
): Promise<void> {
  const timestamp = Date.now();
  const existing = await db.readingHistory
    .where("chapterId")
    .equals(chapterId)
    .first();
  if (existing) {
    await db.readingHistory.update(existing.id, {
      verseNumber,
      readingMode,
      timestamp,
    });
  } else {
    await db.readingHistory.add({
      id: crypto.randomUUID(),
      chapterId,
      verseNumber,
      readingMode,
      timestamp,
    });
  }
}

export function getLastRead(): Promise<ReadingHistoryEntry | undefined> {
  return db.readingHistory.orderBy("timestamp").last();
}
