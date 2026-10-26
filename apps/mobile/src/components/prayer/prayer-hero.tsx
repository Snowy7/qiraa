import { ActivityIndicator, Linking, Pressable, View } from "react-native";
import { formatHijriDate } from "@qiraa/core";
import { MosqueSkyline } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { usePrayerLocation } from "@/lib/prayer/location";
import { usePrayerDay, useTimeFormatter } from "@/lib/prayer/use-prayer-day";
import { useThemeColors } from "@/lib/theme";

/**
 * The "next prayer" card: big time, live countdown and today's five prayers.
 * Asks for location on demand instead of prompting on launch.
 */
export function PrayerHero({ showDay = true, onPress }: { showDay?: boolean; onPress?: () => void }) {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const { location, prayers, next, countdown } = usePrayerDay();
  const status = usePrayerLocation((s) => s.status);
  const formatTime = useTimeFormatter();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || !location}
      className="overflow-hidden rounded-3xl border border-border/70 bg-card"
    >
      <View className="absolute inset-x-0 bottom-0 items-center opacity-10">
        <MosqueSkyline color={colors.primary} width={520} />
      </View>
      <View className="flex-row items-center justify-between gap-2 px-5 pt-5">
        <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
          <Icon name="location" color={colors.mutedForeground} size={12} />
          <Text numberOfLines={1} className="text-sm text-foreground/70">
            {location?.label ?? t("prayerTimes")}
          </Text>
        </View>
        <Text className="text-sm text-foreground/70">{formatHijriDate(new Date(), locale)}</Text>
      </View>

      {!location ? (
        <View className="items-start gap-4 px-5 pb-24 pt-5">
          <Text weight="semibold" className="text-lg leading-snug">
            {status === "denied"
              ? t("locationDeniedDevice")
              : status === "unavailable"
                ? t("locationUnavailable")
                : t("locationNeeded")}
          </Text>
          <Pressable
            onPress={() =>
              status === "denied" ? Linking.openSettings() : usePrayerLocation.getState().locate()
            }
            disabled={status === "locating"}
            className="h-11 flex-row items-center gap-2 rounded-full bg-primary px-5 active:opacity-80"
          >
            {status === "locating" ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} />
            ) : (
              <Icon name="location" color={colors.primaryForeground} size={14} />
            )}
            <Text weight="semibold" className="text-sm text-primary-foreground">
              {status === "denied" ? t("openSettings") : t("useMyLocation")}
            </Text>
          </Pressable>
        </View>
      ) : (
        next && (
          <View className="items-center px-5 pb-4 pt-4">
            <Text weight="semibold" className="text-sm uppercase tracking-widest text-primary">
              {t("nextPrayer")} · {t(next.name)}
            </Text>
            <Text weight="bold" className="mt-1 text-[52px] leading-[60px]">
              {formatTime(next.time)}
            </Text>
            <Text weight="medium" className="mt-1 text-[15px] text-foreground/70">
              {t("inCountdown", { time: countdown ?? "" })}
            </Text>
          </View>
        )
      )}

      {prayers && showDay && (
        <View className="flex-row gap-1 px-3 pb-4">
          {prayers
            .filter((p) => p.name !== "sunrise")
            .map((prayer) => {
              const isNext = prayer.name === next?.name && prayer.time.getTime() === next.time.getTime();
              return (
                <View
                  key={prayer.name}
                  className={cn("flex-1 items-center rounded-2xl py-2.5", isNext ? "bg-background" : "bg-background/40")}
                >
                  <Text weight="semibold" className={cn("text-xs", isNext ? "text-primary" : "text-foreground/60")}>
                    {t(prayer.name)}
                  </Text>
                  <Text weight="bold" className="mt-0.5 text-[13px]">
                    {formatTime(prayer.time, true)}
                  </Text>
                </View>
              );
            })}
        </View>
      )}
    </Pressable>
  );
}
