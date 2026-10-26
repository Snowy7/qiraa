import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowRight, Brain, Search, Settings, Sparkles } from "lucide-react";
import { Button } from "@template/ui";
import {
  QURAN_SCRIPTS,
  getChapter,
  pageOfVerse,
  parseVerseKey,
  toVerseKey,
  type MessageKey,
} from "@qiraa/core";
import { MosqueSkyline, BrandMark } from "@/components/icons";
import { Page, SectionTitle } from "@/components/page";
import { PrayerHero } from "@/components/prayer/prayer-hero";
import { SurahName } from "@/components/quran/ornaments";
import { VerseText } from "@/components/quran/verse-text";
import { useChapterTranslation } from "@/lib/api/queries";
import { getHifzSummary } from "@/lib/db/hifz";
import { getLastRead } from "@/lib/db/reading-history";
import { useI18n } from "@/lib/i18n";
import { useScriptIndex, useVerse } from "@/lib/quran/data";
import { usePreferences } from "@/lib/stores/preferences";

const DAILY_VERSES = [
  "2:286",
  "94:5",
  "2:152",
  "3:139",
  "13:28",
  "65:3",
  "39:53",
  "2:186",
  "29:69",
  "20:114",
  "8:46",
  "16:128",
];

/** Frequently recited passages; the label defaults to the surah name. */
const QUICK_ACCESS: readonly { verseKey: string; label?: MessageKey }[] = [
  { verseKey: "2:255", label: "ayatAlKursi" },
  { verseKey: "18:1" },
  { verseKey: "36:1" },
  { verseKey: "55:1" },
  { verseKey: "56:1" },
  { verseKey: "67:1" },
];

function greetingKey(hour: number): MessageKey {
  if (hour >= 4 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 17) return "greetingAfternoon";
  if (hour >= 17 && hour < 22) return "greetingEvening";
  return "greetingNight";
}

export default function HomePage() {
  const { t } = useI18n();

  return (
    <Page width="wide" className="pb-6">
      <header className="flex items-center gap-3 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] md:pb-8 md:pt-10">
        <BrandMark className="size-9 text-primary md:hidden" />
        <div className="min-w-0 flex-1">
          <p className="hidden text-sm font-medium text-muted-foreground md:block">
            {t("appName")}
          </p>
          <h1 className="truncate text-2xl font-bold tracking-tight md:text-[2rem]">
            {t(greetingKey(new Date().getHours()))}
          </h1>
        </div>
        <Link
          to="/search"
          className="hidden h-11 w-72 items-center gap-2 rounded-full border border-border bg-card px-4 text-[15px] text-muted-foreground transition-colors hover:bg-secondary lg:flex"
        >
          <Search className="size-4" /> {t("searchPlaceholder")}
        </Link>
        <Button asChild variant="ghost" size="icon" className="lg:hidden">
          <Link to="/search" aria-label={t("search")}>
            <Search />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="icon" className="md:hidden">
          <Link to="/settings" aria-label={t("settings")}>
            <Settings />
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-12">
        <PrayerHero className="md:col-span-2 md:min-h-[300px] xl:col-span-7 xl:row-span-2" />
        <ContinueReading className="xl:col-span-5" />
        <MemorizeCard className="xl:col-span-5" />
        <VerseOfTheDay className="md:col-span-2 xl:col-span-7" />
        <QuickAccess className="md:col-span-2 xl:col-span-5" />
      </div>
    </Page>
  );
}

