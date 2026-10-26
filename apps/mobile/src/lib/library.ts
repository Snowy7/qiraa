import { create } from "zustand";
import { persist } from "zustand/middleware";
import { currentLocale } from "@/lib/i18n";
import { persistStorage } from "@/lib/storage";

export interface Collection {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export interface Bookmark {
  collectionId: string;
  verseKey: string;
  createdAt: number;
}

/** A local id; collections never leave the device, so this needs no crypto. */
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const COLLECTION_COLORS = ["#b7791f", "#d9488b", "#3b82f6", "#16a34a", "#9333ea", "#e11d48"] as const;

function starterCollections(): Collection[] {
  const ar = currentLocale() === "ar";
  const now = Date.now();
  return [
    { id: newId(), name: ar ? "المفضلة" : "Favourites", color: "#d9488b", createdAt: now },
    { id: newId(), name: ar ? "للمراجعة" : "To review", color: "#3b82f6", createdAt: now },
  ];
}

interface LibraryStore {
  collections: Collection[];
  bookmarks: Bookmark[];
  createCollection: (name: string, color: string) => string;
  deleteCollection: (id: string) => void;
  /** Adds the verse to a collection, or removes it if it's already there. */
  toggleBookmark: (collectionId: string, verseKey: string) => void;
}

/** Saved ayahs in named collections, kept on the device. */
export const useLibrary = create<LibraryStore>()(
  persist(
    (set, get) => ({
      collections: starterCollections(),
      bookmarks: [],
      createCollection: (name, color) => {
        const id = newId();
        set({ collections: [...get().collections, { id, name, color, createdAt: Date.now() }] });
        return id;
      },
      deleteCollection: (id) =>
        set({
          collections: get().collections.filter((c) => c.id !== id),
          bookmarks: get().bookmarks.filter((b) => b.collectionId !== id),
        }),
      toggleBookmark: (collectionId, verseKey) => {
        const { bookmarks } = get();
        const saved = bookmarks.some((b) => b.collectionId === collectionId && b.verseKey === verseKey);
        set({
          bookmarks: saved
            ? bookmarks.filter((b) => !(b.collectionId === collectionId && b.verseKey === verseKey))
            : [...bookmarks, { collectionId, verseKey, createdAt: Date.now() }],
        });
      },
    }),
    {
      name: "qiraa-library",
      storage: persistStorage,
      partialize: ({ collections, bookmarks }) => ({ collections, bookmarks }),
    },
  ),
);

/** Whether a verse is saved in any collection (cheap per-verse selector). */
export function useIsSaved(verseKey: string): boolean {
  return useLibrary((s) => s.bookmarks.some((b) => b.verseKey === verseKey));
}
