import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { formatMessage, prayerTimesFor, type PrayerName } from "@qiraa/core";
import { currentLocale } from "@/lib/i18n";
import { persistStorage } from "@/lib/storage";
import { usePrayerLocation } from "./location";

/** The five prayers that can raise an alert (sunrise is not a prayer). */
export const ALERT_PRAYERS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const satisfies readonly PrayerName[];
export type AlertPrayer = (typeof ALERT_PRAYERS)[number];

/*
 * iOS keeps at most 64 pending local notifications, so alerts are scheduled
 * 12 days ahead (5 × 12 = 60) and rescheduled whenever the app opens, the
 * location changes or an alert is toggled.
 */
const DAYS_AHEAD = 12;
const CHANNEL = "prayer-times";

interface AlertsState {
  enabled: Record<AlertPrayer, boolean>;
  /** Turns a prayer's alert on or off; false if notifications aren't allowed. */
  toggle: (prayer: AlertPrayer) => Promise<boolean>;
}

export const usePrayerAlerts = create<AlertsState>()(
  persist(
    (set, get) => ({
      enabled: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false },
      toggle: async (prayer) => {
        const on = !get().enabled[prayer];
        if (on && !(await ensurePermission())) return false;
        set({ enabled: { ...get().enabled, [prayer]: on } });
        await reschedulePrayerAlerts();
        return true;
      },
    }),
    {
      name: "qiraa-prayer-alerts",
      storage: persistStorage,
      partialize: ({ enabled }) => ({ enabled }),
    },
  ),
);

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Notifications.requestPermissionsAsync()).granted;
}

let scheduling = Promise.resolve();
let latest = 0;

/**
 * Replaces every scheduled prayer alert with fresh ones from today's location.
 * Runs one at a time (each cancels, then adds), skipping any already superseded.
 */
export function reschedulePrayerAlerts(): Promise<void> {
  const run = ++latest;
  scheduling = scheduling.then(() => (run === latest ? schedule() : undefined)).catch(() => {});
  return scheduling;
}

async function schedule() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const { location } = usePrayerLocation.getState();
  const { enabled } = usePrayerAlerts.getState();
  if (!location || !ALERT_PRAYERS.some((p) => enabled[p])) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: formatMessage("prayerAlerts", currentLocale()),
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  }

  const locale = currentLocale();
  const now = Date.now();
  for (let day = 0; day < DAYS_AHEAD; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    for (const { name, time } of prayerTimesFor(location, date)) {
      if (name === "sunrise" || !enabled[name] || time.getTime() <= now) continue;
      const prayer = formatMessage(name, locale);
      await Notifications.scheduleNotificationAsync({
        content: {
          title: prayer,
          body: formatMessage("prayerTimeNow", locale, { prayer }),
          sound: "default",
          data: { url: "/prayer" },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: time, channelId: CHANNEL },
      });
    }
  }
}

/** Show alerts as banners even while the app is open. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
