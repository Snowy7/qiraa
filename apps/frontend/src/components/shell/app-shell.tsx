import { Suspense, useEffect } from "react";
import { Outlet, useLocation as useRoute } from "react-router-dom";
import { Toaster } from "sonner";
import { AudioPlayer } from "@/components/audio/audio-player";
import { NoorMark } from "@/components/icons";
import { InstallPrompt, ReloadPrompt } from "@/components/pwa";
import { initializeDatabase } from "@/lib/db";
import { useAudio } from "@/lib/stores/audio";
import { refreshLocationIfGranted } from "@/lib/stores/location";
import {
  migrateLegacyPreferences,
  usePreferences,
} from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";
import { Sidebar, TabBar } from "./nav";

/** Routes that take over the screen on phones (no tab bar) and use the rail on desktop. */
const IMMERSIVE = [/^\/quran\/\d+/, /^\/mushaf\//, /^\/memorize\/review/];

/** Keeps <html> in sync with the theme and language preferences. */
function useDocumentPreferences() {
  const theme = usePreferences((s) => s.theme);
  const language = usePreferences((s) => s.language);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document
        .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
        .forEach((meta) => (meta.content = dark ? "#0d0c0b" : "#faf6ef"));
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
}

export function AppShell() {
  const { pathname } = useRoute();
  const immersive = IMMERSIVE.some((pattern) => pattern.test(pathname));
  const playerOpen = useAudio((s) => s.verseKey !== null);
  useDocumentPreferences();

  useEffect(() => {
    migrateLegacyPreferences().catch(console.error);
    initializeDatabase().catch(console.error);
    refreshLocationIfGranted();
  }, []);

  return (
    <div className="flex min-h-dvh">
      <Sidebar pathname={pathname} compact={immersive} />
      <main
        className={cn(
          "min-w-0 flex-1",
          // Room for the floating tab bar and mini player so nothing hides behind them.
          !immersive && "pb-28 md:pb-12",
          playerOpen && (immersive ? "pb-28" : "pb-48 md:pb-32"),
        )}
      >
        <Suspense
          fallback={
            <div className="delayed-fade flex h-[70dvh] items-center justify-center">
              <NoorMark className="size-10 animate-pulse text-primary/40" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      {!immersive && <TabBar pathname={pathname} />}
      <AudioPlayer aboveTabBar={!immersive} />
      <InstallPrompt />
      <ReloadPrompt />
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            "!rounded-2xl !border-border !bg-popover !text-popover-foreground !shadow-float",
        }}
      />
    </div>
  );
}
