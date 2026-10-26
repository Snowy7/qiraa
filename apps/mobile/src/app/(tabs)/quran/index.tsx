import { useState } from "react";
import { Pressable, View } from "react-native";
import { router, Stack } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import {
  JUZS,
  QURAN_SCRIPTS,
  getChapter,
  parseVerseKey,
  searchChapters,
  type Chapter,
} from "@qiraa/core";
import { SurahName } from "@/components/quran/surah-name";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { openInReader } from "@/lib/navigation";
import { usePreferences } from "@/lib/preferences";

type Tab = "surah" | "juz" | "page";
const TABS: readonly Tab[] = ["surah", "juz", "page"];

export default function QuranIndexScreen() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("surah");
  const [query, setQuery] = useState("");

  const header = (
    <View className="px-5 pb-3 pt-1">
      <SegmentedControl
        values={TABS.map((value) => t(value))}
        selectedIndex={TABS.indexOf(tab)}
        onChange={({ nativeEvent }) => setTab(TABS[nativeEvent.selectedSegmentIndex])}
      />
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("quran"),
          headerSearchBarOptions:
            tab === "surah"
              ? {
                  placeholder: t("searchSurahs"),
                  onChangeText: (event) => setQuery(event.nativeEvent.text),
                  hideWhenScrolling: false,
                }
              : undefined,
        }}
      />
      {tab === "surah" && <SurahList header={header} query={query} />}
      {tab === "juz" && <JuzList header={header} />}
      {tab === "page" && <PageGrid header={header} />}
    </>
  );
}

function SurahList({ header, query }: { header: React.ReactElement; query: string }) {
  const { t, n, locale } = useI18n();
  const chapters = searchChapters(query);
  return (
    <FlashList
      data={chapters}
      keyExtractor={(chapter) => String(chapter.id)}
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 120 }}
      ListEmptyComponent={
        <Text className="py-16 text-center text-muted-foreground">
          {t("noSurahsMatch", { query })}
        </Text>
      }
      renderItem={({ item: chapter }: { item: Chapter }) => (
        <Pressable
          onPress={() => openInReader(`${chapter.id}:1`)}
          className="flex-row items-center gap-3 px-5 py-3 active:bg-secondary/60"
        >
          <View className="size-10 items-center justify-center rounded-xl bg-secondary">
            <Text weight="bold" className="text-sm text-primary">
              {n(chapter.id)}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Text weight="semibold" numberOfLines={1}>
              {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
            </Text>
            <Text numberOfLines={1} className="text-[13px] text-muted-foreground">
              {chapter.translatedName[locale]} · {t(chapter.revelationPlace)} ·{" "}
              {t("ayahCount", { n: chapter.versesCount })}
            </Text>
          </View>
          <SurahName chapter={chapter.id} size={30} className="text-foreground/80" />
        </Pressable>
      )}
    />
  );
}

function JuzList({ header }: { header: React.ReactElement }) {
  const { t, n, locale } = useI18n();
  return (
    <FlashList
      data={JUZS}
      numColumns={2}
      keyExtractor={(juz) => String(juz.juz)}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 120 }}
      renderItem={({ item: juz }) => {
        const chapter = getChapter(parseVerseKey(juz.firstVerse)!.chapter)!;
        return (
          <Pressable
            onPress={() => openInReader(juz.firstVerse)}
            className="m-1.5 gap-1 rounded-3xl border border-border/70 bg-card p-4 active:bg-secondary/60"
          >
            <Text weight="bold" className="text-2xl text-primary">
              {n(juz.juz)}
            </Text>
            <Text weight="semibold" className="text-sm">
              {t("juzNumber", { n: juz.juz })}
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} {juz.firstVerse}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

function PageGrid({ header }: { header: React.ReactElement }) {
  const { n } = useI18n();
  const pageCount = QURAN_SCRIPTS[usePreferences((s) => s.script)].pageCount;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <FlashList
      data={pages}
      numColumns={6}
      keyExtractor={String}
      contentInsetAdjustmentBehavior="automatic"
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      renderItem={({ item: page }) => (
        <Pressable
          onPress={() => router.push({ pathname: "/mushaf/[page]", params: { page } })}
          className="m-0.5 h-11 items-center justify-center rounded-xl bg-secondary/60 active:bg-primary"
        >
          <Text weight="semibold" className="text-[13px] text-muted-foreground">
            {n(page)}
          </Text>
        </Pressable>
      )}
    />
  );
}
