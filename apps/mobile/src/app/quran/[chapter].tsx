import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { FlashList, type FlashListRef, type ViewToken } from "@shopify/flash-list";
import { useHeaderHeight } from "expo-router/react-navigation";
import {
  QURAN_SCRIPTS,
  getChapter,
  pageOfVerse,
  parseVerseKey,
  toVerseKey,
  type AssembledVerse,
  type Chapter,
} from "@qiraa/core";
import { DownloadRecitation } from "@/components/audio/download-recitation";
import { ReaderPlayer } from "@/components/audio/reader-player";
import { MosqueSkyline } from "@/components/brand-mark";
import { Bismillah } from "@/components/quran/bismillah";
import { SurahName } from "@/components/quran/surah-name";
import { versePages } from "@/components/quran/verse-text";
import { VerseItem } from "@/components/reader/verse-item";
import { headerButtons } from "@/components/ui/header-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useChapterTranslation } from "@/lib/api";
import { useAudio } from "@/lib/audio/player";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { getChapterVerses, getScriptIndex, getWordByWord } from "@/lib/quran/data";
import { useScriptFonts } from "@/lib/quran/fonts";
import { useFollowRecitation, useReaderKeepAwake, useSaveReadingPosition } from "@/lib/reader-hooks";
import { useThemeColors } from "@/lib/theme";

/** Base sizes (points) that the user's text-size preferences multiply. */
const QURAN_BASE = 28;
const TRANSLATION_BASE = 17;

export default function ChapterReaderScreen() {
  const params = useLocalSearchParams<{ chapter: string; verse?: string }>();
  const chapter = getChapter(Number(params.chapter));
  if (!chapter) return <Stack.Screen options={{ title: "" }} />;
  const targetVerse = Number(params.verse) || null;
  // A new surah or ayah (a link, or a recitation moving on) opens afresh at it.
  return <ChapterReader key={`${chapter.id}:${targetVerse}`} chapter={chapter} targetVerse={targetVerse} />;
}

function ChapterReader({ chapter, targetVerse }: { chapter: Chapter; targetVerse: number | null }) {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const scriptId = usePreferences((s) => s.script);
  const showTranslation = usePreferences((s) => s.showTranslation);
  const showWordByWord = usePreferences((s) => s.showWordByWord);
  const quranScale = usePreferences((s) => s.quranTextScale);
  const translationScale = usePreferences((s) => s.translationTextScale);
  const script = QURAN_SCRIPTS[scriptId];

  const verses = useMemo(() => getChapterVerses(scriptId, chapter.id), [scriptId, chapter.id]);
  const translation = useChapterTranslation(chapter.id, showTranslation);
  const glosses = showWordByWord ? getWordByWord(chapter.id) : undefined;

  useReaderKeepAwake();
  const list = useRef<FlashListRef<AssembledVerse>>(null);
  const headerHeight = useHeaderHeight();
  // Keep the recited ayah in view; a recitation that moves on opens the next surah.
  useFollowRecitation((verseKey) => {
    const ref = parseVerseKey(verseKey);
    if (!ref) return;
    if (ref.chapter !== chapter.id) {
      router.setParams({ chapter: String(ref.chapter), verse: String(ref.verse) });
      return;
    }
    list.current?.scrollToIndex({ index: ref.verse - 1, animated: true, viewPosition: 0.25 });
  });
  // The initial scroll trusts estimated heights for unmeasured ayahs, and the
  // translation and page fonts arriving later grow the ayahs around the
  // target. Once they have (FlashList retries its initial scroll for 100 ms),
  // land on the ayah again: scrollToIndex measures as it goes.
  const [loaded, setLoaded] = useState(false);
  const targetIndex = targetVerse ? Math.min(targetVerse, verses.length) - 1 : null;
  const nearbyPages =
    targetIndex === null ? [] : verses.slice(Math.max(0, targetIndex - 2), targetIndex + 1).flatMap(versePages);
  const fontFor = useScriptFonts(script, [...new Set(nearbyPages)]);
  const ready =
    loaded &&
    (!showTranslation || translation.data !== undefined) &&
    nearbyPages.every((page) => fontFor(page) !== null);
  useEffect(() => {
    if (targetIndex === null || !ready) return;
    const timer = setTimeout(
      () => list.current?.scrollToIndex({ index: targetIndex, viewOffset: -headerHeight }),
      150,
    );
    return () => clearTimeout(timer);
  }, [targetIndex, ready, headerHeight]);
  const savePosition = useSaveReadingPosition("verses");
  const visibleVerse = useRef(targetVerse ?? 1);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<AssembledVerse>[] }) => {
      const first = viewableItems.find((token) => token.isViewable)?.item;
      if (!first) return;
      visibleVerse.current = first.verse;
      savePosition(chapter.id, first.verse);
    },
    [chapter.id, savePosition],
  );

  const switchToMushaf = () => {
    usePreferences.getState().set({ readingMode: "mushaf" });
    const page = pageOfVerse(getScriptIndex(scriptId), toVerseKey(chapter.id, visibleVerse.current));
    router.replace({ pathname: "/mushaf/[page]", params: { page } });
  };

  const name = (c: Chapter) => (locale === "ar" ? c.nameArabic : c.nameSimple);
  const previous = getChapter(chapter.id - 1);
  const next = getChapter(chapter.id + 1);

  return (
    <>
      <Stack.Screen
        options={{
          title: name(chapter),
          ...headerButtons(
            [
              { icon: "book", label: t("mushafMode"), onPress: switchToMushaf },
              { icon: "textSize", label: t("readingSettings"), onPress: () => router.push("/reader-settings") },
            ],
            colors.foreground,
          ),
        }}
      />
      <FlashList
        ref={list}
        data={verses}
        keyExtractor={(verse) => verse.key}
        initialScrollIndex={targetVerse ? Math.min(targetVerse, verses.length) - 1 : undefined}
        // The list scrolls under the glass header; open with the ayah just below it.
        initialScrollIndexParams={{ viewOffset: -headerHeight }}
        onLoad={() => setLoaded(true)}
        contentInsetAdjustmentBehavior="automatic"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 40 }}
        ListHeaderComponent={<SurahHero chapter={chapter} />}
        ListFooterComponent={
          <View className="mt-8 flex-row gap-3 px-4 pb-16">
            <SurahLink chapter={previous} label={t("previousSurah")} align="start" />
            <SurahLink chapter={next} label={t("nextSurah")} align="end" />
          </View>
        }
        renderItem={({ item: verse }) => (
          <VerseItem
            verse={verse}
            script={script}
            quranSize={QURAN_BASE * quranScale}
            translationSize={TRANSLATION_BASE * translationScale}
            translation={showTranslation ? translation.data?.[verse.verse - 1] : undefined}
            glosses={showWordByWord ? glosses?.[verse.key] : undefined}
            highlighted={verse.verse === targetVerse}
          />
        )}
      />
      <ReaderPlayer />
    </>
  );
}

