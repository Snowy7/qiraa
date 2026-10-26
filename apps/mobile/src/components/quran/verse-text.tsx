import { Fragment, memo } from "react";
import { Text, View } from "react-native";
import type { AssembledVerse, QuranScript, WordText as StoredWord } from "@qiraa/core";
import { cn } from "@/lib/cn";
import { useScriptFonts } from "@/lib/quran/fonts";
import { useIsRecitingWord } from "@/lib/audio/player";
import { openWord, useReaderUi } from "@/lib/reader-ui";
import { alignedTo } from "@/lib/text";
import { WordText } from "./word-text";

/**
 * One tappable word. Subscribes only to whether *it* is selected, so
 * selecting a word re-renders two words, not the verse.
 */
export const Word = memo(function Word({
  verseKey,
  position,
  text,
  fontFamily,
}: {
  verseKey: string;
  position: number;
  text: StoredWord;
  fontFamily: string;
}) {
  const key = `${verseKey}:${position}`;
  const selected = useReaderUi((s) => s.selectedWord === key);
  const reciting = useIsRecitingWord(key);
  return (
    <Text
      onPress={() => openWord(key)}
      suppressHighlighting
      className={cn(selected && "text-primary", reciting && "text-reciting-word")}
      style={{ fontFamily }}
    >
      <WordText word={text} />
    </Text>
  );
});

interface VerseTextProps {
  verse: AssembledVerse;
  script: QuranScript;
  /** Base Quran font size; the script's size adjustment is applied on top. */
  fontSize: number;
  /** `[gloss, transliteration]` per word; renders each word as a column when given. */
  glosses?: readonly (readonly [string, string])[];
  align?: "start" | "center";
}

/** Mushaf pages a verse's words (and end marker) sit on; QCF fonts are per page. */
export function versePages(verse: AssembledVerse): number[] {
  return [...new Set([...verse.words.map((w) => w.page), verse.end?.page ?? verse.words[0].page])];
}

/**
 * Arabic text of one verse in the chosen script. QCF scripts render each
 * word in its page's font, so a verse that crosses a page boundary still uses
 * the exact glyphs.
 */
export const VerseText = memo(function VerseText({
  verse,
  script,
  fontSize,
  glosses,
  align = "start",
}: VerseTextProps) {
  const pages = versePages(verse);
  const fontFor = useScriptFonts(script, pages);
  const size = fontSize * script.sizeAdjust;
  const lineHeight = size * script.lineHeight;

  if (!pages.every((page) => fontFor(page) !== null)) {
    return (
      <View className="items-end gap-3 py-2">
        <View className="h-7 w-full rounded-xl bg-foreground/5" />
        <View className="h-7 w-2/3 rounded-xl bg-foreground/5" />
      </View>
    );
  }
  const familyOf = (page: number) => fontFor(page) ?? undefined;

  if (glosses) {
    return (
      <View
        className={cn("flex-row flex-wrap gap-y-4", align === "center" && "justify-center")}
        style={{ direction: "rtl", columnGap: size * 0.3 }}
      >
        {verse.words.map((word, i) => (
          <View key={i} className="max-w-36 items-center">
            <Text className="text-quran-ink" style={{ fontSize: size, lineHeight }}>
              <Word
                verseKey={verse.key}
                position={i + 1}
                text={word.text}
                fontFamily={familyOf(word.page) ?? "UthmanicHafs"}
              />
            </Text>
            <Text className="text-center text-[13px] leading-snug text-muted-foreground">
              {glosses[i]?.[0]}
            </Text>
            <Text className="text-center text-xs italic leading-snug text-muted-foreground/70">
              {glosses[i]?.[1]}
            </Text>
          </View>
        ))}
        {verse.end && (
          <Text
            className="text-quran-ink"
            style={{ fontFamily: familyOf(verse.end.page), fontSize: size, lineHeight }}
          >
            {verse.end.text}
          </Text>
        )}
      </View>
    );
  }

  return (
    <Text
      className="text-quran-ink"
      style={{
        fontSize: size,
        lineHeight,
        ...alignedTo("rtl"),
        ...(align === "center" && { textAlign: "center" }),
      }}
    >
      {verse.words.map((word, i) => (
        <Fragment key={i}>
          <Word
            verseKey={verse.key}
            position={i + 1}
            text={word.text}
            fontFamily={familyOf(word.page) ?? "UthmanicHafs"}
          />{" "}
        </Fragment>
      ))}
      {verse.end && <Text style={{ fontFamily: familyOf(verse.end.page) }}>{verse.end.text}</Text>}
    </Text>
  );
});
