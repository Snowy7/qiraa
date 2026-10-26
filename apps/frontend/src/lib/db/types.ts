export interface Collection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface Bookmark {
  id: string;
  collectionId: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  note?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface HifzProgress {
  id: string;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  confidence: "new" | "learning" | "shaky" | "good" | "solid";
  lastReviewedAt?: number;
  nextReviewAt?: number;
  reviewCount: number;
  easeFactor: number;
  interval: number;
  streak: number;
  createdAt: number;
  updatedAt: number;
}

export interface ReadingHistoryEntry {
  id: string;
  chapterId: number;
  verseNumber: number;
  readingMode: "translation" | "mushaf" | "word-by-word" | "tafsir" | "verses";
  timestamp: number;
}

export interface SettingEntry {
  key: string;
  value: string | number | boolean;
}

export interface ApiCacheEntry {
  key: string;
  data: unknown;
  expiresAt: number;
}
