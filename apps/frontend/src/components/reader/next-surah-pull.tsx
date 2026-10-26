import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import type { Chapter } from "@qiraa/core";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Finger travel past the end that opens the next surah (on release). */
const PULL_PX = 140;
/** Wheel / trackpad scrolling past the end that opens the next surah. */
const WHEEL_PX = 500;
/** Wheel events further apart than this start a new gesture. */
const WHEEL_GESTURE_GAP_MS = 250;

/**
 * At the end of the surah, with a gesture that scrolls the page itself: not
 * one in a sheet or popover, or over a list that scrolls on its own (the
 * surah sidebar).
 */
function pullable(target: EventTarget | null) {
  const atEnd =
    window.innerHeight + window.scrollY >=
    document.documentElement.scrollHeight - 2;
  if (!atEnd || !(target instanceof Element)) return atEnd;
  if (target.closest('[role="dialog"]')) return false;
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (
      el.scrollHeight > el.clientHeight &&
      /auto|scroll/.test(getComputedStyle(el).overflowY)
    )
      return false;
  }
  return true;
}

/**
 * Sits at the end of a surah: pulling further (touch) or scrolling on
 * (wheel, trackpad) fills a ring, and a full ring opens the next surah.
 * Only a gesture that starts at the end counts, so scrolling down to the
 * end, momentum included, never opens it by accident.
 */
export function NextSurahPull({ next }: { next: Chapter }) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [touching, setTouching] = useState(false);

  useEffect(() => {
    let pulled = 0;
    /** Resets a wheel pull that stopped short. */
    let idle: ReturnType<typeof setTimeout> | undefined;
    const show = (value: number) => {
      pulled = Math.min(1, Math.max(0, value));
      setProgress(Math.round(pulled * 50) / 50);
    };
    const open = () => {
      show(0);
      navigate(`/quran/${next.id}`);
    };

    let startY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      clearTimeout(idle);
      startY = pullable(event.target) ? event.touches[0].clientY : null;
      setTouching(startY !== null);
    };
    const onTouchMove = (event: TouchEvent) => {
      if (startY !== null) show((startY - event.touches[0].clientY) / PULL_PX);
    };
    const endTouch = (release: boolean) => {
      if (release && startY !== null && pulled >= 1) open();
      else show(0);
      startY = null;
      setTouching(false);
    };
    const onTouchEnd = () => endTouch(true);
    // A cancelled touch (system gesture, incoming call) never navigates.
    const onTouchCancel = () => endTouch(false);

    let wheeled = 0;
    let lastWheel = -Infinity;
    let armed = false;
    const onWheel = (event: WheelEvent) => {
      const newGesture = event.timeStamp - lastWheel > WHEEL_GESTURE_GAP_MS;
      lastWheel = event.timeStamp;
      // Checked on every event: a gesture that moves onto the sidebar stops.
      const ok = pullable(event.target);
      if (newGesture) wheeled = 0;
      armed = ok && (newGesture || armed);
      if (!armed) {
        if (pulled > 0) show(0);
        return;
      }
      // Some mice report lines or pages instead of pixels.
      const unit =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? window.innerHeight
            : 1;
      wheeled = Math.max(0, wheeled + event.deltaY * unit);
      show(wheeled / WHEEL_PX);
      clearTimeout(idle);
      if (wheeled >= WHEEL_PX) {
        armed = false;
        open();
      } else {
        idle = setTimeout(() => show(0), 600);
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchCancel);
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      clearTimeout(idle);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
      window.removeEventListener("wheel", onWheel);
    };
  }, [navigate, next.id]);

  const name = locale === "ar" ? next.nameArabic : next.nameSimple;
  const ready = progress >= 1;
  return (
    // The next-surah link above is the accessible way to continue.
    <div
      aria-hidden
      className="mt-8 flex flex-col items-center gap-2 pb-2 text-sm text-muted-foreground"
    >
      <span className="relative flex size-11 items-center justify-center">
        <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            strokeWidth="2.5"
            className="stroke-border"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${progress * 100} 100`}
            strokeOpacity={progress > 0 ? 1 : 0}
            className="stroke-primary"
          />
        </svg>
        <ChevronDown className={cn("size-5", ready && "text-primary")} />
      </span>
      <span className={cn(ready && "font-semibold text-foreground")}>
        {t(ready && touching ? "releaseForSurah" : "keepScrollingForSurah", {
          name,
        })}
      </span>
    </div>
  );
}
