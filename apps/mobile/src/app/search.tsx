import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text as NativeText, View } from "react-native";
import { Stack } from "expo-router";
import Storage from "expo-sqlite/kv-store";
import { getChapter, parseVerseKey, searchChapters, verseKeyFromQuery } from "@qiraa/core";
import { SurahName } from "@/components/quran/surah-name";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useQuranSearch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { openInReader } from "@/lib/navigation";
import { alignedTo, htmlToText, textDirection } from "@/lib/text";
import { useThemeColors } from "@/lib/theme";

const RECENT_KEY = "qiraa-recent-searches";

function readRecent(): string[] {
  try {
    const value: unknown = JSON.parse(Storage.getItemSync(RECENT_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Surahs and verse references offline; full-text verse search online (quran.com). */
export default function SearchScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [recent, setRecent] = useState(readRecent);
  const trimmed = query.trim();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(trimmed), 350);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const verseKey = verseKeyFromQuery(trimmed);
  const chapters = trimmed && !verseKey ? searchChapters(trimmed).slice(0, 6) : [];
  const results = useQuranSearch(verseKey ? "" : debounced);

  const open = (key: string) => {
    if (trimmed) {
      const next = [trimmed, ...recent.filter((r) => r !== trimmed)].slice(0, 8);
      setRecent(next);
      Storage.setItemSync(RECENT_KEY, JSON.stringify(next));
    }
    openInReader(key);
  };
  const name = (chapter: number) => {
    const c = getChapter(chapter);
    return c ? (locale === "ar" ? c.nameArabic : c.nameSimple) : "";
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t("search"),
          headerSearchBarOptions: {
            placeholder: t("searchPlaceholder"),
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            hideWhenScrolling: false,
            autoFocus: true,
          },
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        contentContainerClassName="gap-6 px-5 pb-32 pt-2"
      >
        {!trimmed &&
          (recent.length > 0 ? (
            <View className="gap-3">
              <View className="flex-row items-center justify-between">
                <Text weight="bold" className="text-lg">
                  {t("recent")}
                </Text>
                <Pressable
                  onPress={() => {
                    setRecent([]);
                    Storage.removeItemSync(RECENT_KEY);
                  }}
                  hitSlop={8}
                >
                  <Text weight="semibold" className="text-sm text-primary">
                    {t("clear")}
                  </Text>
                </Pressable>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {recent.map((term) => (
                  <Pressable
                    key={term}
                    onPress={() => setQuery(term)}
                    className="rounded-full bg-secondary px-4 py-2 active:opacity-70"
                  >
                    <Text weight="medium" className="text-sm">
                      {term}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            <Text className="mt-16 text-center text-muted-foreground">{t("searchHint")}</Text>
          ))}

        {verseKey && (
          <Pressable
            onPress={() => open(verseKey)}
            className="flex-row items-center gap-4 rounded-3xl border border-border/70 bg-card p-5 active:bg-secondary/60"
          >
            <SurahName chapter={parseVerseKey(verseKey)!.chapter} size={36} className="text-primary" />
            <View className="flex-1">
              <Text weight="bold" className="text-lg">
                {t("goToVerse", { key: verseKey })}
              </Text>
              <Text className="text-sm text-muted-foreground">{name(parseVerseKey(verseKey)!.chapter)}</Text>
            </View>
            <Icon name="forward" color={colors.mutedForeground} size={16} />
          </Pressable>
        )}

        {chapters.length > 0 && (
          <View className="gap-1">
            <Text weight="bold" className="mb-1 text-lg">
              {t("surahs")}
            </Text>
            {chapters.map((chapter) => (
              <Pressable
                key={chapter.id}
                onPress={() => open(`${chapter.id}:1`)}
                className="flex-row items-center gap-3 rounded-2xl px-2 py-2 active:bg-secondary"
              >
                <View className="size-9 items-center justify-center rounded-xl bg-secondary">
                  <Text weight="bold" className="text-xs text-primary">
                    {chapter.id}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text weight="semibold" numberOfLines={1}>
                    {name(chapter.id)}
                  </Text>
                  <Text numberOfLines={1} className="text-xs text-muted-foreground">
                    {chapter.translatedName[locale]}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {debounced.length >= 2 && !verseKey && (
          <View className="gap-2">
            <View className="mb-1 flex-row items-baseline gap-2">
              <Text weight="bold" className="text-lg">
                {t("verses")}
              </Text>
              {results.data && (
                <Text className="text-sm text-muted-foreground">
                  {t("resultCount", { n: results.data.total })}
                </Text>
              )}
            </View>
            {results.isError && (
              <Text className="rounded-2xl bg-secondary px-4 py-3 text-sm text-muted-foreground">
                {t("searchOffline")}
              </Text>
            )}
            {results.data?.results.length === 0 && (
              <Text className="py-8 text-center text-muted-foreground">
                {t("noResults", { query: debounced })}
              </Text>
            )}
            {results.data?.results.map((result) => {
              const ref = parseVerseKey(result.verseKey);
              if (!ref) return null;
              return (
                <Pressable
                  key={result.verseKey}
                  onPress={() => open(result.verseKey)}
                  className="rounded-3xl border border-border/70 bg-card p-5 active:bg-secondary/40"
                >
                  <Text weight="bold" className="text-xs text-primary">
                    {name(ref.chapter)} · {result.verseKey}
                  </Text>
                  <NativeText
                    numberOfLines={2}
                    className="mt-2 text-quran-ink"
                    style={{ fontFamily: "UthmanicHafs", fontSize: 22, lineHeight: 40, ...alignedTo("rtl") }}
                  >
                    {result.text}
                  </NativeText>
                  {result.translationHtml && (
                    <Text
                      numberOfLines={2}
                      className="mt-1 text-sm text-muted-foreground"
                      style={alignedTo(textDirection(result.translationHtml))}
                    >
                      {htmlToText(result.translationHtml)}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}
