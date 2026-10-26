import { lazy } from "react";
import { Navigate, createBrowserRouter, useParams } from "react-router-dom";
import { AppShell } from "@/components/shell/app-shell";
import { RouteError } from "@/components/error-boundary";

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
      { path: "/quran/:chapter", element: <ChapterReaderPage /> },
      { path: "/mushaf/:page", element: <MushafReaderPage /> },
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
