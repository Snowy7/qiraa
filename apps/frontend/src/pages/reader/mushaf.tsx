import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@template/ui";
import {
  QURAN_SCRIPTS,
  getChapter,
  chapterPageRange,
  juzOfVerse,
  pageOfVerse,
  parseVerseKey,
  type QuranScript,
} from "@qiraa/core";
import { stageStyle, useMushafLayout } from "@/components/quran/mushaf-layout";
import { MushafPage } from "@/components/quran/mushaf-page";
import { MushafScroll, pageSlotId } from "@/components/quran/mushaf-scroll";
import { ReaderLayout } from "@/components/reader/reader-layout";
import NotFoundPage from "@/pages/not-found";
import { saveReadingPosition } from "@/lib/db/reading-history";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useI18n } from "@/lib/i18n";
import { prefetchPages, useScriptIndex } from "@/lib/quran/data";
import { preloadPageFont } from "@/lib/quran/fonts";
import { useAudio } from "@/lib/stores/audio";
import { usePreferences } from "@/lib/stores/preferences";
import { useReaderUi } from "@/lib/stores/reader-ui";
import { cn } from "@/lib/utils";

export default function MushafReaderPage() {
  const page = Number(useParams().page);
  const script = QURAN_SCRIPTS[usePreferences((s) => s.script)];
  const view = usePreferences((s) => s.mushafView);
  if (!Number.isInteger(page) || page < 1 || page > script.pageCount)
    return <NotFoundPage />;
  return view === "scroll" ? (
    <ScrollReader page={page} script={script} />
  ) : (
    <PagesReader page={page} script={script} />
  );
}

/** Location state of the URL updates made while scrolling. */
const SCROLLED = "mushaf-scrolled";

/**
 * Every page of the script in one vertical scroll. The URL follows the page
 * being read (replaced, once scrolling settles), so reopening or sharing
 * lands on the same page.
 */
