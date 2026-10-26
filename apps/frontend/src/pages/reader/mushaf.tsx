import { useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@template/ui";
import {
  QURAN_SCRIPTS,
  getChapter,
  juzOfVerse,
  parseVerseKey,
  type QuranScript,
} from "@noor/core";
import { MushafPage } from "@/components/quran/mushaf-page";
import { ReaderLayout } from "@/components/reader/reader-layout";
import NotFoundPage from "@/pages/not-found";
import { saveReadingPosition } from "@/lib/db/reading-history";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useI18n } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { pageQuery, useScriptIndex } from "@/lib/quran/data";
import { useAudio } from "@/lib/stores/audio";
import { usePreferences, type ReadingMode } from "@/lib/stores/preferences";
import { useReaderUi } from "@/lib/stores/reader-ui";
import { cn } from "@/lib/utils";

export default function MushafReaderPage() {
  const page = Number(useParams().page);
  const script = QURAN_SCRIPTS[usePreferences((s) => s.script)];
  if (!Number.isInteger(page) || page < 1 || page > script.pageCount)
    return <NotFoundPage />;
  return <MushafReader page={page} script={script} />;
}

function MushafReader({ page, script }: { page: number; script: QuranScript }) {
  const { t, n } = useI18n();
  const navigate = useNavigate();
  const index = useScriptIndex(script.id).data;
  const quranTextScale = usePreferences((s) => s.quranTextScale);
  const setPrefs = usePreferences((s) => s.set);
  const { open, verseKey: selectedVerse, sheet } = useReaderUi();
  const playerOpen = useAudio((s) => s.verseKey !== null);

  // Wide landscape screens show an open book: two facing pages.
  const spread = useMediaQuery(
    "(min-width: 1100px) and (orientation: landscape)",
  );
  const first = spread && page % 2 === 0 ? page - 1 : page;
  const pages = spread
    ? [first, first + 1].filter((p) => p <= script.pageCount)
    : [page];
  const step = pages.length;

  const firstVerse = index?.pageFirstVerse[first - 1];
  const ref = firstVerse ? parseVerseKey(firstVerse) : null;
  const chapter = getChapter(ref?.chapter ?? 1)!;

  const goTo = useCallback(
    (target: number) => {
      if (target >= 1 && target <= script.pageCount)
        navigate(`/mushaf/${target}`, { replace: true });
    },
    [navigate, script.pageCount],
  );
  const nextPage = () => goTo(first + step);
  const previousPage = () => goTo(first - step);

  // Remember the position and warm the neighbouring pages (data and fonts).
  useEffect(() => {
    if (ref)
      saveReadingPosition(ref.chapter, ref.verse, "mushaf").catch(() => {});
    for (const p of [first - step, first + step, first + step + 1]) {
      if (p >= 1 && p <= script.pageCount)
        queryClient.prefetchQuery(pageQuery(script.id, p));
    }
    window.scrollTo({ top: 0 });
  }, [first, step, script.id, script.pageCount, ref?.chapter, ref?.verse]); // eslint-disable-line react-hooks/exhaustive-deps

  // A mushaf opens right-to-left: the left arrow turns to the next page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      if (event.key === "ArrowLeft") goTo(first + step);
      if (event.key === "ArrowRight") goTo(first - step);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [first, step, goTo]);

  const swipe = useSwipe((direction) =>
    direction === "right" ? nextPage() : previousPage(),
  );

  const switchMode = (mode: ReadingMode) => {
    setPrefs({ readingMode: mode });
    if (mode === "verses" && ref)
      navigate(`/quran/${ref.chapter}?verse=${ref.verse}`);
  };

  return (
    <ReaderLayout
      chapter={chapter}
      subtitle={`${t("pageNumber", { n: first })} · ${t("juzNumber", { n: firstVerse ? juzOfVerse(firstVerse) : 1 })}`}
      mode="mushaf"
      onModeChange={switchMode}
      hrefForChapter={(c) => `/mushaf/${index?.chapterPages[c.id - 1][0] ?? 1}`}
    >
      <div
        className="mushaf-stage reader-scope relative mx-auto max-w-[1500px] px-1 pb-28 pt-3 sm:px-4 md:pb-6"
        style={
          {
            "--spread": step,
            "--spread-gap": "1.5rem",
            "--quran-scale": quranTextScale,
          } as React.CSSProperties
        }
        {...swipe}
      >
        <div dir="rtl" className="flex items-start justify-center gap-6">
          {pages.map((p) => (
            <div
              key={p}
              className="rounded-[22px] border border-border/60 bg-card shadow-[0_1px_2px_hsl(26_40%_20%/0.05)] dark:bg-card/60"
            >
              <MushafPage
                script={script}
                page={p}
                selectedVerse={sheet === "actions" ? selectedVerse : null}
                onSelectVerse={(key) => open("actions", key)}
              />
            </div>
          ))}
        </div>

        {/* Page turns: side arrows on larger screens, a bottom bar on phones. */}
        <Button
          variant="outline"
          size="icon"
          onClick={nextPage}
          disabled={first + step > script.pageCount}
          aria-label={t("nextPage")}
          className="absolute start-2 top-1/2 hidden -translate-y-1/2 shadow-float md:inline-flex rtl:start-auto rtl:end-2"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={previousPage}
          disabled={first <= 1}
          aria-label={t("previousPage")}
          className="absolute end-2 top-1/2 hidden -translate-y-1/2 shadow-float md:inline-flex rtl:end-auto rtl:start-2"
        >
          <ChevronRight />
        </Button>

        <div
          dir="ltr"
          className={cn(
            "fixed inset-x-3 z-30 mx-auto flex max-w-sm items-center justify-between rounded-full border border-border/70 bg-card/90 p-1.5 shadow-float backdrop-blur-xl md:hidden",
            // Sit above the mini player when a recitation is open.
            playerOpen
              ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.75rem)]"
              : "bottom-[max(0.75rem,env(safe-area-inset-bottom))]",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={nextPage}
            disabled={first + step > script.pageCount}
            aria-label={t("nextPage")}
          >
            <ChevronLeft />
          </Button>
          <span className="text-sm font-semibold tabular-nums">
            {n(first)}{" "}
            <span className="text-muted-foreground">
              / {n(script.pageCount)}
            </span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={previousPage}
            disabled={first <= 1}
            aria-label={t("previousPage")}
          >
            <ChevronRight />
          </Button>
        </div>
      </div>
    </ReaderLayout>
  );
}

/** Horizontal swipe detection for page turns (ignores mostly-vertical drags). */
function useSwipe(onSwipe: (direction: "left" | "right") => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      const touch = e.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY };
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (!start.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5)
        onSwipe(dx > 0 ? "right" : "left");
    },
  };
}
