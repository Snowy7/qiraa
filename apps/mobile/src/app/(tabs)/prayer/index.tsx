import { Alert, Linking, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { router, Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { methodForLocation } from "@qiraa/core";
import { PrayerHero } from "@/components/prayer/prayer-hero";
import { headerButtons } from "@/components/ui/header-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { ALERT_PRAYERS, usePrayerAlerts, type AlertPrayer } from "@/lib/prayer/alerts";
import { usePrayerLocation } from "@/lib/prayer/location";
import { usePrayerDay, useTimeFormatter } from "@/lib/prayer/use-prayer-day";
import { useThemeColors } from "@/lib/theme";

const METHOD_NAMES: Record<string, string> = {
  NorthAmerica: "ISNA",
  Turkey: "Diyanet",
  UmmAlQura: "Umm al-Qura",
  Egyptian: "Egyptian General Authority",
  Karachi: "University of Islamic Sciences, Karachi",
  Singapore: "MUIS Singapore",
  MuslimWorldLeague: "Muslim World League",
};

const isAlertPrayer = (name: string): name is AlertPrayer => (ALERT_PRAYERS as readonly string[]).includes(name);

/** Today's prayer times, computed on the device, with an alert toggle per prayer. */
export default function PrayerScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { location, prayers, next } = usePrayerDay();
  const status = usePrayerLocation((s) => s.status);
  const enabled = usePrayerAlerts((s) => s.enabled);
  const formatTime = useTimeFormatter();

  const toggle = async (prayer: AlertPrayer) => {
    Haptics.selectionAsync();
    const allowed = await usePrayerAlerts.getState().toggle(prayer);
    if (!allowed) {
      Alert.alert(t("prayerAlerts"), t("notificationsDenied"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("openSettings"), onPress: () => Linking.openSettings() },
      ]);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t("prayerTimes"),
          ...headerButtons(
            [{ icon: "compass", label: t("qibla"), onPress: () => router.push("/qibla") }],
            colors.foreground,
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-5 pb-32 pt-2"
        refreshControl={
          location ? (
            <RefreshControl
              refreshing={status === "locating"}
              onRefresh={() => usePrayerLocation.getState().locate()}
            />
          ) : undefined
        }
      >
        <PrayerHero showDay={false} />

        {prayers && location && (
          <>
            <View className="overflow-hidden rounded-3xl bg-card">
              {prayers.map((prayer, i) => {
                const isNext = prayer.name === next?.name && prayer.time.getTime() === next.time.getTime();
                const alertPrayer = isAlertPrayer(prayer.name) ? prayer.name : null;
                const on = alertPrayer !== null && enabled[alertPrayer];
                return (
                  <View key={prayer.name}>
                    {i > 0 && <View className="ms-5 h-px bg-border/70" />}
                    <View className={cn("flex-row items-center gap-3 px-5 py-4", isNext && "bg-primary/5")}>
                      <Text weight={isNext ? "bold" : "semibold"} className={cn("flex-1 text-[17px]", isNext && "text-primary")}>
                        {t(prayer.name)}
                      </Text>
                      <Text weight="semibold" className="text-[17px]">
                        {formatTime(prayer.time)}
                      </Text>
                      {alertPrayer ? (
                        <Pressable
                          onPress={() => toggle(alertPrayer)}
                          accessibilityRole="switch"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={`${t("prayerAlerts")} · ${t(prayer.name)}`}
                          hitSlop={8}
                          className="size-9 items-center justify-center rounded-full active:bg-foreground/5"
                        >
                          <Icon name={on ? "bellFill" : "bell"} color={on ? colors.primary : colors.mutedForeground} size={18} />
                        </Pressable>
                      ) : (
                        <View className="size-9" />
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
            <Text className="px-2 text-[13px] text-muted-foreground">{t("prayerAlertsHint")}</Text>
            <Text className="px-2 text-[13px] text-muted-foreground">
              {t("calculatedLocally", { method: METHOD_NAMES[methodForLocation(location).method ?? ""] ?? "" })}
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}
