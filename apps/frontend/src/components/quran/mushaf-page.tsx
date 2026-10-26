import {
  Fragment,
  memo,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  getChapter,
  isCenteredLine,
  parseVerseKey,
  type QuranScript,
} from "@qiraa/core";
import { usePage } from "@/lib/quran/data";
import { useScriptFonts } from "@/lib/quran/fonts";
import { useAudio } from "@/lib/stores/audio";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Bismillah, SurahFrame } from "./ornaments";
import { WordText } from "./verse-text";

interface MushafPageProps {
  script: QuranScript;
  page: number;
  /** Ayah to emphasise (the one being looked at in a popover or sheet). */
  selectedVerse?: string | null;
}

/**
 * One page of the printed mushaf. Each line is justified to the script's
 * line width (in em), so lines match the print exactly at any size; a stage
 * whose text is too large for that (`data-flow`) lets the words flow
 * instead. Sizes come from the enclosing `.mushaf-stage` (globals.css).
 */
export const MushafPage = memo(function MushafPage({
  script,
  page,
  selectedVerse,
}: MushafPageProps) {
  const { n } = useI18n();
  const { data: lines } = usePage(script.id, page);
  const fontFor = useScriptFonts(script, [page]);
  const fontFamily = fontFor(page);
  const reciting = useAudio((s) => (s.status === "idle" ? null : s.verseKey));

  const ready = lines && fontFamily;
  // The opening pages have a few short, centred lines; let them fill the
  // page. They keep those lines at every text size (`data-printed`), since
  // filling the width is already as large as they can go.
  const linesRef = useRef<HTMLDivElement>(null);
  const openingPage = script.centeredLines === "madani" && page <= 2;
  const boost = useWordBoost(linesRef, openingPage && !!ready);
  const wordStyle = openingPage ? { fontSize: `${boost}em` } : undefined;

  return (
    <article
      dir="rtl"
      lang="ar"
      aria-label={`Page ${page}`}
      className="mushaf-page quran-text mx-auto flex flex-col"
      data-printed={openingPage || undefined}
    >
      <div
        ref={linesRef}
        className="mushaf-lines flex flex-1 flex-col justify-center"
      >
        {!ready
          ? Array.from({ length: 15 }, (_, i) => (
              <div key={i} className="mushaf-line">
                <div className="my-[0.3em] h-[0.9em] w-full animate-pulse rounded-full bg-foreground/[0.05]" />
              </div>
            ))
          : lines.map(([lineNumber, segments]) => {
              const [firstKey, firstWord] = segments[0] ?? [];
              const ref = firstKey ? parseVerseKey(firstKey) : null;
              // A surah header precedes the line holding its first word.
              const startsChapter = ref?.verse === 1 && firstWord === 1;
              const chapter = ref ? getChapter(ref.chapter) : undefined;

              return (
                <Fragment key={lineNumber}>
                  {startsChapter && chapter && (
                    <div className="mushaf-header font-sans">
                      <div style={{ fontSize: "0.8em" }}>
                        <SurahFrame chapter={chapter.id} />
                        {chapter.bismillahPre && (
                          <Bismillah className="mx-auto mt-[0.45em] h-[1.5em] text-[hsl(var(--quran-ink))]" />
                        )}
                      </div>
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
                        active && "is-active",
                      );
                      const wordSpans = words.map((word, i) => (
                        <span
                          key={`${verseKey}-${i}`}
                          className={wordClass}
                          style={wordStyle}
                          data-word={`${verseKey}:${start + i}`}
                        >
                          <WordText word={word} />
                        </span>
                      ));
                      // Spaces only matter when the words flow (flex
                      // lines drop them).
                      const spaced = (spans: ReactNode[]) =>
                        spans.flatMap((span) => [span, " "]);
                      if (end === undefined) return spaced(wordSpans);
                      const marker = (
                        <span
                          key={`${verseKey}-end`}
                          className={cn(wordClass, "mushaf-end")}
                          style={wordStyle}
                          data-verse-end={verseKey}
                        >
                          {end}
                        </span>
                      );
                      if (wordSpans.length === 0) return spaced([marker]);
                      // An ayah's end marker never wraps away from its last
                      // word: `.mushaf-keep` holds the two together in
                      // flowing text and drops out of printed lines.
                      return [
                        ...spaced(wordSpans.slice(0, -1)),
                        <span key={`${verseKey}-keep`} className="mushaf-keep">
                          {wordSpans.at(-1)} {marker}
                        </span>,
                        " ",
                      ];
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

/**
 * Scale factor that makes the widest line's words fill the line width (or
 * fit it, at text sizes where they'd overflow). Re-measured when the page
 * resizes; rounded so measuring can't oscillate.
 */
function useWordBoost(
  container: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [boost, setBoost] = useState(1);

  useLayoutEffect(() => {
    const element = container.current;
    if (!enabled || !element) return;
    const measure = () => {
      const lines = [...element.querySelectorAll<HTMLElement>(".mushaf-line")];
      if (lines.length === 0) return;
      const available = lines[0].clientWidth;
      const widest = Math.max(
        ...lines.map((line) =>
          [...line.children].reduce(
            (sum, child) => sum + child.getBoundingClientRect().width,
            0,
          ),
        ),
      );
      setBoost((current) => {
        const natural = widest / current;
        const next = Math.min(1.8, (available * 0.92) / natural);
        return Math.round(next * 100) / 100;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [container, enabled]);

  return boost;
}
