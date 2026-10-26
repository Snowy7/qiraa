import { startTransition, useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Button } from "@template/ui";
import {
  QURAN_SCRIPTS,
  getChapter,
  pageOfVerse,
  toVerseKey,
  type Chapter,
} from "@qiraa/core";
import { DownloadRecitation } from "@/components/audio/download-recitation";
import { MosqueSkyline } from "@/components/icons";
import { Bismillah, SurahName } from "@/components/quran/ornaments";
import { ReaderLayout } from "@/components/reader/reader-layout";
import { VerseItem } from "@/components/reader/verse-item";
import NotFoundPage from "@/pages/not-found";
import { useChapterTranslation } from "@/lib/api/queries";
import { db } from "@/lib/db";
import { saveReadingPosition } from "@/lib/db/reading-history";
import { useI18n } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import {
  scriptIndexQuery,
  useChapterVerses,
  useWordByWord,
} from "@/lib/quran/data";
import { useAudio } from "@/lib/stores/audio";
import { usePreferences, type ReadingMode } from "@/lib/stores/preferences";

export default function ChapterReaderPage() {
  const id = Number(useParams().chapter);
  const chapter = getChapter(id);
  return chapter ? (
    <ChapterReader key={chapter.id} chapter={chapter} />
  ) : (
    <NotFoundPage />
  );
}

function ChapterReader({ chapter }: { chapter: Chapter }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const targetVerse = Number(params.get("verse")) || null;

  const scriptId = usePreferences((s) => s.script);
  const showTranslation = usePreferences((s) => s.showTranslation);
  const showWordByWord = usePreferences((s) => s.showWordByWord);
  const quranTextScale = usePreferences((s) => s.quranTextScale);
  const translationTextScale = usePreferences((s) => s.translationTextScale);
  const setPrefs = usePreferences((s) => s.set);
  const script = QURAN_SCRIPTS[scriptId];

  const { data: verses, isError } = useChapterVerses(scriptId, chapter.id);
  const translation = useChapterTranslation(chapter.id, showTranslation);
  const glosses = useWordByWord(chapter.id, showWordByWord).data;
  const savedKeys = useLiveQuery(
    async () =>
      new Set(
        (
          await db.bookmarks.where("chapterId").equals(chapter.id).toArray()
        ).map((b) => b.verseKey),
      ),
    [chapter.id],
  );

  const rendered = useProgressiveCount(
    verses?.length ?? 0,
    (targetVerse ?? 0) + 6,
  );
  const visibleVerse = useVisibleVerse(chapter.id, !!verses, rendered);
  useFollowRecitation(chapter.id, !!verses);
  useScrollToVerse(targetVerse, !!verses);

  const switchMode = async (mode: ReadingMode) => {
    setPrefs({ readingMode: mode });
    if (mode === "verses") return;
    const index = await queryClient.ensureQueryData(scriptIndexQuery(scriptId));
    navigate(
      `/mushaf/${pageOfVerse(index, toVerseKey(chapter.id, visibleVerse.current ?? 1))}`,
    );
  };

  const previous = getChapter(chapter.id - 1);
  const next = getChapter(chapter.id + 1);
  const chapterName = (c: Chapter) =>
    locale === "ar" ? c.nameArabic : c.nameSimple;

  return (
    <ReaderLayout
      chapter={chapter}
      subtitle={`${chapter.translatedName[locale]} · ${t("ayahCount", { n: chapter.versesCount })}`}
      mode="verses"
      onModeChange={switchMode}
      hrefForChapter={(c) => `/quran/${c.id}`}
      playFrom={() => toVerseKey(chapter.id, visibleVerse.current ?? 1)}
    >
      <div
        className="reader-scope mx-auto max-w-3xl px-2 pb-24 pt-4 sm:px-6 md:pt-8"
        style={
          {
            "--quran-scale": quranTextScale,
            "--translation-scale": translationTextScale,
          } as React.CSSProperties
        }
      >
        <section className="hero-glow surface relative mb-4 overflow-hidden px-6 pb-14 pt-8 text-center">
          <MosqueSkyline className="absolute inset-x-0 bottom-0 h-16 w-full text-primary opacity-[0.08]" />
          <SurahName
            chapter={chapter.id}
            withPrefix
            className="text-[3.25rem] text-primary md:text-6xl"
          />
          <h1 className="mt-3 text-2xl font-bold tracking-tight">
            {chapterName(chapter)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {chapter.translatedName[locale]} · {t(chapter.revelationPlace)} ·{" "}
            {t("ayahCount", { n: chapter.versesCount })}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() =>
                useAudio
                  .getState()
                  .play(toVerseKey(chapter.id, 1), { fromStart: true })
              }
            >
              <Play className="fill-current" /> {t("playSurah")}
            </Button>
            <DownloadRecitation chapter={chapter.id} />
          </div>
          {chapter.bismillahPre && (
            <Bismillah className="relative mx-auto mt-7 h-9 text-[hsl(var(--quran-ink))]" />
          )}
        </section>

        {showTranslation && translation.isError && (
          <p className="mx-3 mb-2 rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
            {t("translationUnavailable")}
          </p>
        )}

        {isError && (
          <p className="py-16 text-center text-muted-foreground">
            {t("loadFailed")}
          </p>
        )}

        {!verses && !isError && (
          <div className="space-y-8 px-4 py-6" aria-busy>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-6 w-20 animate-pulse rounded-full bg-foreground/[0.06]" />
                <div className="ms-auto h-10 w-full animate-pulse rounded-2xl bg-foreground/[0.05]" />
                <div className="h-4 w-4/5 animate-pulse rounded-full bg-foreground/[0.05]" />
              </div>
            ))}
          </div>
        )}

        {verses?.slice(0, rendered).map((verse) => (
          <VerseItem
            key={verse.key}
            verse={verse}
            script={script}
            translation={
              showTranslation ? translation.data?.[verse.verse - 1] : undefined
            }
            glosses={showWordByWord ? glosses?.[verse.key] : undefined}
            saved={savedKeys?.has(verse.key) ?? false}
            highlighted={verse.verse === targetVerse}
          />
        ))}

        {verses && (
          <nav className="mt-10 grid grid-cols-2 gap-3 px-2">
            {previous ? (
              <Link
                to={`/quran/${previous.id}`}
                className="surface flex flex-col items-start gap-1 px-5 py-4 transition-colors hover:bg-secondary"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ChevronLeft className="size-3.5 rtl:rotate-180" />{" "}
                  {t("previousSurah")}
                </span>
                <span className="font-semibold">{chapterName(previous)}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                to={`/quran/${next.id}`}
                className="surface flex flex-col items-end gap-1 px-5 py-4 text-end transition-colors hover:bg-secondary"
              >
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {t("nextSurah")}{" "}
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                </span>
                <span className="font-semibold">{chapterName(next)}</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </ReaderLayout>
  );
}

/**
 * Tracks the top-most visible ayah and saves it as the reading position
 * (debounced). Returns a ref so callers can read it without re-rendering.
 * `rendered` re-observes once progressive rendering adds the rest of the surah.
 */
function useVisibleVerse(chapterId: number, ready: boolean, rendered: number) {
  const visible = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScreen = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const verse = Number((entry.target as HTMLElement).dataset.verse);
          if (entry.isIntersecting) onScreen.add(verse);
          else onScreen.delete(verse);
        }
        if (onScreen.size === 0) return;
        visible.current = Math.min(...onScreen);
        clearTimeout(timer);
        timer = setTimeout(
          () => saveReadingPosition(chapterId, visible.current!, "verses"),
          1500,
        );
      },
      { rootMargin: "-80px 0px -40% 0px" },
    );
    document
      .querySelectorAll("article[data-verse]")
      .forEach((el) => observer.observe(el));
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [chapterId, ready, rendered]);

  return visible;
}

