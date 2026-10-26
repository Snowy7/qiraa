import Storage from "expo-sqlite/kv-store";
import { createJSONStorage } from "zustand/middleware";

/**
 * SQLite-backed key-value storage with a synchronous API, so persisted
 * Zustand stores hydrate before the first render (no theme or data flash).
 */
export const persistStorage = createJSONStorage(() => ({
  getItem: (key: string) => Storage.getItemSync(key),
  setItem: (key: string, value: string) => Storage.setItemSync(key, value),
  removeItem: (key: string) => {
    Storage.removeItemSync(key);
  },
}));
