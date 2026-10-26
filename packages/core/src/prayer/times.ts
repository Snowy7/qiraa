import {
  CalculationMethod,
  Coordinates,
  PrayerTimes,
  type CalculationParameters,
} from "adhan";

export const PRAYER_NAMES = [
  "fajr",
  "sunrise",
  "dhuhr",
  "asr",
  "maghrib",
  "isha",
] as const;
export type PrayerName = (typeof PRAYER_NAMES)[number];

export interface PrayerTime {
  name: PrayerName;
  time: Date;
}

export interface Coords {
  lat: number;
  lng: number;
}

/** Picks the calculation method most communities in the region follow. */
export function methodForLocation({ lat, lng }: Coords): CalculationParameters {
  if (lng < -30 && lat > 15) return CalculationMethod.NorthAmerica();
  if (lat > 36 && lat < 42 && lng > 26 && lng < 45)
    return CalculationMethod.Turkey();
  if (lat > 12 && lat < 35 && lng > 35 && lng < 60)
    return CalculationMethod.UmmAlQura();
  if (lat > 22 && lat < 32 && lng > 24 && lng < 37)
    return CalculationMethod.Egyptian();
  if (lat > 5 && lat < 40 && lng > 60 && lng < 95)
    return CalculationMethod.Karachi();
  if (lat > -15 && lat < 15 && lng > 95 && lng < 145)
    return CalculationMethod.Singapore();
  return CalculationMethod.MuslimWorldLeague();
}

/** The six daily times (including sunrise) for a date, computed locally. */
export function prayerTimesFor(coords: Coords, date: Date): PrayerTime[] {
  const times = new PrayerTimes(
    new Coordinates(coords.lat, coords.lng),
    date,
    methodForLocation(coords),
  );
  return PRAYER_NAMES.map((name) => ({ name, time: times[name] }));
}

/** The next prayer after `now` (sunrise excluded), rolling over to tomorrow's Fajr. */
export function nextPrayer(coords: Coords, now: Date): PrayerTime {
  const upcoming = prayerTimesFor(coords, now).find(
    (p) => p.name !== "sunrise" && p.time > now,
  );
  if (upcoming) return upcoming;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return prayerTimesFor(coords, tomorrow)[0];
}

/** `h:mm:ss` until a moment, clamped at zero. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Hijri date via the platform's Islamic (Umm al-Qura) calendar. */
export function formatHijriDate(date: Date, locale: "en" | "ar"): string {
  const tag =
    locale === "ar"
      ? "ar-SA-u-ca-islamic-umalqura-nu-arab"
      : "en-u-ca-islamic-umalqura";
  try {
    return new Intl.DateTimeFormat(tag, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}
