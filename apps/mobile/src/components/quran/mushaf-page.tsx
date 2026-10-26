import { memo } from "react";
import { Text, View } from "react-native";
import {
  isCenteredLine,
  LINES_PER_PAGE,
  pageSlots,
  type Line,
  type QuranScript,
  type WordText as StoredWord,
} from "@qiraa/core";
import { useI18n } from "@/lib/i18n";
import { getMushafPage, getScriptIndex } from "@/lib/quran/data";
import { useScriptFonts } from "@/lib/quran/fonts";
import type { MushafMetrics } from "@/lib/quran/mushaf-layout";
import { useAudio } from "@/lib/audio/player";
import { openVerse, openWord, useReaderUi } from "@/lib/reader-ui";
import { useThemeColors } from "@/lib/theme";
import { Bismillah } from "./bismillah";
import { SurahName } from "./surah-name";
import { WordText } from "./word-text";

interface MushafPageProps {
  script: QuranScript;
  page: number;
  metrics: MushafMetrics;
}

/**
 * One printed mushaf page in its 15 line slots. Each line is justified to
 * the script's printed line width, so lines break exactly as in print.
 */
export const MushafPage = memo(function MushafPage({ script, page, metrics }: MushafPageProps) {
  const { n } = useI18n();
  const lines = getMushafPage(script.id, page);
  const nextPageFirstVerse = getScriptIndex(script.id).pageFirstVerse[page];
  const fontFamily = useScriptFonts(script, [page])(page);
  const { fontSize, padding, lineWidth, footer } = metrics;
  // The opening pages hold a few short lines in a centred block, set larger.
  const openingPage = script.centeredLines === "madani" && page <= 2;
  const slots = pageSlots(lines, nextPageFirstVerse);
  // Every page is exactly `metrics.height` tall, so readers can jump to any
  // page by offset. A surah opening on a line with no slot reserved for it
  // (four IndoPak pages) squeezes that page's lines to make room.
  const unreserved = slots.reduce(
    (rows, slot) =>
      rows + (slot.kind === "opening" && slot.span === 0 ? Number(slot.title) + Number(slot.bismillah) : 0),
    0,
  );
  const lineHeight = (metrics.lineHeight * LINES_PER_PAGE) / (LINES_PER_PAGE + unreserved);

  return (
    <View
      accessibilityLabel={`${page}`}
      style={{ height: metrics.height, paddingVertical: padding, alignItems: "center" }}
    >
      <View
        style={{
          width: lineWidth,
          height: metrics.lineHeight * LINES_PER_PAGE,
          justifyContent: openingPage ? "center" : "flex-start",
        }}
      >
        {!fontFamily
          ? Array.from({ length: LINES_PER_PAGE }, (_, i) => (
              <View key={i} style={{ height: lineHeight, justifyContent: "center" }}>
                <View className="rounded-full bg-foreground/5" style={{ height: fontSize * 0.9 }} />
              </View>
            ))
          : slots.map((slot, i) => {
              if (slot.kind === "gap") {
                return openingPage ? null : <View key={i} style={{ height: slot.span * lineHeight }} />;
              }
              if (slot.kind === "opening") {
                const rows = Number(slot.title) + Number(slot.bismillah);
                const height = (openingPage || slot.span === 0 ? rows : slot.span) * lineHeight;
                return (
                  <SurahOpening
                    key={i}
                    chapter={slot.chapter}
                    title={slot.title}
                    bismillah={slot.bismillah}
                    height={height}
                    fontSize={fontSize}
                  />
                );
              }
              return (
                <MushafLine
                  key={i}
                  line={slot.line}
                  centered={isCenteredLine(script, page, slot.line[0])}
                  fontFamily={fontFamily}
                  fontSize={openingPage ? fontSize * 1.3 : fontSize}
                  height={openingPage ? lineHeight * 1.3 : lineHeight}
                />
              );
            })}
      </View>
      <Text
        className="text-center text-muted-foreground"
        style={{ height: footer, lineHeight: footer, fontSize: Math.max(11, fontSize * 0.5) }}
      >
        {n(page)}
      </Text>
    </View>
  );
});

