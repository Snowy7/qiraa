import { useEffect, useMemo, useState } from "react";
import { formatCountdown, localizeDigits, nextPrayer, prayerTimesFor } from "@qiraa/core";
import { useI18n } from "@/lib/i18n";
import { usePrayerLocation } from "./location";

/** Current time, re-rendering every `intervalMs`. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Today's prayer times and a live countdown to the next one. */
export function usePrayerDay() {
  const { locale } = useI18n();
  const location = usePrayerLocation((s) => s.location);
  const now = useNow(1000);
  const dayKey = now.toDateString();
  // Recompute when the day or place changes, not every tick.
  const prayers = useMemo(
    () => (location ? prayerTimesFor(location, new Date(dayKey)) : null),
    [location, dayKey],
  );
  const next = location ? nextPrayer(location, now) : null;
  return {
    location,
    prayers,
    next,
    countdown: next ? localizeDigits(formatCountdown(next.time.getTime() - now.getTime()), locale) : null,
  };
}

/** Clock time in the UI language; `compact` drops AM/PM where order makes it clear. */
export function useTimeFormatter() {
  const { locale } = useI18n();
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return (date: Date, compact = false) =>
      compact
        ? format
            .formatToParts(date)
            .filter((part) => part.type !== "dayPeriod")
            .map((part) => part.value)
            .join("")
            .trim()
        : format.format(date);
  }, [locale]);
}
