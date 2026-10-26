import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QURAN_SCRIPTS, getChapter, parseVerseKey, type MessageKey, type ReviewRating } from "@qiraa/core";
import { VerseText } from "@/components/quran/verse-text";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAudio } from "@/lib/audio/player";
import { cn } from "@/lib/cn";
import { dueVerses, useHifz } from "@/lib/hifz";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { getVerse } from "@/lib/quran/data";
import { useThemeColors } from "@/lib/theme";

const RATINGS: readonly { rating: ReviewRating; label: MessageKey; className: string }[] = [
  { rating: "forgot", label: "forgot", className: "border-destructive/40" },
  { rating: "shaky", label: "shaky", className: "border-amber-500/50" },
  { rating: "good", label: "good", className: "border-emerald-500/50" },
  { rating: "solid", label: "solid", className: "border-primary/50" },
];

/** Flashcard review of due ayahs: recall, reveal, rate. */
export default function ReviewScreen() {
  const { t, n, locale } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const scriptId = usePreferences((s) => s.script);
  const [queue] = useState(() => dueVerses(20));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ReviewRating[]>([]);

  const current = queue[index];
  const ref = current ? parseVerseKey(current) : null;
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const verse = current ? getVerse(scriptId, current) : undefined;

  const rate = (rating: ReviewRating) => {
    if (!current) return;
    useHifz.getState().recordReview(current, rating);
    Haptics.selectionAsync();
    setResults((r) => [...r, rating]);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const close = (
    <Pressable onPress={() => router.back()} accessibilityLabel={t("back")} hitSlop={10} className="size-10 items-center justify-center rounded-full bg-foreground/5">
      <Icon name="close" color={colors.foreground} size={18} />
    </Pressable>
  );

  if (!current || !chapter) {
    const good = results.filter((r) => r === "good" || r === "solid").length;
    return (
      <View className="flex-1 items-center justify-center gap-6 bg-background px-8" style={{ paddingTop: insets.top }}>
        <Icon name="checkCircle" color={colors.primary} size={64} />
        <View className="items-center gap-1">
          <Text weight="bold" className="text-2xl">
            {results.length ? t("sessionComplete") : t("allCaughtUp")}
          </Text>
          {results.length > 0 && <Text className="text-muted-foreground">{t("reviewedCount", { n: results.length })}</Text>}
        </View>
        {results.length > 0 && (
          <View className="flex-row gap-10">
            <View className="items-center">
              <Text weight="bold" className="text-3xl text-emerald-600">{n(good)}</Text>
              <Text className="text-sm text-muted-foreground">{t("good")}</Text>
            </View>
            <View className="items-center">
              <Text weight="bold" className="text-3xl text-amber-600">{n(results.length - good)}</Text>
              <Text className="text-sm text-muted-foreground">{t("needsWork")}</Text>
            </View>
          </View>
        )}
        <Pressable onPress={() => router.back()} className="h-12 items-center justify-center rounded-full bg-primary px-8 active:opacity-80">
          <Text weight="semibold" className="text-primary-foreground">{t("backToMemorize")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }}>
      <View className="flex-row items-center gap-3 px-5">
        {close}
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <View className="h-full rounded-full bg-primary" style={{ width: `${(index / queue.length) * 100}%` }} />
        </View>
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {n(index + 1)}/{n(queue.length)}
        </Text>
      </View>

      <ScrollView contentContainerClassName="flex-grow items-center justify-center gap-6 px-5 py-8">
        <View className="items-center">
          <Text className="text-sm text-muted-foreground">{locale === "ar" ? chapter.nameArabic : chapter.nameSimple}</Text>
          <Text weight="bold" className="text-2xl">
            {t("verseActions", { key: current })}
          </Text>
        </View>
        <View className="w-full rounded-3xl border border-border/70 bg-card p-6">
          {revealed && verse ? (
            <VerseText verse={verse} script={QURAN_SCRIPTS[scriptId]} fontSize={28} align="center" />
          ) : (
            <Pressable onPress={() => setRevealed(true)} className="items-center gap-4 py-10">
              <View className="size-16 items-center justify-center rounded-3xl bg-secondary">
                <Icon name="eye" color={colors.mutedForeground} size={26} />
              </View>
              <Text weight="medium" className="text-muted-foreground">{t("tapToReveal")}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      <View className="px-5">
        {revealed ? (
          <View className="flex-row gap-2">
            {RATINGS.map(({ rating, label, className }) => (
              <Pressable key={rating} onPress={() => rate(rating)} className={cn("flex-1 items-center rounded-2xl border bg-card py-4 active:opacity-70", className)}>
                <Text weight="semibold">{t(label)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => useAudio.getState().play(current, { scope: "ayah" })}
            className="flex-row items-center justify-center gap-2 py-4 active:opacity-60"
          >
            <Icon name="speaker" color={colors.primary} size={18} />
            <Text weight="semibold" className="text-primary">{t("playHint")}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
