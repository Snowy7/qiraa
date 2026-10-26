import {
  LocateFixed,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@template/ui";
import { methodForLocation, type PrayerName } from "@noor/core";
import { Page, PageHeader } from "@/components/page";
import { PrayerHero } from "@/components/prayer/prayer-hero";
import { usePrayerDay, useTimeFormatter } from "@/lib/hooks/use-prayer";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/stores/location";
import { cn } from "@/lib/utils";

const ICONS: Record<PrayerName, LucideIcon> = {
  fajr: Sunrise,
  sunrise: Sun,
  dhuhr: Sun,
  asr: Sun,
  maghrib: Sunset,
  isha: Moon,
};

export default function PrayerPage() {
  const { t } = useI18n();
  const { location, prayers, next } = usePrayerDay();
  const { locate, status } = useLocation();
  const formatTime = useTimeFormatter();
  const now = Date.now();

  return (
    <>
      <PageHeader
        title={t("prayerTimes")}
        actions={
          location && (
            <Button
              variant="ghost"
              size="icon"
              onClick={locate}
              disabled={status === "locating"}
              aria-label={t("useMyLocation")}
            >
              <LocateFixed
                className={cn(status === "locating" && "animate-pulse")}
              />
            </Button>
          )
        }
      />
      <Page className="grid gap-5 lg:grid-cols-[1.25fr,1fr] lg:items-start">
        <PrayerHero size="large" className="min-h-[360px] lg:sticky lg:top-6" />

        {prayers && (
          <div>
            <ol className="surface divide-y divide-border/60 overflow-hidden">
              {prayers.map((prayer) => {
                const Icon = ICONS[prayer.name];
                const isNext =
                  prayer.name === next?.name &&
                  prayer.time.getTime() === next.time.getTime();
                const past = prayer.time.getTime() < now && !isNext;
                return (
                  <li
                    key={prayer.name}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4",
                      isNext && "bg-[hsl(var(--verse-highlight))]",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-10 items-center justify-center rounded-2xl",
                        isNext
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <Icon className="size-5" />
                    </span>
                    <span
                      className={cn(
                        "flex-1 text-[17px] font-semibold",
                        past && "text-muted-foreground",
                      )}
                    >
                      {t(prayer.name)}
                    </span>
                    <span
                      className={cn(
                        "text-[17px] font-semibold tabular-nums",
                        isNext
                          ? "text-primary"
                          : past && "text-muted-foreground",
                      )}
                    >
                      {formatTime(prayer.time)}
                    </span>
                  </li>
                );
              })}
            </ol>
            {location && (
              <p className="mt-3 px-2 text-sm text-muted-foreground">
                {t("calculatedLocally", { method: methodName(location) })}
              </p>
            )}
          </div>
        )}
      </Page>
    </>
  );
}

/** Human name of the calculation method chosen for a location. */
function methodName(location: { lat: number; lng: number }): string {
  const params = methodForLocation(location);
  const names: Record<string, string> = {
    NorthAmerica: "ISNA",
    Turkey: "Diyanet",
    UmmAlQura: "Umm al-Qura",
    Egyptian: "Egyptian General Authority",
    Karachi: "University of Islamic Sciences, Karachi",
    Singapore: "MUIS",
    MuslimWorldLeague: "Muslim World League",
  };
  return (params.method && names[params.method]) ?? params.method ?? "";
}