function ScrollReader({ page, script }: { page: number; script: QuranScript }) {
  const navigate = useNavigate();
  const location = useLocation();
  const index = useScriptIndex(script.id).data;
  const quranTextScale = usePreferences((s) => s.quranTextScale);
  const selectedVerse = useSelectedVerse();
  const [current, setCurrent] = useState(page);
  const frame = useMushafFrame(script, current);
  const stage = useRef<HTMLDivElement>(null);
  const layout = useMushafLayout(stage, script, "scroll", 1, quranTextScale);
  // The page slots exist once the layout is measured.
  const ready = layout !== null;

  // Links, surah picks and script switches go to their page; the URL
  // updates made by scrolling are already there.
  useLayoutEffect(() => {
    if (location.state === SCROLLED) return;
    setCurrent(page);
    document.getElementById(pageSlotId(page))?.scrollIntoView();
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced: browsers limit how often history can be replaced.
  useEffect(() => {
    if (current === page) return;
    const timer = setTimeout(
      () => navigate(`/mushaf/${current}`, { replace: true, state: SCROLLED }),
      400,
    );
    return () => clearTimeout(timer);
  }, [current, page, navigate]);

  // Keep the ayah being recited in view: centre it when it's near an edge.
  // A page that isn't rendered yet is jumped to first, and the ayah placed
  // once the page has drawn it.
  const recitingVerse = useRecitingVerse();
  useEffect(() => {
    if (!recitingVerse || !index) return;
    const slot = document.getElementById(
      pageSlotId(pageOfVerse(index, recitingVerse)),
    );
    if (!slot) return;
    if (!slot.querySelector(`[data-word="${recitingVerse}:1"]`))
      slot.scrollIntoView();
    return revealVerse(slot, recitingVerse);
  }, [recitingVerse, index, ready]);

  return (
    <ReaderLayout {...frame}>
      <div
        ref={stage}
        className="mushaf-stage reader-scope mx-auto max-w-[1500px] px-1 pb-28 pt-3 sm:px-4"
        style={stageStyle(script, layout)}
        data-flow={layout?.flow || undefined}
      >
        {layout && (
          <MushafScroll
            key={script.id}
            script={script}
            layout={layout}
            initialPage={current}
            onPageChange={setCurrent}
            selectedVerse={selectedVerse}
          />
        )}
      </div>
    </ReaderLayout>
  );
}

/**
 * Page by page, turned with swipes, arrows or keys. Wide landscape screens
 * show an open book (two facing pages) at the default text size.
 */
function PagesReader({ page, script }: { page: number; script: QuranScript }) {
  const { t, n } = useI18n();
  const navigate = useNavigate();
  const index = useScriptIndex(script.id).data;
  const quranTextScale = usePreferences((s) => s.quranTextScale);
  const selectedVerse = useSelectedVerse();
  const playerOpen = useAudio((s) => s.verseKey !== null);

  // Half a spread is already as wide as a page can be, so text larger than
  // the default shows single pages instead.
  const spread =
    useMediaQuery("(min-width: 1100px) and (orientation: landscape)") &&
    quranTextScale <= 1;
  const first = spread && page % 2 === 0 ? page - 1 : page;
  const pages = spread
    ? [first, first + 1].filter((p) => p <= script.pageCount)
    : [page];
  const step = pages.length;
  const frame = useMushafFrame(script, first);
  const stage = useRef<HTMLDivElement>(null);
  const layout = useMushafLayout(stage, script, "pages", step, quranTextScale);

  const goTo = useCallback(
    (target: number) => {
      if (target >= 1 && target <= script.pageCount)
        navigate(`/mushaf/${target}`, { replace: true });
    },
    [navigate, script.pageCount],
  );
  const nextPage = () => goTo(first + step);
  const previousPage = () => goTo(first - step);

  // Warm the neighbouring pages (data and fonts); each turn starts at the top.
  useEffect(() => {
    const neighbours = [first - step, first + step, first + step + 1].filter(
      (p) => p >= 1 && p <= script.pageCount,
    );
    prefetchPages(script.id, neighbours);
    for (const p of neighbours) preloadPageFont(script, p);
    window.scrollTo({ top: 0 });
  }, [first, step, script]);

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

  // Turn the page when the recitation moves past what is on screen, and
  // keep the ayah in view on a page taller than the screen.
  const recitingVerse = useRecitingVerse();
  useEffect(() => {
    if (!recitingVerse || !index) return;
    const target = pageOfVerse(index, recitingVerse);
    if (!pages.includes(target)) {
      goTo(target);
      return;
    }
    if (stage.current) return revealVerse(stage.current, recitingVerse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recitingVerse, index, first]);

  const swipe = useSwipe((direction) =>
    direction === "right" ? nextPage() : previousPage(),
  );

  return (
    <ReaderLayout {...frame}>
      <div
        ref={stage}
        className="mushaf-stage reader-scope relative mx-auto max-w-[1500px] px-1 pb-28 pt-3 sm:px-4 md:px-16 md:pb-6"
        style={stageStyle(script, layout)}
        data-flow={layout?.flow || undefined}
        {...swipe}
      >
        {/* Pages sit directly on the paper-coloured background; a spread gets a spine. */}
        <div
          dir="rtl"
          className="flex min-h-[calc(100dvh-10rem)] items-center justify-center gap-6"
        >
          {pages.map((p, i) => (
            <div
              key={p}
              className={cn(
                "min-w-0",
                i > 0 && "border-s border-border/70 ps-6",
              )}
            >
              <MushafPage
                script={script}
                page={p}
                selectedVerse={selectedVerse}
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

/**
 * The reader frame for the page being read (its surah, page and juz, and
 * where play starts). Also saves the page as the reading position once the
 * reader stays on it.
 */
function useMushafFrame(
  script: QuranScript,
  page: number,
): Omit<ComponentProps<typeof ReaderLayout>, "children"> {
  const { t } = useI18n();
  const navigate = useNavigate();
  const setPrefs = usePreferences((s) => s.set);
  const index = useScriptIndex(script.id).data;
  const firstVerse = index?.pageFirstVerse[page - 1];
  const ref = firstVerse ? parseVerseKey(firstVerse) : null;

  useEffect(() => {
    const position = firstVerse ? parseVerseKey(firstVerse) : null;
    if (!position) return;
    const timer = setTimeout(
      () =>
        saveReadingPosition(position.chapter, position.verse, "mushaf").catch(
          () => {},
        ),
      1000,
    );
    return () => clearTimeout(timer);
  }, [firstVerse]);

  return {
    chapter: getChapter(ref?.chapter ?? 1)!,
    subtitle: `${t("pageNumber", { n: page })} · ${t("juzNumber", { n: firstVerse ? juzOfVerse(firstVerse) : 1 })}`,
    mode: "mushaf",
    onModeChange: (mode) => {
      setPrefs({ readingMode: mode });
      if (mode === "verses" && ref)
        navigate(`/quran/${ref.chapter}?verse=${ref.verse}`);
    },
    hrefForChapter: (c) => `/mushaf/${chapterPageRange(script.id, c.id)[0]}`,
    playFrom: () => firstVerse ?? "1:1",
  };
}

/**
 * Brings an ayah's first word into view once `container` has drawn it
 * (a page draws its words when its data and font arrive). Returns a cleanup.
 */
function revealVerse(container: Element, verseKey: string) {
  const selector = `[data-word="${verseKey}:1"]`;
  const word = container.querySelector(selector);
  if (word) {
    revealWord(word);
    return;
  }
  let frame = 0;
  const observer = new MutationObserver(() => {
    const drawn = container.querySelector(selector);
    if (!drawn) return;
    observer.disconnect();
    // Drawing the page resizes it; let the scroll view settle its position
    // first (a frame later), or it would undo the reveal.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => revealWord(drawn));
    });
  });
  observer.observe(container, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
  };
}

/**
 * Centres a word being recited when it's low on the screen or hidden above
 * it (behind the reader's header). A word on screen glides there; one off
 * screen jumps, which is quicker and can't be cut short while pages around
 * it are still being drawn.
 */
function revealWord(word: Element) {
  const { top, bottom } = word.getBoundingClientRect();
  if (top >= 96 && bottom <= window.innerHeight * 0.7) return;
  const onScreen = bottom > 0 && top < window.innerHeight;
  word.scrollIntoView({
    block: "center",
    behavior: onScreen ? "smooth" : "auto",
  });
}

/**
 * The ayah to emphasise: the one whose actions are open. (A tapped word is
 * highlighted on its own by the word popover.)
 */
function useSelectedVerse() {
  return useReaderUi((s) => (s.sheet === "actions" ? s.verseKey : null));
}

/** The ayah being recited while "follow the recitation" is on, else null. */
function useRecitingVerse() {
  const verseKey = useAudio((s) =>
    s.status === "playing" ? s.verseKey : null,
  );
  const follow = usePreferences((s) => s.followRecitation);
  return follow ? verseKey : null;
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
