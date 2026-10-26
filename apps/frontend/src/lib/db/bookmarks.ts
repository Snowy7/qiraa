import { parseVerseKey } from "@qiraa/core";
import { db } from "./index";

/** Adds the verse to a collection, or removes it if it is already there. */
export async function toggleBookmark(
  collectionId: string,
  verseKey: string,
): Promise<void> {
  const existing = await db.bookmarks
    .where("verseKey")
    .equals(verseKey)
    .filter((b) => b.collectionId === collectionId)
    .first();
  if (existing) {
    await db.bookmarks.delete(existing.id);
    return;
  }

  const ref = parseVerseKey(verseKey);
  if (!ref) throw new Error(`Invalid verse key: ${verseKey}`);
  const last = await db.bookmarks
    .where("collectionId")
    .equals(collectionId)
    .sortBy("sortOrder");
  const now = Date.now();
  await db.bookmarks.add({
    id: crypto.randomUUID(),
    collectionId,
    verseKey,
    chapterId: ref.chapter,
    verseNumber: ref.verse,
    sortOrder: (last.at(-1)?.sortOrder ?? -1) + 1,
    createdAt: now,
    updatedAt: now,
  });
}

export function removeBookmark(id: string): Promise<void> {
  return db.bookmarks.delete(id);
}
