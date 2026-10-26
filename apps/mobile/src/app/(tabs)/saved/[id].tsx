import { Alert, Pressable, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { MenuView } from "@expo/ui/community/menu";
import { QURAN_SCRIPTS, getChapter, parseVerseKey } from "@qiraa/core";
import { VerseText } from "@/components/quran/verse-text";
import { headerButtons } from "@/components/ui/header-buttons";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { useLibrary } from "@/lib/library";
import { openInReader } from "@/lib/navigation";
import { usePreferences } from "@/lib/preferences";
import { getVerse } from "@/lib/quran/data";
import { useThemeColors } from "@/lib/theme";

/** The ayahs saved in one collection; long-press one to remove it. */
export default function CollectionScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collection = useLibrary((s) => s.collections.find((c) => c.id === id));
  const allBookmarks = useLibrary((s) => s.bookmarks);
  const bookmarks = allBookmarks.filter((b) => b.collectionId === id);
  const scriptId = usePreferences((s) => s.script);

  if (!collection) {
    return (
      <View className="flex-1 items-center justify-center">
        <Stack.Screen options={{ title: "" }} />
        <Text className="text-muted-foreground">{t("collectionNotFound")}</Text>
      </View>
    );
  }

  const confirmDelete = () =>
    Alert.alert(t("deleteCollection", { name: collection.name }), t("deleteCollectionHint"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("delete"),
        style: "destructive",
        onPress: () => {
          useLibrary.getState().deleteCollection(collection.id);
          router.back();
        },
      },
    ]);

  return (
    <>
      <Stack.Screen
        options={{
          title: collection.name,
          headerLargeTitleEnabled: false,
          ...headerButtons([{ icon: "trash", label: t("delete"), onPress: confirmDelete }], colors.foreground),
        }}
      />
      <FlashList
        data={bookmarks}
        keyExtractor={(b) => b.verseKey}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
        ListHeaderComponent={
          <Text className="mb-3 mt-2 text-sm text-muted-foreground">{t("verseCount", { n: bookmarks.length })}</Text>
        }
        ListEmptyComponent={
          <View className="items-center gap-2 py-16">
            <Text weight="bold" className="text-lg">
              {t("emptyCollection")}
            </Text>
            <Text className="text-center text-muted-foreground">{t("noCollectionsHint")}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const ref = parseVerseKey(item.verseKey);
          const chapter = ref ? getChapter(ref.chapter) : undefined;
          const verse = getVerse(scriptId, item.verseKey);
          if (!chapter || !verse) return null;
          return (
            <MenuView
              shouldOpenOnLongPress
              onPressAction={() => useLibrary.getState().toggleBookmark(collection.id, item.verseKey)}
              actions={[
                {
                  id: "remove",
                  title: t("removeFromCollection"),
                  image: "trash",
                  attributes: { destructive: true },
                },
              ]}
            >
              <Pressable
                onPress={() => openInReader(item.verseKey)}
                className="mb-3 gap-3 rounded-3xl border border-border/70 bg-card p-5 active:bg-secondary/40"
              >
                <Text weight="bold" className="text-xs text-primary">
                  {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} · {item.verseKey}
                </Text>
                <VerseText verse={verse} script={QURAN_SCRIPTS[scriptId]} fontSize={24} />
              </Pressable>
            </MenuView>
          );
        }}
      />
    </>
  );
}
