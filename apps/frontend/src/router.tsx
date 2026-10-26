import { lazy } from "react";
import {
  Navigate,
  createBrowserRouter,
  useParams,
  type LoaderFunctionArgs,
} from "react-router-dom";
import { QURAN_SCRIPTS, chapterPageRange, isChapterId } from "@qiraa/core";
import { AppShell } from "@/components/shell/app-shell";
import { RouteError } from "@/components/error-boundary";
import { chapterTranslationQuery } from "@/lib/api/queries";
import { queryClient } from "@/lib/query-client";
import { prefetchChapter, prefetchPages } from "@/lib/quran/data";
import { preloadPageFont } from "@/lib/quran/fonts";
import { usePreferences } from "@/lib/stores/preferences";

const HomePage = lazy(() => import("@/pages/home"));
const QuranIndexPage = lazy(() => import("@/pages/quran-index"));
const ChapterReaderPage = lazy(() => import("@/pages/reader/chapter"));
const MushafReaderPage = lazy(() => import("@/pages/reader/mushaf"));
const SavedPage = lazy(() => import("@/pages/saved"));
const CollectionPage = lazy(() => import("@/pages/collection"));
const MemorizePage = lazy(() => import("@/pages/memorize"));
const ReviewPage = lazy(() => import("@/pages/review"));
const PrayerPage = lazy(() => import("@/pages/prayer"));
const SearchPage = lazy(() => import("@/pages/search"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const NotFoundPage = lazy(() => import("@/pages/not-found"));

/*
 * Reader loaders don't block navigation: they start the Quran data, fonts and
 * translation downloading while the route's code is still loading.
 */
function chapterLoader({ params }: LoaderFunctionArgs) {
  const chapter = Number(params.chapter);
  if (!isChapterId(chapter)) return null;
  const { script, showTranslation, translationId } = usePreferences.getState();
  prefetchChapter(script, chapter);
  if (showTranslation) {
    void queryClient.prefetchQuery(
      chapterTranslationQuery(translationId, chapter),
    );
  }
  preloadPageFont(QURAN_SCRIPTS[script], chapterPageRange(script, chapter)[0]);
  return null;
}

function mushafLoader({ params }: LoaderFunctionArgs) {
  const page = Number(params.page);
  const script = QURAN_SCRIPTS[usePreferences.getState().script];
  if (!Number.isInteger(page) || page < 1 || page > script.pageCount)
    return null;
  const pages = [page, page % 2 ? page + 1 : page - 1].filter(
    (p) => p >= 1 && p <= script.pageCount,
  );
  prefetchPages(script.id, pages);
  for (const p of pages) preloadPageFont(script, p);
  return null;
}

/** Old `/quran/page/:n` links open the mushaf at that page. */
function LegacyPageRedirect() {
  const { page } = useParams();
  return <Navigate to={`/mushaf/${page}`} replace />;
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/quran", element: <QuranIndexPage /> },
      {
        path: "/quran/:chapter",
        loader: chapterLoader,
        element: <ChapterReaderPage />,
      },
      {
        path: "/mushaf/:page",
        loader: mushafLoader,
        element: <MushafReaderPage />,
      },
      { path: "/saved", element: <SavedPage /> },
      { path: "/saved/:id", element: <CollectionPage /> },
      { path: "/memorize", element: <MemorizePage /> },
      { path: "/memorize/review", element: <ReviewPage /> },
      { path: "/prayer", element: <PrayerPage /> },
      { path: "/search", element: <SearchPage /> },
      { path: "/settings", element: <SettingsPage /> },

      // Paths from the previous version of the app.
      { path: "/quran/page/:page", element: <LegacyPageRedirect /> },
      { path: "/collections/*", element: <Navigate to="/saved" replace /> },
      { path: "/hifz/*", element: <Navigate to="/memorize" replace /> },
      { path: "/prayer-times", element: <Navigate to="/prayer" replace /> },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