function SurahOpening({
  chapter,
  title,
  bismillah,
  height,
  fontSize,
}: {
  chapter: number;
  title: boolean;
  bismillah: boolean;
  height: number;
  fontSize: number;
}) {
  const colors = useThemeColors();
  return (
    <View style={{ height, justifyContent: "space-evenly" }}>
      {title && (
        <View className="flex-row items-center">
          <View className="h-px flex-1 bg-primary/30" />
          <View
            className="rounded-full border border-primary/25 bg-accent/10"
            style={{ paddingHorizontal: fontSize * 0.9 }}
          >
            <SurahName chapter={chapter} withPrefix size={fontSize * 1.1} className="text-quran-ink" />
          </View>
          <View className="h-px flex-1 bg-primary/30" />
        </View>
      )}
      {bismillah && (
        <View className="items-center">
          <Bismillah color={colors.quranInk} height={fontSize * 1.15} />
        </View>
      )}
    </View>
  );
}

const MushafLine = memo(function MushafLine({
  line,
  centered,
  fontFamily,
  fontSize,
  height,
}: {
  line: Line;
  centered: boolean;
  fontFamily: string;
  fontSize: number;
  height: number;
}) {
  return (
    <View
      style={{
        height,
        flexDirection: "row",
        direction: "rtl",
        alignItems: "center",
        justifyContent: centered ? "center" : "space-between",
        columnGap: centered ? fontSize * 0.2 : 0,
      }}
    >
      {line[1].flatMap(([verseKey, start, words, end]) => {
        const items = words.map((word, i) => (
          <MushafWord
            key={`${verseKey}:${start + i}`}
            verseKey={verseKey}
            position={start + i}
            word={word}
            fontFamily={fontFamily}
            fontSize={fontSize}
          />
        ));
        if (end !== undefined) {
          items.push(
            <VerseEnd
              key={`${verseKey}:end`}
              verseKey={verseKey}
              text={end}
              fontFamily={fontFamily}
              fontSize={fontSize}
            />,
          );
        }
        return items;
      })}
    </View>
  );
});

/** A word on the page; lights up while it or its ayah is selected. */
const MushafWord = memo(function MushafWord({
  verseKey,
  position,
  word,
  fontFamily,
  fontSize,
}: {
  verseKey: string;
  position: number;
  word: StoredWord;
  fontFamily: string;
  fontSize: number;
}) {
  const key = `${verseKey}:${position}`;
  const selected = useReaderUi((s) => s.selectedWord === key || s.selectedVerse === verseKey);
  // The ayah being recited is tinted; its current word stands out.
  const recitation = useAudio((s) =>
    s.word === key ? "word" : s.verseKey === verseKey && s.status !== "idle" ? "verse" : null,
  );
  return (
    <Text
      onPress={() => openWord(key)}
      onLongPress={() => openVerse(verseKey)}
      suppressHighlighting
      allowFontScaling={false}
      className={
        recitation === "word"
          ? "text-reciting-word"
          : selected || recitation === "verse"
            ? "text-primary"
            : "text-quran-ink"
      }
      style={{ fontFamily, fontSize }}
    >
      <WordText word={word} />
    </Text>
  );
});

const VerseEnd = memo(function VerseEnd({
  verseKey,
  text,
  fontFamily,
  fontSize,
}: {
  verseKey: string;
  text: string;
  fontFamily: string;
  fontSize: number;
}) {
  const active = useReaderUi((s) => s.selectedVerse === verseKey);
  const reciting = useAudio((s) => s.verseKey === verseKey && s.status !== "idle");
  return (
    <Text
      onPress={() => openVerse(verseKey)}
      suppressHighlighting
      allowFontScaling={false}
      className={active || reciting ? "text-primary" : "text-quran-ink"}
      style={{ fontFamily, fontSize }}
    >
      {text}
    </Text>
  );
});
