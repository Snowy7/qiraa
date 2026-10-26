import { Fragment, memo } from "react";
import {
  getChapter,
  isCenteredLine,
  parseVerseKey,
  type QuranScript,
} from "@noor/core";
import { usePage, useScriptIndex } from "@/lib/quran/data";
import { useScriptFonts } from "@/lib/quran/fonts";
import { useAudio } from "@/lib/stores/audio";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Bismillah, SurahFrame } from "./ornaments";
import { WordText } from "./verse-text";

interface MushafPageProps {
  script: QuranScript;
  page: number;
  selectedVerse?: string | null;
  onSelectVerse?: (verseKey: string) => void;
}

/**
 * One page of the printed mushaf. Each line is justified to the script's
 * line width (in em), so lines match the print exactly at any size; the
 * font-size itself comes from `.mushaf-page` in globals.css.
 */
export const MushafPage = memo(function MushafPage({
  script,
  page,
  selectedVerse,
  onSelectVerse,
}: MushafPageProps) {
  const { n } = useI18n();
  const { data: lines } = usePage(script.id, page);
  const index = useScriptIndex(script.id).data;
  const fontFor = useScriptFonts(script, [page]);
  const fontFamily = fontFor(page);
  const reciting = useAudio((s) => (s.status === "idle" ? null : s.verseKey));

  const ready = lines && index && fontFamily;
  const headersShown = new Set<number>();

  return (
    <article
      dir="rtl"
      lang="ar"
      aria-label={`Page ${page}`}
      className="mushaf-page quran-text mx-auto flex flex-col"
      style={
        {
          "--line-em": script.lineWidthEm,
          "--mushaf-lh": script.lineHeight * 0.88,
        } as React.CSSProperties
      }
    >
      <div className="flex flex-1 flex-col justify-center">
        {!ready
          ? Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="mushaf-line">
                <div className="my-[0.3em] h-[0.9em] w-full animate-pulse rounded-full bg-foreground/[0.05]" />
              </div>
            ))
          : lines.map(([lineNumber, segments]) => {
              const firstKey = segments[0]?.[0];
              const ref = firstKey ? parseVerseKey(firstKey) : null;
              // A surah header precedes the line where the surah's first verse begins.
              const startsChapter =
                ref?.verse === 1 &&
                index.chapterPages[ref.chapter - 1][0] === page &&
                !headersShown.has(ref.chapter);
              if (startsChapter) headersShown.add(ref.chapter);
              const chapter = ref ? getChapter(ref.chapter) : undefined;

              return (
                <Fragment key={lineNumber}>
                  {startsChapter && chapter && (
                    <div
                      className="py-[0.35em] font-sans"
                      style={{ fontSize: "0.8em" }}
                    >
                      <SurahFrame chapter={chapter.id} />
                      {chapter.bismillahPre && (
                        <Bismillah className="mx-auto mt-[0.6em] h-[1.5em] text-[hsl(var(--quran-ink))]" />
                      )}
                    </div>
                  )}
                  <div
                    className="mushaf-line"
                    data-centered={
                      isCenteredLine(script, page, lineNumber) || undefined
                    }
                    style={{ fontFamily }}
                  >
                    {segments.flatMap(([verseKey, start, words, end]) => {
                      const active =
                        verseKey === selectedVerse || verseKey === reciting;
                      const wordClass = cn(
                        "mushaf-word",
                        onSelectVerse && "cursor-pointer",
                        active && "is-active",
                      );
                      const select = onSelectVerse
                        ? () => onSelectVerse(verseKey)
                        : undefined;
                      const spans = words.map((word, i) => (
                        <span
                          key={`${verseKey}-${i}`}
                          className={wordClass}
                          data-word={`${verseKey}:${start + i}`}
                          onClick={select}
                        >
                          <WordText word={word} />
                        </span>
                      ));
                      if (end !== undefined) {
                        spans.push(
                          <span
                            key={`${verseKey}-end`}
                            className={cn(wordClass, "mushaf-end")}
                            onClick={select}
                          >
                            {end}
                          </span>,
                        );
                      }
                      return spans;
                    })}
                  </div>
                </Fragment>
              );
            })}
      </div>
      <footer className="mt-[0.6em] text-center font-sans text-[0.5em] font-semibold tabular-nums text-muted-foreground">
        {n(page)}
      </footer>
    </article>
  );
});
