import { Pressable, ScrollView, View } from "react-native";
import { router, Stack } from "expo-router";
import { ProgressRing } from "@/components/progress-ring";
import { Icon, type IconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useHifzSummary } from "@/lib/hifz";
import { useI18n } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme";

/** Memorisation progress and today's reviews. Ayahs are rated from the reader. */
export default function MemorizeScreen() {
  const { t, n } = useI18n();
  const colors = useThemeColors();
  const summary = useHifzSummary();
  const started = summary.memorized + summary.learning > 0;
  const fraction = summary.memorized / summary.total;

  const stats: { icon: IconName; value: number; label: string }[] = [
    { icon: "flame", value: summary.streak, label: t("dayStreak") },
    { icon: "calendar", value: summary.reviewedToday, label: t("reviewedToday") },
    { icon: "brain", value: summary.learning, label: t("learning") },
  ];

  return (
    <>
      <Stack.Screen options={{ title: t("memorization") }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 px-5 pb-32 pt-2">
        <View className="items-center gap-5 rounded-3xl border border-border/70 bg-card p-6">
          <ProgressRing progress={fraction} size={164} stroke={12} color={colors.primary} track={colors.secondary}>
            <Text weight="bold" className="text-3xl">
              {n(Math.round(fraction * 1000) / 10)}%
            </Text>
            <Text className="text-xs text-muted-foreground">{t("memorized")}</Text>
          </ProgressRing>
          <View className="items-center gap-1">
            <Text weight="bold" className="text-center text-xl">
              {t("memorizedOf", { n: summary.memorized, total: summary.total })}
            </Text>
            <Text className="text-center text-muted-foreground">
              {summary.due > 0
                ? t("dueCount", { n: summary.due })
                : started
                  ? t("allCaughtUpHint")
                  : t("startMemorizingHint")}
            </Text>
          </View>
          {summary.due > 0 ? (
            <Pressable
              onPress={() => router.push("/memorize/review")}
              className="h-12 flex-row items-center gap-2 rounded-full bg-primary px-6 active:opacity-80"
            >
              <Icon name="play" color={colors.primaryForeground} size={16} />
              <Text weight="semibold" className="text-primary-foreground">
                {t("startReview")}
              </Text>
            </Pressable>
          ) : (
            !started && (
              <Pressable
                onPress={() => router.navigate("/quran")}
                className="h-12 items-center justify-center rounded-full border border-border px-6 active:bg-secondary"
              >
                <Text weight="semibold">{t("quran")}</Text>
              </Pressable>
            )
          )}
        </View>

        <View className="flex-row gap-3">
          {stats.map((stat) => (
            <View key={stat.label} className="flex-1 items-center gap-1 rounded-3xl border border-border/70 bg-card p-4">
              <Icon name={stat.icon} color={colors.primary} size={20} />
              <Text weight="bold" className="text-2xl">
                {n(stat.value)}
              </Text>
              <Text className="text-center text-xs text-muted-foreground">{stat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}
