import { useEffect } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { getChapter, parseVerseKey, type MessageKey, type ReviewRating } from "@qiraa/core";
import { Icon } from "@/components/ui/icon";
import { SheetAction, SheetHeader, SheetSection } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useAudio } from "@/lib/audio/player";
import { cn } from "@/lib/cn";
import { useHifz } from "@/lib/hifz";
import { useI18n } from "@/lib/i18n";
import { useLibrary } from "@/lib/library";
import { useReaderUi } from "@/lib/reader-ui";
import { copyVerse, shareVerse } from "@/lib/share";
import { useThemeColors } from "@/lib/theme";

const RATINGS: readonly { rating: ReviewRating; label: MessageKey; className: string }[] = [
  { rating: "forgot", label: "forgot", className: "border-destructive/40" },
  { rating: "shaky", label: "shaky", className: "border-amber-500/50" },
  { rating: "good", label: "good", className: "border-emerald-500/50" },
  { rating: "solid", label: "solid", className: "border-primary/50" },
];

/** Everything you can do with an ayah, from the verse list or the mushaf. */
export default function VerseSheet() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const { key = "" } = useLocalSearchParams<{ key: string }>();
  const ref = parseVerseKey(key);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const collections = useLibrary((s) => s.collections);
  const bookmarks = useLibrary((s) => s.bookmarks);
  const confidence = useHifz((s) => s.records[key]?.confidence);

  // The ayah stays highlighted on the page until the sheet closes.
  useEffect(() => {
    useReaderUi.setState({ selectedVerse: key });
    return () => useReaderUi.setState({ selectedVerse: null });
  }, [key]);

  if (!chapter) return null;

  return (
    <ScrollView contentContainerClassName="pb-10">
      <SheetHeader title={`${locale === "ar" ? chapter.nameArabic : chapter.nameSimple} · ${key}`} />
      <View className="flex-row gap-2 px-6 py-3">
        <SheetAction
          icon="play"
          label={t("play")}
          onPress={() => {
            void useAudio.getState().play(key, { scope: "ayah" });
            router.back();
          }}
        />
        <SheetAction
          icon="tafsir"
          label={t("tafsir")}
          onPress={() => router.replace({ pathname: "/tafsir/[key]", params: { key } })}
        />
        <SheetAction
          icon="copy"
          label={t("copy")}
          onPress={async () => {
            await copyVerse(key);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          }}
        />
        <SheetAction icon="share" label={t("share")} onPress={() => shareVerse(key)} />
      </View>

      <SheetSection title={t("saveTo", { key })}>
        <View className="flex-row flex-wrap gap-2">
          {collections.map((collection) => {
            const saved = bookmarks.some((b) => b.collectionId === collection.id && b.verseKey === key);
            return (
              <Pressable
                key={collection.id}
                onPress={() => {
                  Haptics.selectionAsync();
                  useLibrary.getState().toggleBookmark(collection.id, key);
                }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: saved }}
                className={cn(
                  "h-10 flex-row items-center gap-2 rounded-full border px-4",
                  saved ? "border-primary bg-primary" : "border-border",
                )}
              >
                {saved ? (
                  <Icon name="check" color={colors.primaryForeground} size={14} />
                ) : (
                  <View className="size-2.5 rounded-full" style={{ backgroundColor: collection.color }} />
                )}
                <Text weight="semibold" className={cn("text-sm", saved && "text-primary-foreground")}>
                  {collection.name}
                </Text>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => router.push({ pathname: "/collection-new", params: { verseKey: key } })}
            accessibilityLabel={t("newCollection")}
            className="h-10 flex-row items-center gap-1.5 rounded-full border border-dashed border-border px-4"
          >
            <Icon name="plus" color={colors.mutedForeground} size={14} />
            <Text weight="semibold" className="text-sm text-muted-foreground">
              {t("newCollection")}
            </Text>
          </Pressable>
        </View>
      </SheetSection>

      <SheetSection title={t("howWellKnown", { key })}>
        <View className="flex-row gap-2">
          {RATINGS.map(({ rating, label, className }) => (
            <Pressable
              key={rating}
              onPress={() => {
                useHifz.getState().recordReview(key, rating);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.back();
              }}
              className={cn(
                "flex-1 items-center rounded-2xl border py-3 active:bg-foreground/5",
                className,
                confidence === rating && "bg-foreground/5",
              )}
            >
              <Text weight="semibold" className="text-sm">
                {t(label)}
              </Text>
            </Pressable>
          ))}
        </View>
      </SheetSection>
    </ScrollView>
  );
}
