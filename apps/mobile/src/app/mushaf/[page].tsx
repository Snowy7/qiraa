import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  I18nManager,
  Pressable,
  View,
  useWindowDimensions,
  type LayoutRectangle,
} from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { create } from "zustand";
import {
  QURAN_SCRIPTS,
  getChapter,
  juzOfVerse,
  pageOfVerse,
  parseVerseKey,
  type QuranScript,
  type ScriptIndex,
} from "@qiraa/core";
import { ReaderPlayer } from "@/components/audio/reader-player";
import { MushafPage } from "@/components/quran/mushaf-page";
import { Glass } from "@/components/ui/glass";
import { headerButtons } from "@/components/ui/header-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { getScriptIndex } from "@/lib/quran/data";
import { fitMushafFontSize, mushafMetrics, type MushafMetrics } from "@/lib/quran/mushaf-layout";
import { useFollowRecitation, useReaderKeepAwake, useSaveReadingPosition } from "@/lib/reader-hooks";
import { useThemeColors } from "@/lib/theme";

/**
 * The page in view (and every page at least partly on screen); the header and
 * page bar subscribe without re-rendering the list.
 */
const useVisiblePage = create<{ page: number; onScreen: readonly number[] }>(() => ({
  page: 1,
  onScreen: [],
}));

export default function MushafScreen() {
  const params = useLocalSearchParams<{ page: string }>();
  const scriptId = usePreferences((s) => s.script);
  return (
    <MushafReader
      script={QURAN_SCRIPTS[scriptId]}
      index={getScriptIndex(scriptId)}
      requestedPage={Number(params.page) || 1}
    />
  );
}

function MushafReader({
  script,
  index,
  requestedPage,
}: {
  script: QuranScript;
  index: ScriptIndex;
  requestedPage: number;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const layout = usePreferences((s) => s.mushafLayout);
  const scale = usePreferences((s) => s.quranTextScale);
  const [box, setBox] = useState<LayoutRectangle | null>(null);

  // Page numbers differ between scripts (IndoPak has 610 pages), so changing
  // the script or the layout re-opens at the ayah that was in view.
  const [opened, setOpened] = useState({
    script: script.id,
    layout,
    page: clampPage(requestedPage, script),
  });
  const anchorVerse = useRef(index.pageFirstVerse[opened.page - 1]);
  if (opened.script !== script.id || opened.layout !== layout) {
    setOpened({ script: script.id, layout, page: pageOfVerse(index, anchorVerse.current) });
  }

  useReaderKeepAwake();
  const savePosition = useSaveReadingPosition("mushaf");
  const onPageInView = useCallback(
    (page: number) => {
      useVisiblePage.setState({ page });
      const verse = index.pageFirstVerse[page - 1];
      anchorVerse.current = verse;
      const ref = parseVerseKey(verse);
      if (ref) savePosition(ref.chapter, ref.verse);
    },
    [index, savePosition],
  );

  const switchToVerses = () => {
    usePreferences.getState().set({ readingMode: "verses" });
    const ref = parseVerseKey(anchorVerse.current);
    if (ref) {
      router.replace({
        pathname: "/quran/[chapter]",
        params: { chapter: ref.chapter, verse: ref.verse },
      });
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => <MushafTitle index={index} />,
          ...headerButtons(
            [
              { icon: "list", label: t("verseByVerse"), onPress: switchToVerses },
              { icon: "textSize", label: t("readingSettings"), onPress: () => router.push("/reader-settings") },
            ],
            colors.foreground,
          ),
        }}
      />
      <View className="flex-1" onLayout={(event) => setBox(event.nativeEvent.layout)}>
        {box &&
          (layout === "scroll" ? (
            <ScrollingPages
              key={script.id}
              script={script}
              initialPage={opened.page}
              metrics={mushafMetrics(script, fitMushafFontSize(script, scale, box.width))}
              onPageInView={onPageInView}
            />
          ) : (
            <TurningPages
              key={script.id}
              script={script}
              initialPage={opened.page}
              box={box}
              scale={scale}
              onPageInView={onPageInView}
            />
          ))}
      </View>
      {/* Page turning keeps its page bar at the bottom; the player sits above it. */}
      <ReaderPlayer lift={layout === "pages" ? 64 : 0} />
    </>
  );
}

function clampPage(page: number, script: QuranScript) {
  return Math.min(Math.max(1, Math.round(page)), script.pageCount);
}

