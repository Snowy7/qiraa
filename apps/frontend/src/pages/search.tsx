import { useDeferredValue, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DOMPurify from "dompurify";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import { Button } from "@template/ui";
import { getChapter, parseVerseKey, searchChapters } from "@noor/core";
import { Page, SectionTitle } from "@/components/page";
import { SurahName } from "@/components/quran/ornaments";
import { ChapterNumber } from "@/components/reader/surah-navigator";
import { useQuranSearch } from "@/lib/api/queries";
import { useOnline } from "@/lib/hooks/use-online";
import { useI18n } from "@/lib/i18n";

const RECENT_KEY = "noor-recent-searches";

/** Accepts Latin or Arabic-Indic digits and common separators: 2:255, ٢:٢٥٥, 2.255. */
function toVerseKey(query: string): string | null {
  const latin = query
    .trim()
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const match = /^(\d{1,3})\s*[:.\s]\s*(\d{1,3})$/.exec(latin);
  if (!match) return null;
  const key = `${Number(match[1])}:${Number(match[2])}`;
  return parseVerseKey(key) ? key : null;
}

export default function SearchPage() {
  const { t, locale } = useI18n();
  const online = useOnline();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const [recent, setRecent] = useState<string[]>(() =>
    JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"),
  );
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(deferred), 350);
    return () => clearTimeout(timer);
  }, [deferred]);

  const verseKey = toVerseKey(deferred);
  const verseRef = verseKey ? parseVerseKey(verseKey) : null;
  const chapters =
    deferred && !verseKey ? searchChapters(deferred).slice(0, 6) : [];
  const results = useQuranSearch(verseKey ? "" : debounced);

  const remember = () => {
    if (!deferred) return;
    const next = [deferred, ...recent.filter((r) => r !== deferred)].slice(
      0,
      8,
    );
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  return (
    <Page width="narrow" className="pb-10">
      <div className="sticky top-0 z-20 -mx-5 bg-background/85 px-5 pb-3 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl sm:-mx-6 sm:px-6 md:static md:mx-0 md:bg-transparent md:px-0 md:pt-10 md:backdrop-blur-none">
        <h1 className="mb-4 hidden text-[2rem] font-bold tracking-tight md:block">
          {t("search")}
        </h1>
        <label className="relative block">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-14 w-full rounded-full border border-input bg-card pe-12 ps-12 text-base outline-none transition-shadow focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={t("clear")}
              className="absolute end-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          )}
        </label>
      </div>

      {!deferred && (
        <div className="mt-4">
          {recent.length > 0 ? (
            <>
              <SectionTitle
                action={
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setRecent([]);
                      localStorage.removeItem(RECENT_KEY);
                    }}
                  >
                    {t("clear")}
                  </Button>
                }
              >
                {t("recent")}
              </SectionTitle>
              <div className="flex flex-wrap gap-2">
                {recent.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-medium hover:bg-secondary/70"
                  >
                    <Clock className="size-3.5 text-muted-foreground" /> {term}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mx-auto mt-16 max-w-sm text-center text-muted-foreground">
              {t("searchHint")}
            </p>
          )}
        </div>
      )}

      {verseKey && verseRef && (
        <Link
          to={`/quran/${verseRef.chapter}?verse=${verseRef.verse}`}
          onClick={remember}
          className="surface mt-4 flex items-center gap-4 p-5 transition-colors hover:bg-secondary/50"
        >
          <SurahName
            chapter={verseRef.chapter}
            className="text-4xl text-primary"
          />
          <span className="flex-1">
            <span className="block text-lg font-bold">
              {t("goToVerse", { key: verseKey })}
            </span>
            <span className="text-sm text-muted-foreground">
              {getChapter(verseRef.chapter)?.nameSimple}
            </span>
          </span>
          <ArrowRight className="size-5 text-muted-foreground rtl:rotate-180" />
        </Link>
      )}

      {chapters.length > 0 && (
        <section className="mt-6">
          <SectionTitle>{t("surahs")}</SectionTitle>
          <div className="grid gap-1 sm:grid-cols-2">
            {chapters.map((chapter) => (
              <Link
                key={chapter.id}
                to={`/quran/${chapter.id}`}
                onClick={remember}
                className="flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-secondary"
              >
                <ChapterNumber id={chapter.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {chapter.translatedName[locale]}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {debounced.length >= 2 && !verseKey && (
        <section className="mt-6">
          <SectionTitle>
            {t("verses")}
            {results.data && (
              <span className="ms-2 text-sm font-medium text-muted-foreground">
                {t("resultCount", { n: results.data.total })}
              </span>
            )}
          </SectionTitle>
          {!online && !results.data && (
            <p className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
              {t("searchOffline")}
            </p>
          )}
          {results.isPending && online && (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-3xl bg-foreground/[0.05]"
                />
              ))}
            </div>
          )}
          {results.data?.results.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              {t("noResults", { query: debounced })}
            </p>
          )}
          <div className="space-y-2">
            {results.data?.results.map((result) => {
              const ref = parseVerseKey(result.verseKey);
              if (!ref) return null;
              return (
                <Link
                  key={result.verseKey}
                  to={`/quran/${ref.chapter}?verse=${ref.verse}`}
                  onClick={remember}
                  className="surface block p-5 transition-colors hover:bg-secondary/40"
                >
                  <span className="text-xs font-bold text-primary">
                    {getChapter(ref.chapter)?.nameSimple} · {result.verseKey}
                  </span>
                  <p
                    dir="rtl"
                    lang="ar"
                    className="quran-text mt-2 line-clamp-2 font-[UthmanicHafs] text-xl leading-loose"
                  >
                    {result.text}
                  </p>
                  {result.translationHtml && (
                    <p
                      dir="auto"
                      className="mt-1 line-clamp-2 text-sm text-muted-foreground [&_em]:font-semibold [&_em]:not-italic [&_em]:text-foreground"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(result.translationHtml),
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </Page>
  );
}