/** Scrolls to `?verse=` once, correcting after deferred verses render. */
function useScrollToVerse(verse: number | null, ready: boolean) {
  useEffect(() => {
    if (!ready || !verse) return;
    const scroll = () =>
      document
        .getElementById(`ayah-${verse}`)
        ?.scrollIntoView({ block: "start" });
    scroll();
    // Verses above render lazily (content-visibility); settle on the real position.
    const timers = [150, 500].map((delay) => setTimeout(scroll, delay));
    return () => timers.forEach(clearTimeout);
  }, [verse, ready]);
}

/**
 * Keeps the ayah being recited in view, and follows the recitation into the
 * next surah, while "follow the recitation" is on.
 */
function useFollowRecitation(chapterId: number, ready: boolean) {
  const navigate = useNavigate();
  const verseKey = useAudio((s) =>
    s.status === "playing" ? s.verseKey : null,
  );
  const follow = usePreferences((s) => s.followRecitation);

  useEffect(() => {
    if (!follow || !ready || !verseKey) return;
    const [chapter, verse] = verseKey.split(":").map(Number);
    if (chapter !== chapterId) {
      navigate(`/quran/${chapter}?verse=${verse}`, { replace: true });
      return;
    }
    document
      .getElementById(`ayah-${verse}`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [verseKey, follow, ready, chapterId, navigate]);
}

/**
 * Renders the first ayahs immediately (enough to reach `?verse=`) and the
 * rest of the surah right after first paint, as an interruptible update.
 */
function useProgressiveCount(total: number, initial: number) {
  const [count, setCount] = useState(Math.max(12, initial));
  useEffect(() => {
    if (count >= total) return;
    const timer = setTimeout(() => startTransition(() => setCount(total)), 60);
    return () => clearTimeout(timer);
  }, [count, total]);
  return count;
}