function ContinueReading({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const scriptId = usePreferences((s) => s.script);
  const index = useScriptIndex(scriptId).data;
  const last = useLiveQuery(getLastRead, []);
  const chapter = getChapter(last?.chapterId ?? 1)!;
  const verse = last?.verseNumber ?? 1;
  const href =
    last?.readingMode === "mushaf" && index
      ? `/mushaf/${pageOfVerse(index, toVerseKey(chapter.id, verse))}`
      : `/quran/${chapter.id}${last ? `?verse=${verse}` : ""}`;
  const progress = last ? verse / chapter.versesCount : 0;

  return (
    <Link
      to={href}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-float transition-transform active:scale-[0.99] ${className ?? ""}`}
    >
      <MosqueSkyline className="pointer-events-none absolute -bottom-2 end-0 h-24 w-64 opacity-15" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium opacity-80">
            {last ? t("continueReading") : t("startReading")}
          </p>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
          </p>
          <p className="mt-0.5 text-sm opacity-80">
            {last
              ? t("ayahOf", { verse, total: chapter.versesCount })
              : t("startWithFatiha")}
          </p>
        </div>
        <SurahName chapter={chapter.id} className="text-5xl opacity-90" />
      </div>
      <div className="relative mt-6 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-foreground/20">
          <div
            className="h-full rounded-full bg-primary-foreground/85"
            style={{ width: `${Math.max(progress, 0.02) * 100}%` }}
          />
        </div>
        <ArrowRight className="size-5 transition-transform group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1" />
      </div>
    </Link>
  );
}

function MemorizeCard({ className }: { className?: string }) {
  const { t, n } = useI18n();
  const summary = useLiveQuery(getHifzSummary, []);
  const due = summary?.due ?? 0;
  const memorized = summary?.memorized ?? 0;
  const fraction = summary ? memorized / summary.total : 0;

  return (
    <Link
      to={due > 0 ? "/memorize/review" : "/memorize"}
      className={`surface flex items-center gap-5 p-5 transition-colors hover:bg-secondary/40 ${className ?? ""}`}
    >
      <div className="relative size-16 shrink-0">
        <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3.5"
            className="stroke-secondary"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="stroke-primary"
            strokeOpacity={fraction > 0 ? 1 : 0}
            strokeDasharray={`${fraction * 97.4} 97.4`}
          />
        </svg>
        <Brain className="absolute inset-0 m-auto size-6 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-bold">{t("memorization")}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {due > 0
            ? t("dueCount", { n: due })
            : memorized > 0
              ? t("memorizedOf", { n: memorized, total: summary!.total })
              : t("startMemorizing")}
        </p>
      </div>
      {due > 0 && (
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold tabular-nums text-primary-foreground">
          {n(due)}
        </span>
      )}
    </Link>
  );
}

function VerseOfTheDay({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  const scriptId = usePreferences((s) => s.script);
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
      86_400_000,
  );
  const verseKey = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  const ref = parseVerseKey(verseKey)!;
  const verse = useVerse(scriptId, verseKey).data;
  const translation = useChapterTranslation(ref.chapter, true).data?.[
    ref.verse - 1
  ];
  const chapter = getChapter(ref.chapter)!;

  return (
    <section className={`surface reader-scope p-6 md:p-8 ${className ?? ""}`}>
      <SectionTitle>
        <span className="flex items-center gap-2">
          <Sparkles className="size-[18px] text-accent" /> {t("verseOfTheDay")}
        </span>
      </SectionTitle>
      <Link to={`/quran/${ref.chapter}?verse=${ref.verse}`} className="block">
        {verse ? (
          <VerseText
            verse={verse}
            script={QURAN_SCRIPTS[scriptId]}
            className="text-center"
          />
        ) : (
          <div className="mx-auto h-12 w-3/4 animate-pulse rounded-2xl bg-foreground/[0.05]" />
        )}
        {translation && (
          <p
            dir="auto"
            className="translation-text mx-auto mt-4 max-w-2xl text-center text-[15px] leading-relaxed text-foreground/70 md:text-base"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(translation),
            }}
          />
        )}
        <p className="mt-4 text-center text-sm font-semibold text-primary">
          {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} ·{" "}
          {verseKey}
        </p>
      </Link>
    </section>
  );
}

function QuickAccess({ className }: { className?: string }) {
  const { t, locale } = useI18n();
  return (
    <section className={`surface p-5 md:p-6 ${className ?? ""}`}>
      <SectionTitle
        action={
          <Link to="/quran" className="text-sm font-semibold text-primary">
            {t("seeAll")}
          </Link>
        }
      >
        {t("quickAccess")}
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
        {QUICK_ACCESS.map(({ label, verseKey }) => {
          const ref = parseVerseKey(verseKey)!;
          const chapter = getChapter(ref.chapter)!;
          return (
            <Link
              key={verseKey}
              to={`/quran/${chapter.id}${ref.verse > 1 ? `?verse=${ref.verse}` : ""}`}
              className="flex items-center justify-between gap-2 rounded-2xl bg-secondary/70 px-4 py-3 transition-colors hover:bg-secondary"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">
                  {label
                    ? t(label)
                    : locale === "ar"
                      ? chapter.nameArabic
                      : chapter.nameSimple}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {verseKey}
                </span>
              </span>
              <SurahName
                chapter={chapter.id}
                className="shrink-0 text-2xl text-primary"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
