import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Eye, Volume2 } from "lucide-react";
import { Button } from "@template/ui";
import { QURAN_SCRIPTS, getChapter, type ReviewRating } from "@noor/core";
import { BackButton, Page } from "@/components/page";
import { VerseText } from "@/components/quran/verse-text";
import { getDueReviews, recordReview } from "@/lib/db/hifz";
import type { HifzProgress } from "@/lib/db";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { useVerse } from "@/lib/quran/data";
import { useAudio } from "@/lib/stores/audio";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";

const RATINGS: readonly {
  rating: ReviewRating;
  label: MessageKey;
  className: string;
}[] = [
  {
    rating: "forgot",
    label: "forgot",
    className: "border-destructive/30 text-destructive hover:bg-destructive/10",
  },
  {
    rating: "shaky",
    label: "shaky",
    className:
      "border-amber-500/40 text-amber-600 hover:bg-amber-500/10 dark:text-amber-400",
  },
  {
    rating: "good",
    label: "good",
    className:
      "border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400",
  },
  {
    rating: "solid",
    label: "solid",
    className: "border-primary/40 text-primary hover:bg-primary/10",
  },
];

/** Flashcard review of due ayahs: recall, reveal, rate. */
export default function ReviewPage() {
  const { t, n, locale } = useI18n();
  const [queue, setQueue] = useState<HifzProgress[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewRating[]>([]);

  useEffect(() => {
    getDueReviews(20).then(setQueue);
  }, []);

  const current = queue?.[index];
  const finished = queue !== null && index >= queue.length;

  const rate = async (rating: ReviewRating) => {
    if (!current) return;
    await recordReview(current.verseKey, rating);
    setResults((r) => [...r, rating]);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  if (finished) {
    const good = results.filter((r) => r === "good" || r === "solid").length;
    return (
      <Page
        width="narrow"
        className="flex min-h-dvh flex-col items-center justify-center gap-6 py-10 text-center"
      >
        <CheckCircle2 className="size-16 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">
            {results.length ? t("sessionComplete") : t("allCaughtUp")}
          </h1>
          {results.length > 0 && (
            <p className="mt-1 text-muted-foreground">
              {t("reviewedCount", { n: results.length })}
            </p>
          )}
        </div>
        {results.length > 0 && (
          <div className="flex gap-8">
            <div>
              <p className="text-3xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                {n(good)}
              </p>
              <p className="text-sm text-muted-foreground">{t("good")}</p>
            </div>
            <div>
              <p className="text-3xl font-bold tabular-nums text-amber-600 dark:text-amber-400">
                {n(results.length - good)}
              </p>
              <p className="text-sm text-muted-foreground">{t("needsWork")}</p>
            </div>
          </div>
        )}
        <Button asChild size="lg">
          <Link to="/memorize">{t("backToMemorize")}</Link>
        </Button>
      </Page>
    );
  }

  const chapter = current ? getChapter(current.chapterId) : undefined;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 bg-background/85 pt-safe backdrop-blur-xl">
        <Page width="narrow" className="flex h-16 items-center gap-3">
          <BackButton to="/memorize" className="-ms-2" />
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{
                width: `${queue?.length ? (index / queue.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-muted-foreground">
            {n(Math.min(index + 1, queue?.length ?? 0))}/{n(queue?.length ?? 0)}
          </span>
        </Page>
      </header>

      {current && chapter && (
        <Page
          width="narrow"
          className="flex flex-1 flex-col items-center justify-center gap-6 py-8"
        >
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
            </p>
            <p className="text-2xl font-bold">
              {t("verseActions", { key: current.verseKey })}
            </p>
          </div>

          <div className="surface reader-scope w-full p-6 md:p-10">
            {revealed ? (
              <RevealedVerse verseKey={current.verseKey} />
            ) : (
              <button
                onClick={() => setRevealed(true)}
                className="flex w-full flex-col items-center gap-4 py-10 text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="flex size-16 items-center justify-center rounded-3xl bg-secondary">
                  <Eye className="size-7" />
                </span>
                <span className="font-medium">{t("tapToReveal")}</span>
              </button>
            )}
          </div>

          {revealed ? (
            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
              {RATINGS.map(({ rating, label, className }) => (
                <button
                  key={rating}
                  onClick={() => rate(rating)}
                  className={cn(
                    "rounded-2xl border bg-card py-4 font-semibold transition-colors active:scale-[0.98]",
                    className,
                  )}
                >
                  {t(label)}
                </button>
              ))}
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => useAudio.getState().play(current.verseKey)}
            >
              <Volume2 /> {t("playHint")}
            </Button>
          )}
        </Page>
      )}
    </div>
  );
}

function RevealedVerse({ verseKey }: { verseKey: string }) {
  const scriptId = usePreferences((s) => s.script);
  const verse = useVerse(scriptId, verseKey).data;
  return verse ? (
    <VerseText
      verse={verse}
      script={QURAN_SCRIPTS[scriptId]}
      className="text-center"
    />
  ) : (
    <div className="h-12 animate-pulse rounded-2xl bg-foreground/[0.05]" />
  );
}
