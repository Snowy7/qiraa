import { memo, type CSSProperties } from "react";
import type {
  AssembledVerse,
  QuranScript,
  WordText as StoredWord,
} from "@noor/core";
import { useScriptFonts } from "@/lib/quran/fonts";
import { cn } from "@/lib/utils";

/** One stored word: glyph or plain text, or tajweed runs coloured by rule. */
export function WordText({ word }: { word: StoredWord }) {
  if (typeof word === "string") return word;
  return word.map(([text, rule], i) =>
    rule ? (
      <span key={i} className={`tj-${rule}`}>
        {text}
      </span>
    ) : (
      text
    ),
  );
}

interface VerseTextProps {
  verse: AssembledVerse;
  script: QuranScript;
  /** `[gloss, transliteration]` per word; renders each word as a column when given. */
  glosses?: readonly (readonly [string, string])[];
  className?: string;
}

/**
 * Arabic text of one verse in the chosen script, sized by the reader's
 * `--quran-size`. QCF scripts render each word in its page's font, so a
 * verse that crosses a page boundary still uses the exact glyphs.
 */
export const VerseText = memo(function VerseText({
  verse,
  script,
  glosses,
  className,
}: VerseTextProps) {
  const pages = [
    ...new Set([
      ...verse.words.map((w) => w.page),
      verse.end?.page ?? verse.words[0].page,
    ]),
  ];
  const fontFor = useScriptFonts(script, pages);
  const ready = pages.every((page) => fontFor(page) !== null);

  const style = {
    fontSize: `calc(var(--quran-size) * ${script.sizeAdjust})`,
    lineHeight: script.lineHeight,
  } satisfies CSSProperties;

  if (!ready) {
    return (
      <div
        className={cn("flex flex-col items-end gap-3 py-2", className)}
        aria-busy
      >
        <div className="h-7 w-full animate-pulse rounded-xl bg-foreground/[0.05]" />
        <div className="h-7 w-2/3 animate-pulse rounded-xl bg-foreground/[0.05]" />
      </div>
    );
  }

  const fontOf = (page: number) => ({ fontFamily: fontFor(page)! });

  if (glosses) {
    return (
      <div
        dir="rtl"
        lang="ar"
        className={cn("quran-text flex flex-wrap gap-x-2 gap-y-4", className)}
        style={style}
      >
        {verse.words.map((word, i) => (
          <span key={i} className="flex flex-col items-center">
            <span style={fontOf(word.page)} data-word={`${verse.key}:${i + 1}`}>
              <WordText word={word.text} />
            </span>
            <span
              dir="ltr"
              className="mt-1 max-w-[9rem] text-center font-sans text-[13px] leading-snug text-muted-foreground"
            >
              {glosses[i]?.[0]}
            </span>
            <span
              dir="ltr"
              className="max-w-[9rem] text-center font-sans text-xs italic leading-snug text-muted-foreground/70"
            >
              {glosses[i]?.[1]}
            </span>
          </span>
        ))}
        {verse.end && (
          <span className="self-start" style={fontOf(verse.end.page)}>
            {verse.end.text}
          </span>
        )}
      </div>
    );
  }

  return (
    <p
      dir="rtl"
      lang="ar"
      className={cn("quran-text text-start", className)}
      style={style}
    >
      {verse.words.map((word, i) => (
        <span key={i} style={fontOf(word.page)}>
          <span data-word={`${verse.key}:${i + 1}`}>
            <WordText word={word.text} />
          </span>{" "}
        </span>
      ))}
      {verse.end && (
        <span style={fontOf(verse.end.page)}>{verse.end.text}</span>
      )}
    </p>
  );
});
