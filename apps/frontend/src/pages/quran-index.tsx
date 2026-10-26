import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@template/ui";
import {
  JUZS,
  QURAN_SCRIPTS,
  getChapter,
  pageOfVerse,
  parseVerseKey,
  searchChapters,
  type Chapter,
} from "@qiraa/core";
import { Page, PageHeader, Segmented } from "@/components/page";
import { SurahName } from "@/components/quran/ornaments";
import { ChapterNumber } from "@/components/reader/surah-navigator";
import { useI18n } from "@/lib/i18n";
import { useScriptIndex } from "@/lib/quran/data";
import { usePreferences } from "@/lib/stores/preferences";

type Tab = "surah" | "juz" | "page";

/** Opens a verse in the user's preferred reading mode. */
function useVerseHref() {
  const scriptId = usePreferences((s) => s.script);
  const mode = usePreferences((s) => s.readingMode);
  const index = useScriptIndex(scriptId).data;
  return (verseKey: string) => {
    if (mode === "mushaf" && index)
      return `/mushaf/${pageOfVerse(index, verseKey)}`;
    const ref = parseVerseKey(verseKey)!;
    return `/quran/${ref.chapter}${ref.verse > 1 ? `?verse=${ref.verse}` : ""}`;
  };
}

export default function QuranIndexPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("surah");
  const [query, setQuery] = useState("");

  return (
    <>
      <PageHeader title={t("quran")} width="wide" />
      <Page width="wide">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          {tab === "surah" && (
            <label className="relative block flex-1 sm:max-w-md">
              <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchSurahs")}
                className="h-12 w-full rounded-full border border-input bg-card pe-4 ps-11 text-[15px] outline-none transition-shadow focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </label>
          )}
          <Segmented
            className="sm:ms-auto"
            value={tab}
            onChange={setTab}
            options={[
              { value: "surah", label: t("surah") },
              { value: "juz", label: t("juz") },
              { value: "page", label: t("page") },
            ]}
          />
        </div>

        {tab === "surah" && (
          <SurahGrid chapters={searchChapters(query)} query={query} />
        )}
        {tab === "juz" && <JuzGrid />}
        {tab === "page" && <PageGrid />}
      </Page>
    </>
  );
}

function SurahGrid({
  chapters,
  query,
}: {
  chapters: readonly Chapter[];
  query: string;
}) {
  const { t, locale } = useI18n();
  const href = useVerseHref();
  if (chapters.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground">
        {t("noSurahsMatch", { query })}
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3 xl:grid-cols-3">
      {chapters.map((chapter) => (
        <Link
          key={chapter.id}
          to={href(`${chapter.id}:1`)}
          className="flex items-center gap-3 rounded-3xl border border-transparent px-3 py-3 transition-colors hover:border-border hover:bg-card md:border-border/60 md:bg-card md:px-4 md:py-4 md:hover:bg-secondary/50"
        >
          <ChapterNumber id={chapter.id} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold">
              {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
            </span>
            <span className="block truncate text-[13px] text-muted-foreground">
              {chapter.translatedName[locale]} · {t(chapter.revelationPlace)} ·{" "}
              {t("ayahCount", { n: chapter.versesCount })}
            </span>
          </span>
          <SurahName
            chapter={chapter.id}
            className="shrink-0 text-[2rem] text-foreground/80"
          />
        </Link>
      ))}
    </div>
  );
}

function JuzGrid() {
  const { t, n, locale } = useI18n();
  const href = useVerseHref();
  const name = (key: string) => {
    const chapter = getChapter(parseVerseKey(key)!.chapter)!;
    return `${locale === "ar" ? chapter.nameArabic : chapter.nameSimple} ${key}`;
  };
  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-5">
      {JUZS.map((juz) => (
        <Link
          key={juz.juz}
          to={href(juz.firstVerse)}
          className="surface flex flex-col gap-1 p-4 transition-colors hover:bg-secondary/50"
        >
          <span className="text-2xl font-bold tabular-nums text-primary">
            {n(juz.juz)}
          </span>
          <span className="text-sm font-semibold">
            {t("juzNumber", { n: juz.juz })}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {name(juz.firstVerse)}
          </span>
        </Link>
      ))}
    </div>
  );
}

function PageGrid() {
  const { t, n } = useI18n();
  const navigate = useNavigate();
  const pageCount = QURAN_SCRIPTS[usePreferences((s) => s.script)].pageCount;
  const [value, setValue] = useState("");

  return (
    <div>
      <form
        className="mb-5 flex max-w-sm gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const page = Number(value);
          if (page >= 1 && page <= pageCount) navigate(`/mushaf/${page}`);
        }}
      >
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={pageCount}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`1 – ${pageCount}`}
          className="h-11 flex-1 rounded-full border border-input bg-card px-5 text-[15px] outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
        />
        <Button type="submit">{t("goToPage")}</Button>
      </form>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10 lg:grid-cols-[repeat(15,minmax(0,1fr))]">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((page) => (
          <Link
            key={page}
            to={`/mushaf/${page}`}
            className="flex h-10 items-center justify-center rounded-xl bg-secondary/60 text-[13px] font-semibold tabular-nums text-muted-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {n(page)}
          </Link>
        ))}
      </div>
    </div>
  );
}
