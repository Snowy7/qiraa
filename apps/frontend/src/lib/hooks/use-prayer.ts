import { useMemo } from "react";
import { formatCountdown, nextPrayer, prayerTimesFor } from "@qiraa/core";
import { useNow } from "@/lib/hooks/use-now";
import { useLocation } from "@/lib/stores/location";
import { usePreferences } from "@/lib/stores/preferences";

/** Today's prayer times and a live countdown to the next one. */
export function usePrayerDay() {
  const location = useLocation((s) => s.location);
  const now = useNow(1000);
  const dayKey = now.toDateString();

  const prayers = useMemo(
    () => (location ? prayerTimesFor(location, now) : null),
    // Recompute when the day or place changes, not every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [location?.lat, location?.lng, dayKey],
  );
  const next = location ? nextPrayer(location, now) : null;

  return {
    location,
    prayers,
    next,
    countdown: next
      ? formatCountdown(next.time.getTime() - now.getTime())
      : null,
  };
}

/**
 * Clock time in the user's language (12/24h follows the device for English).
 * `compact` drops AM/PM where the order of prayers already makes it clear.
 */
export function useTimeFormatter() {
  const language = usePreferences((s) => s.language);
  return useMemo(() => {
    const format = new Intl.DateTimeFormat(
      language === "ar" ? "ar-EG" : undefined,
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );
    return (date: Date, compact = false) =>
      compact
        ? format
            .formatToParts(date)
            .filter((part) => part.type !== "dayPeriod")
            .map((part) => part.value)
            .join("")
            .trim()
        : format.format(date);
  }, [language]);
}
