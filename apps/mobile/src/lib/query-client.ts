import { QueryClient } from "@tanstack/react-query";
import { experimental_createQueryPersister } from "@tanstack/query-persist-client-core";
import Storage from "expo-sqlite/kv-store";

const DAY = 1000 * 60 * 60 * 24;
const PERSISTER_PREFIX = "qiraa-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always attempt the request; persisted answers cover the offline case.
      networkMode: "offlineFirst",
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60,
      retry: 1,
    },
    mutations: { networkMode: "offlineFirst" },
  },
});

/**
 * Keeps online content (translations, tafsir) on disk, one entry per query,
 * restored lazily when a query first runs. Anything read once stays readable
 * offline; entries expire after 30 days unless read again.
 */
export const diskPersister = experimental_createQueryPersister({
  storage: Storage,
  maxAge: 30 * DAY,
  prefix: PERSISTER_PREFIX,
}).persisterFn;

/** Forgets every cached answer, in memory and on disk. */
export function clearQueryCache() {
  queryClient.clear();
  for (const key of Storage.getAllKeysSync()) {
    if (key.startsWith(PERSISTER_PREFIX)) Storage.removeItemSync(key);
  }
}
