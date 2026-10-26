import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Always attempt the request: the service worker may answer from cache offline.
      networkMode: "offlineFirst",
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: { networkMode: "offlineFirst" },
  },
});