/** Calligraphic surah title, its details and the Bismillah. */
function SurahHero({ chapter }: { chapter: Chapter }) {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  return (
    <View className="mx-4 mb-4 mt-2 items-center overflow-hidden rounded-3xl border border-border/70 bg-card px-6 pb-12 pt-6">
      <View className="absolute inset-x-0 bottom-0 items-center opacity-10">
        <MosqueSkyline color={colors.primary} width={420} />
      </View>
      <SurahName chapter={chapter.id} withPrefix size={50} className="text-primary" />
      <Text weight="bold" className="mt-2 text-2xl">
        {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
      </Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        {chapter.translatedName[locale]} · {t(chapter.revelationPlace)} ·{" "}
        {t("ayahCount", { n: chapter.versesCount })}
      </Text>
      <View className="mt-5 flex-row items-center gap-2">
        <Pressable
          onPress={() => useAudio.getState().play(toVerseKey(chapter.id, 1), { fromStart: true })}
          accessibilityRole="button"
          className="h-11 flex-row items-center gap-2 rounded-full bg-primary px-5 active:opacity-80"
        >
          <Icon name="play" color={colors.primaryForeground} size={16} />
          <Text weight="semibold" className="text-sm text-primary-foreground">
            {t("playSurah")}
          </Text>
        </Pressable>
        <DownloadRecitation chapter={chapter.id} />
      </View>
      {chapter.bismillahPre && (
        <View className="mt-6">
          <Bismillah color={colors.quranInk} height={34} />
        </View>
      )}
    </View>
  );
}

function SurahLink({
  chapter,
  label,
  align,
}: {
  chapter: Chapter | undefined;
  label: string;
  align: "start" | "end";
}) {
  const { locale } = useI18n();
  const colors = useThemeColors();
  if (!chapter) return <View className="flex-1" />;
  return (
    <Pressable
      onPress={() => router.replace({ pathname: "/quran/[chapter]", params: { chapter: chapter.id } })}
      className={`flex-1 gap-1 rounded-3xl border border-border/70 bg-card px-5 py-4 active:bg-secondary ${
        align === "end" ? "items-end" : "items-start"
      }`}
    >
      <View className="flex-row items-center gap-1">
        {align === "start" && <Icon name="back" color={colors.mutedForeground} size={12} />}
        <Text className="text-xs text-muted-foreground">{label}</Text>
        {align === "end" && <Icon name="forward" color={colors.mutedForeground} size={12} />}
      </View>
      <Text weight="semibold">{locale === "ar" ? chapter.nameArabic : chapter.nameSimple}</Text>
    </Pressable>
  );
}
