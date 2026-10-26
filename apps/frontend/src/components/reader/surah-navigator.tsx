import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { searchChapters, type Chapter } from "@noor/core";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Chapter number in a small diamond, like the og design's list markers. */
export function ChapterNumber({
  id,
  active = false,
}: {
  id: number;
  active?: boolean;
}) {
  const { n } = useI18n();
  return (
    <span className="relative flex size-10 shrink-0 items-center justify-center">
      <span
        aria-hidden
        className={cn(
          "absolute inset-1 rotate-45 rounded-[10px] border transition-colors",
          active
            ? "border-primary bg-primary"
            : "border-border bg-secondary/60",
        )}
      />
      <span
        className={cn(
          "relative text-[13px] font-bold tabular-nums",
          active ? "text-primary-foreground" : "text-foreground/80",
        )}
      >
        {n(id)}
      </span>
    </span>
  );
}

/** Searchable chapter list. Scrolls the current chapter into view. */
export function SurahNavigator({
  currentChapter,
  hrefFor,
  onNavigate,
  className,
}: {
  currentChapter?: number;
  hrefFor: (chapter: Chapter) => string;
  onNavigate?: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const chapters = searchChapters(query);

  // Centre the current chapter inside the list only (scrollIntoView would also scroll the page).
  useEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-current="page"]');
    if (list && current)
      list.scrollTop =
        current.offsetTop - list.clientHeight / 2 + current.clientHeight / 2;
  }, [currentChapter]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <label className="relative mx-3 mb-2 block">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchSurahs")}
          className="h-10 w-full rounded-full border border-input bg-card pe-4 ps-10 text-sm outline-none transition-shadow focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
        />
      </label>
      <div
        ref={listRef}
        className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-4"
      >
        {chapters.map((chapter) => {
          const active = chapter.id === currentChapter;
          return (
            <Link
              key={chapter.id}
              to={hrefFor(chapter)}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-secondary",
                active && "bg-secondary",
              )}
            >
              <ChapterNumber id={chapter.id} active={active} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">
                  {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {chapter.translatedName[locale]} ·{" "}
                  {t("ayahCount", { n: chapter.versesCount })}
                </span>
              </span>
            </Link>
          );
        })}
        {chapters.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t("noSurahsMatch", { query })}
          </p>
        )}
      </div>
    </div>
  );
}
