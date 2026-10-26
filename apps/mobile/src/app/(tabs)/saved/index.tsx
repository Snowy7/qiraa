import { Pressable, ScrollView, View } from "react-native";
import { router, Stack } from "expo-router";
import { getChapter, parseVerseKey } from "@qiraa/core";
import { headerButtons } from "@/components/ui/header-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { useLibrary } from "@/lib/library";
import { openInReader } from "@/lib/navigation";
import { useThemeColors } from "@/lib/theme";

/** Collections of saved ayahs, and the most recently saved ones. */
export default function SavedScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const collections = useLibrary((s) => s.collections);
  const bookmarks = useLibrary((s) => s.bookmarks);
  const recent = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("saved"),
          ...headerButtons(
            [{ icon: "plus", label: t("newCollection"), onPress: () => router.push("/collection-new") }],
            colors.foreground,
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 px-5 pb-32 pt-2">
        <View className="flex-row flex-wrap gap-3">
          {collections.map((collection) => {
            const count = bookmarks.filter((b) => b.collectionId === collection.id).length;
            return (
              <Pressable
                key={collection.id}
                onPress={() => router.push({ pathname: "/saved/[id]", params: { id: collection.id } })}
                accessibilityRole="button"
                className="min-w-[46%] flex-1 gap-3 rounded-3xl border border-border/70 bg-card p-5 active:bg-secondary/60"
              >
                <View
                  className="size-10 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: `${collection.color}22` }}
                >
                  <Icon name="bookmarkFill" color={collection.color} size={18} />
                </View>
                <View>
                  <Text weight="bold" numberOfLines={1}>
                    {collection.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">{t("verseCount", { n: count })}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {recent.length === 0 ? (
          <View className="items-center gap-2 px-6 py-10">
            <Text weight="bold" className="text-lg">
              {t("noCollections")}
            </Text>
            <Text className="text-center text-muted-foreground">{t("noCollectionsHint")}</Text>
          </View>
        ) : (
          <View className="gap-2">
            <Text weight="bold" className="text-lg">
              {t("recent")}
            </Text>
            {recent.map((bookmark) => {
              const ref = parseVerseKey(bookmark.verseKey);
              const chapter = ref ? getChapter(ref.chapter) : undefined;
              const collection = collections.find((c) => c.id === bookmark.collectionId);
              if (!chapter) return null;
              return (
                <Pressable
                  key={`${bookmark.collectionId}:${bookmark.verseKey}`}
                  onPress={() => openInReader(bookmark.verseKey)}
                  className="flex-row items-center gap-3 rounded-2xl bg-card px-4 py-3 active:bg-secondary/60"
                >
                  <View className="size-2.5 rounded-full" style={{ backgroundColor: collection?.color }} />
                  <View className="min-w-0 flex-1">
                    <Text weight="semibold">
                      {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} · {bookmark.verseKey}
                    </Text>
                    <Text numberOfLines={1} className="text-xs text-muted-foreground">
                      {collection?.name}
                    </Text>
                  </View>
                  <Icon name="forward" color={colors.mutedForeground} size={14} />
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </>
  );
}
