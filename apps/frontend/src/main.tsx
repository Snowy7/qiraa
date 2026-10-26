import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { queryClient } from "@/lib/query-client";
import { router } from "@/router";

// UI fonts, self-hosted. Figtree is one variable file; Almarai covers Arabic UI.
// unicode-range subsets mean only the glyphs a page uses are downloaded.
import "@fontsource-variable/figtree";
import "@fontsource/almarai/400.css";
import "@fontsource/almarai/700.css";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
