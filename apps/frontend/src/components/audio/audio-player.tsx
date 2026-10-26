import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@template/ui";
import { getChapter, getReciter, parseVerseKey } from "@noor/core";
import { SurahName } from "@/components/quran/ornaments";
import { useI18n } from "@/lib/i18n";
import {
  seekTo,
  useAudio,
  useAudioProgress,
  type RepeatMode,
} from "@/lib/stores/audio";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";
import { ReciterPicker } from "./reciter-picker";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = {
  off: "verse",
  verse: "surah",
  surah: "off",
};

function Progress() {
  const progress = useAudioProgress();
  return (
    <div
      role="slider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      className="group absolute inset-x-5 top-0 h-3 -translate-y-1/2 cursor-pointer"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const fraction = (e.clientX - rect.left) / rect.width;
        seekTo(document.dir === "rtl" ? 1 - fraction : fraction);
      }}
    >
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  );
}

/** Mini player shown while a recitation is loaded. */
export function AudioPlayer({ aboveTabBar }: { aboveTabBar: boolean }) {
  const { t, locale } = useI18n();
  const { verseKey, status, repeat, toggle, next, previous, stop, setRepeat } =
    useAudio();
  const reciterId = usePreferences((s) => s.reciterId);
  const playbackRate = usePreferences((s) => s.playbackRate);
  const setPrefs = usePreferences((s) => s.set);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!verseKey) return null;
  const ref = parseVerseKey(verseKey);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const reciter = getReciter(reciterId);
  const RepeatIcon = repeat === "verse" ? Repeat1 : Repeat;
  const repeatLabel = t(
    repeat === "off"
      ? "repeatOff"
      : repeat === "verse"
        ? "repeatVerse"
        : "repeatSurah",
  );

  return (
    <div
      className={cn(
        "fixed inset-x-3 z-40 md:inset-x-auto md:end-6 md:start-[calc(88px+1.5rem)]",
        aboveTabBar
          ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] md:bottom-6 xl:start-[calc(16rem+1.5rem)]"
          : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-6",
      )}
    >
      <div className="relative mx-auto flex max-w-2xl items-center gap-2 rounded-[26px] border border-border/70 bg-card/90 py-2 pe-2 ps-4 shadow-float backdrop-blur-xl">
        <Progress />

        <Link
          to={ref ? `/quran/${ref.chapter}?verse=${ref.verse}` : "/quran"}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {chapter && (
            <SurahName
              chapter={chapter.id}
              className="hidden text-[1.6rem] text-primary sm:inline-flex"
            />
          )}
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {chapter
                ? locale === "ar"
                  ? chapter.nameArabic
                  : chapter.nameSimple
                : ""}{" "}
              · {verseKey}
            </span>
            <span className="block truncate text-xs text-muted-foreground">
              {status === "error" ? t("audioFailed") : reciter.name[locale]}
            </span>
          </span>
        </Link>

        <Button
          variant="ghost"
          size="icon-sm"
          className={cn(
            "hidden md:inline-flex",
            repeat !== "off" && "text-primary",
          )}
          onClick={() => setRepeat(NEXT_REPEAT[repeat])}
          aria-label={repeatLabel}
          title={repeatLabel}
        >
          <RepeatIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={previous}
          aria-label={t("previous")}
          className="rtl:rotate-180"
        >
          <SkipBack />
        </Button>
        <Button
          size="icon"
          onClick={toggle}
          aria-label={status === "playing" ? t("pause") : t("play")}
          className="size-11"
        >
          {status === "loading" ? (
            <Loader2 className="animate-spin" />
          ) : status === "playing" ? (
            <Pause className="fill-current" />
          ) : (
            <Play className="translate-x-px fill-current" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={next}
          aria-label={t("next")}
          className="rtl:rotate-180"
        >
          <SkipForward />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t("moreActions")}
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuItem onSelect={() => setPickerOpen(true)}>
              {t("chooseReciter")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setRepeat(NEXT_REPEAT[repeat])}
              className="md:hidden"
            >
              <RepeatIcon /> {repeatLabel}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="px-3 text-xs text-muted-foreground">
              {t("playbackSpeed")}
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={String(playbackRate)}
              onValueChange={(value) =>
                setPrefs({ playbackRate: Number(value) })
              }
            >
              {SPEEDS.map((speed) => (
                <DropdownMenuRadioItem key={speed} value={String(speed)}>
                  {speed}×
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={stop}
          aria-label={t("stopAudio")}
        >
          <X />
        </Button>
      </div>
      <ReciterPicker open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
