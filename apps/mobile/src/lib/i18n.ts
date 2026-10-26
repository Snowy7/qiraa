import { useCallback } from "react";
import { getLocales, useLocales } from "expo-localization";
import {
  formatMessage,
  formatNumber,
  type Locale,
  type MessageKey,
} from "@qiraa/core";

export type { Locale, MessageKey };

/*
 * The UI language is the app's system language (iOS and Android both offer a
 * per-app language in Settings). Switching it restarts the app, so React
 * Native's RTL layout always matches.
 */
const toLocale = (code: string | null | undefined): Locale =>
  code === "ar" ? "ar" : "en";

/** The UI locale outside React (notifications, share text, lock screen). */
export function currentLocale(): Locale {
  return toLocale(getLocales()[0]?.languageCode);
}

/** Translation helpers bound to the app's UI language. */
export function useI18n() {
  const locale = toLocale(useLocales()[0]?.languageCode);
  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) =>
      formatMessage(key, locale, params),
    [locale],
  );
  const n = useCallback(
    (value: number) => formatNumber(value, locale),
    [locale],
  );
  return { t, n, locale, isRtl: locale === "ar" };
}
