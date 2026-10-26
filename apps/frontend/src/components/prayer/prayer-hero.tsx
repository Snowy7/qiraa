import { LocateFixed, MapPin } from "lucide-react";
import { Button } from "@template/ui";
import { formatHijriDate } from "@qiraa/core";
import { MosqueSkyline } from "@/components/icons";
import { usePrayerDay, useTimeFormatter } from "@/lib/hooks/use-prayer";
import { useI18n } from "@/lib/i18n";
import { useLocation } from "@/lib/stores/location";
import { cn } from "@/lib/utils";

/**
 * The warm "next prayer" card: big time, live countdown and today's five
 * prayers. Asks for location on demand instead of prompting on load.
 */
export function PrayerHero({
  className,
  size = "default",
  showDay = true,
}: {
  className?: string;
  size?: "default" | "large";
  /** The strip of today's five prayers (hidden where a full list is shown). */
  showDay?: boolean;
}) {
  const { t, locale } = useI18n();
  const { location, prayers, next, countdown } = usePrayerDay();
  const status = useLocation((s) => s.status);
  const locate = useLocation((s) => s.locate);
  const formatTime = useTimeFormatter();
  const large = size === "large";

  return (
    <section
      className={cn(
        "hero-glow surface relative flex flex-col overflow-hidden",
        className,
      )}
    >
      <MosqueSkyline className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full text-primary opacity-[0.09] md:h-36" />

      <div className="relative flex flex-wrap items-center justify-between gap-2 px-5 pt-5 text-sm text-foreground/70 md:px-7 md:pt-6">
        <span className="flex min-w-0 items-center gap-1.5">
          <MapPin className="size-4 shrink-0" />
          <span className="truncate">
            {location?.label ?? t("prayerTimes")}
          </span>
        </span>
        <span>{formatHijriDate(new Date(), locale)}</span>
      </div>

      {!location ? (
        <div className="relative flex flex-1 flex-col items-start gap-4 px-5 pb-28 pt-6 md:px-7 md:pb-36">
          <p className="max-w-sm text-lg font-semibold leading-snug">
            {status === "denied"
              ? t("locationDenied")
              : status === "unavailable"
                ? t("locationUnavailable")
                : t("locationNeeded")}
          </p>
          <Button onClick={locate} disabled={status === "locating"}>
            <LocateFixed
              className={cn(status === "locating" && "animate-pulse")}
            />{" "}
            {t("useMyLocation")}
          </Button>
        </div>
      ) : (
        next && (
          <div
            className={cn(
              "relative px-5 pt-4 text-center md:px-7",
              large ? "pb-8 md:pt-8" : "pb-4",
            )}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">
              {t("nextPrayer")} · {t(next.name)}
            </p>
            <p
              className={cn(
                "mt-1 font-bold tabular-nums tracking-tight text-foreground",
                large
                  ? "text-6xl md:text-8xl"
                  : "text-[3.25rem] leading-none md:text-7xl",
              )}
            >
              {formatTime(next.time)}
            </p>
            <p className="mt-2 text-[15px] font-medium tabular-nums text-foreground/70">
              {t("inCountdown", { time: countdown ?? "" })}
            </p>
          </div>
        )
      )}

      {prayers && showDay && (
        <ol className="relative mt-auto grid grid-cols-5 gap-1 px-3 pb-4 md:gap-2 md:px-5 md:pb-5">
          {prayers
            .filter((p) => p.name !== "sunrise")
            .map((prayer) => {
              const isNext =
                prayer.name === next?.name &&
                prayer.time.getTime() === next.time.getTime();
              return (
                <li
                  key={prayer.name}
                  className={cn(
                    "flex flex-col items-center rounded-2xl px-1 py-2.5 text-center transition-colors",
                    isNext
                      ? "bg-card/85 shadow-sm dark:bg-foreground/10"
                      : "bg-card/40 dark:bg-foreground/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      isNext ? "text-primary" : "text-foreground/60",
                    )}
                  >
                    {t(prayer.name)}
                  </span>
                  <span className="mt-0.5 text-[13px] font-bold tabular-nums md:text-sm">
                    <span className="sm:hidden">
                      {formatTime(prayer.time, true)}
                    </span>
                    <span className="hidden sm:inline">
                      {formatTime(prayer.time)}
                    </span>
                  </span>
                </li>
              );
            })}
        </ol>
      )}
    </section>
  );
}
