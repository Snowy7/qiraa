import { useCallback } from "react";
import {
  formatMessage,
  formatNumber,
  type Locale,
  type MessageKey,
} from "@noor/core";
import { usePreferences } from "@/lib/stores/preferences";

export type { MessageKey };

/** Translation helpers bound to the user's UI language. */
export function useI18n() {
  const locale: Locale = usePreferences((s) => s.language);
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
