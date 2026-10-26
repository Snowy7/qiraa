import Dexie, { type Table } from "dexie";
import type {
  ApiCacheEntry,
  Bookmark,
  Collection,
  HifzProgress,
  ReadingHistoryEntry,
  SettingEntry,
} from "./types";

/**
 * Local-first user data: collections, bookmarks, memorisation and reading
 * history. `settings` and `apiCache` are legacy tables, read once to migrate
 * preferences (see lib/stores/preferences.ts).
 */
export class NoorDatabase extends Dexie {
  collections!: Table<Collection, string>;
  bookmarks!: Table<Bookmark, string>;
  hifzProgress!: Table<HifzProgress, string>;
  readingHistory!: Table<ReadingHistoryEntry, string>;
  settings!: Table<SettingEntry, string>;
  apiCache!: Table<ApiCacheEntry, string>;

  constructor() {
    super("NoorDB");
    this.version(1).stores({
      collections: "id, sortOrder",
      bookmarks:
        "id, collectionId, verseKey, chapterId, [collectionId+sortOrder]",
      hifzProgress:
        "id, verseKey, chapterId, confidence, nextReviewAt, [chapterId+verseNumber]",
      readingHistory: "id, chapterId, timestamp",
      settings: "key",
      apiCache: "key, expiresAt",
    });
  }
}

export const db = new NoorDatabase();

/** Seeds the two starter collections on first run. */
export async function initializeDatabase(): Promise<void> {
  if ((await db.collections.count()) > 0) return;
  const now = Date.now();
  await db.collections.bulkPut([
    {
      id: crypto.randomUUID(),
      name: "Favourites",
      color: "#d9488b",
      icon: "heart",
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: crypto.randomUUID(),
      name: "To review",
      color: "#3b82f6",
      icon: "bookmark",
      sortOrder: 1,
      createdAt: now,
      updatedAt: now,
    },
  ]);
}

export type * from "./types";
