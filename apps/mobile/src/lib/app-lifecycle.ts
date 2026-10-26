import { useEffect } from "react";
import { AppState } from "react-native";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import * as QuickActions from "expo-quick-actions";
import { useQuickActionRouting } from "expo-quick-actions/router";
import { formatMessage } from "@qiraa/core";
import { currentLocale } from "@/lib/i18n";
import { continueReadingHref } from "@/lib/navigation";
import { reschedulePrayerAlerts } from "@/lib/prayer/alerts";
import { refreshLocationIfGranted, usePrayerLocation } from "@/lib/prayer/location";
import { useReadingPosition } from "@/lib/reading-position";

/** Home-screen quick actions; "Continue reading" follows the reading position. */
function updateQuickActions() {
  const locale = currentLocale();
  const t = (key: Parameters<typeof formatMessage>[0]) => formatMessage(key, locale);
  QuickActions.setItems([
    {
      id: "continue",
      title: t("continueReading"),
      icon: process.env.EXPO_OS === "ios" ? "symbol:book" : null,
      params: { href: String(continueReadingHref(useReadingPosition.getState().last)) },
    },
    {
      id: "prayer",
      title: t("prayerTimes"),
      icon: process.env.EXPO_OS === "ios" ? "symbol:clock" : null,
      params: { href: "/prayer" },
    },
    {
      id: "qibla",
      title: t("qibla"),
      icon: process.env.EXPO_OS === "ios" ? "symbol:location.north.line" : null,
      params: { href: "/qibla" },
    },
    {
      id: "search",
      title: t("search"),
      icon: process.env.EXPO_OS === "ios" ? "symbol:magnifyingglass" : null,
      params: { href: "/search" },
    },
  ]).catch(() => {});
}

/**
 * App-wide background chores, mounted once under the tabs: keeps prayer
 * alerts scheduled, quick actions current, and routes taps on notifications
 * and quick actions. (Quick-action routing must live below the root layout.)
 */
export function useAppLifecycle() {
  useQuickActionRouting();

  useEffect(() => {
    refreshLocationIfGranted().finally(() => reschedulePrayerAlerts().catch(() => {}));
    updateQuickActions();

    // Alerts are scheduled days ahead; top them up whenever the app returns.
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") reschedulePrayerAlerts().catch(() => {});
    });
    const locationChanged = usePrayerLocation.subscribe((s, previous) => {
      if (s.location !== previous.location) reschedulePrayerAlerts().catch(() => {});
    });
    const positionChanged = useReadingPosition.subscribe(updateQuickActions);
    const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
      // Prayer alerts are the only notifications Qiraa sends.
      if (response.notification.request.content.data?.url === "/prayer") router.push("/prayer");
    });
    return () => {
      appState.remove();
      locationChanged();
      positionChanged();
      tapped.remove();
    };
  }, []);
}