/** Surah name over "Page · Juz" for the page in view. */
function MushafTitle({ index }: { index: ScriptIndex }) {
  const { t, locale } = useI18n();
  const page = useVisiblePage((s) => s.page);
  const verse = index.pageFirstVerse[page - 1] ?? "1:1";
  const chapter = getChapter(parseVerseKey(verse)?.chapter ?? 1)!;
  return (
    <View className="items-center">
      <Text weight="semibold" className="text-[15px]">
        {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
      </Text>
      <Text className="text-xs text-muted-foreground">
        {t("pageNumber", { n: page })} · {t("juzNumber", { n: juzOfVerse(verse) })}
      </Text>
    </View>
  );
}

function usePages(script: QuranScript) {
  return useMemo(() => Array.from({ length: script.pageCount }, (_, i) => i + 1), [script]);
}

function useViewability(onPageInView: (page: number) => void) {
  return useCallback(
    ({ viewableItems }: { viewableItems: readonly { item: number; isViewable: boolean }[] }) => {
      const onScreen = viewableItems.filter((token) => token.isViewable).map((token) => token.item);
      useVisiblePage.setState({ onScreen });
      if (onScreen.length > 0) onPageInView(onScreen[0]);
    },
    [onPageInView],
  );
}

/** Brings the page holding the recited ayah into view (with "follow the recitation" on). */
function useFollowOnPages(script: QuranScript, show: (page: number) => void) {
  useFollowRecitation((verseKey) => {
    const page = pageOfVerse(getScriptIndex(script.id), verseKey);
    if (!useVisiblePage.getState().onScreen.includes(page)) show(page);
  });
}

/**
 * Continuous reading: pages stacked vertically, each exactly `metrics.height`
 * tall plus a divider, so any page is reached by offset without measuring.
 */
function ScrollingPages({
  script,
  initialPage,
  metrics,
  onPageInView,
}: {
  script: QuranScript;
  initialPage: number;
  metrics: MushafMetrics;
  onPageInView: (page: number) => void;
}) {
  const pages = usePages(script);
  const list = useRef<FlatList<number>>(null);
  const onViewableItemsChanged = useViewability(onPageInView);
  const insets = useSafeAreaInsets();
  // Content scrolls under the glass header. Offsets leave out the header's
  // padding, so scrolling to a page lines it up just below the header.
  const headerHeight = useHeaderHeight();
  const length = metrics.height + DIVIDER;
  useFollowOnPages(script, (page) => list.current?.scrollToIndex({ index: page - 1, animated: true }));
  return (
    <FlatList
      ref={list}
      data={pages}
      keyExtractor={String}
      initialScrollIndex={initialPage - 1}
      getItemLayout={(_, i) => ({ length, offset: length * i, index: i })}
      initialNumToRender={2}
      windowSize={5}
      maxToRenderPerBatch={2}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={{ itemVisiblePercentThreshold: 30 }}
      contentContainerStyle={{ paddingTop: headerHeight, paddingBottom: insets.bottom + 120 }}
      scrollIndicatorInsets={{ top: headerHeight }}
      renderItem={({ item: page }) => (
        <>
          <MushafPage script={script} page={page} metrics={metrics} />
          <View className="mx-10 bg-border/70" style={{ height: DIVIDER }} />
        </>
      )}
    />
  );
}

const DIVIDER = 1;

/**
 * One page at a time, turned by swiping. A mushaf opens right to left, so
 * the next page sits to the left in every UI language.
 */
function TurningPages({
  script,
  initialPage,
  box,
  scale,
  onPageInView,
}: {
  script: QuranScript;
  initialPage: number;
  box: LayoutRectangle;
  scale: number;
  onPageInView: (page: number) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const pages = usePages(script);
  const list = useRef<FlatList<number>>(null);
  const onViewableItemsChanged = useViewability(onPageInView);
  // Leave room for the header (content starts under it) and the page bar.
  const height = box.height - insets.top - 44 - insets.bottom - 64;
  const metrics = mushafMetrics(script, fitMushafFontSize(script, scale, width, height));

  useFollowOnPages(script, (page) => list.current?.scrollToIndex({ index: page - 1 }));

  const turn = (step: 1 | -1) => {
    const page = useVisiblePage.getState().page + step;
    if (page >= 1 && page <= script.pageCount) list.current?.scrollToIndex({ index: page - 1 });
  };

  return (
    <>
      <FlatList
        ref={list}
        data={pages}
        horizontal
        pagingEnabled
        inverted={!I18nManager.isRTL}
        keyExtractor={String}
        initialScrollIndex={initialPage - 1}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        initialNumToRender={1}
        windowSize={3}
        maxToRenderPerBatch={2}
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        renderItem={({ item: page }) => (
          <View
            style={{ width, paddingTop: insets.top + 44, paddingBottom: insets.bottom + 64 }}
            className="flex-1 justify-center"
          >
            <MushafPage script={script} page={page} metrics={metrics} />
          </View>
        )}
      />
      <PageBar pageCount={script.pageCount} onTurn={turn} bottom={insets.bottom + 12} />
    </>
  );
}

/** Floating page bar: next page on the left, as in the printed mushaf. */
function PageBar({
  pageCount,
  onTurn,
  bottom,
}: {
  pageCount: number;
  onTurn: (step: 1 | -1) => void;
  bottom: number;
}) {
  const { t, n } = useI18n();
  const colors = useThemeColors();
  const page = useVisiblePage((s) => s.page);
  return (
    <View className="absolute inset-x-0 items-center" style={{ bottom }} pointerEvents="box-none">
      <Glass interactive className="flex-row items-center gap-2 rounded-full p-1.5" style={{ direction: "ltr" }}>
        <Pressable
          onPress={() => onTurn(1)}
          disabled={page >= pageCount}
          accessibilityLabel={t("nextPage")}
          className="size-10 items-center justify-center rounded-full active:bg-foreground/10"
        >
          <Icon name="back" color={colors.foreground} size={18} />
        </Pressable>
        <Text weight="semibold" className="min-w-20 text-center text-sm">
          {n(page)} <Text className="text-sm text-muted-foreground">/ {n(pageCount)}</Text>
        </Text>
        <Pressable
          onPress={() => onTurn(-1)}
          disabled={page <= 1}
          accessibilityLabel={t("previousPage")}
          className="size-10 items-center justify-center rounded-full active:bg-foreground/10"
        >
          <Icon name="forward" color={colors.foreground} size={18} />
        </Pressable>
      </Glass>
    </View>
  );
}
