import { useState } from "react";
import {
  ChevronRight,
  Loader2,
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
  Dialog,
  DialogContent,
  DialogTitle,
  Slider,
} from "@template/ui";
import { getChapter, getReciter, parseVerseKey } from "@qiraa/core";
import { SurahName } from "@/components/quran/ornaments";
import { useI18n } from "@/lib/i18n";
import {
  seekTo,
  useAudio,
  useAudioTime,
  type RepeatMode,
} from "@/lib/stores/audio";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";
import { DownloadRecitation } from "./download-recitation";
import { ReciterPicker } from "./reciter-picker";

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
const NEXT_REPEAT: Record<RepeatMode, RepeatMode> = {
  off: "verse",
  verse: "surah",
  surah: "off",
};

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Thin progress line along the bottom of the mini player. */
function ProgressLine() {
  const { current, duration } = useAudioTime();
  return (
    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-border/60">
      <div
        className="h-full bg-primary transition-[width] duration-300 ease-linear"
        style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
      />
    </div>
  );
}

function PlayPauseIcon() {
  const status = useAudio((s) => s.status);
  if (status === "loading") return <Loader2 className="animate-spin" />;
  return status === "playing" ? (
    <Pause className="fill-current" />
  ) : (
    <Play className="translate-x-px fill-current" />
  );
}

/** Compact player docked at the bottom while a recitation is loaded. */
export function AudioPlayer({ aboveTabBar }: { aboveTabBar: boolean }) {
  const { t, locale } = useI18n();
  const verseKey = useAudio((s) => s.verseKey);
  const status = useAudio((s) => s.status);
  const finishedAyah = useAudio((s) => s.finishedAyah);
  const { toggle, next, previous, stop, continueReciting } =
    useAudio.getState();
  const reciterId = usePreferences((s) => s.reciterId);
  const [expanded, setExpanded] = useState(false);

  if (!verseKey) return null;
  const ref = parseVerseKey(verseKey);
  const chapter = ref ? getChapter(ref.chapter) : undefined;

  return (
    <>
      <div
        className={cn(
          "fixed inset-x-3 z-40 md:inset-x-auto md:end-6 md:start-[calc(88px+1.5rem)]",
          aboveTabBar
            ? "bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+5.25rem)] md:bottom-6 xl:start-[calc(16rem+1.5rem)]"
            : "bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-6",
        )}
      >
        <div className="relative mx-auto flex max-w-xl items-center gap-1 overflow-hidden rounded-[22px] border border-border/70 bg-card/95 p-2 pe-2.5 shadow-float backdrop-blur-xl">
          <button
            onClick={() => setExpanded(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl text-start"
            aria-label={t("nowPlaying")}
          >
            {chapter && (
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-secondary text-primary">
                <SurahName chapter={chapter.id} className="text-[1.3rem]" />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight">
                {chapter &&
                  (locale === "ar" ? chapter.nameArabic : chapter.nameSimple)}
                <span className="font-medium text-muted-foreground">
                  {" "}
                  · {verseKey}
                </span>
              </span>
              <span className="mt-0.5 block truncate text-[13px] text-muted-foreground">
                {status === "error"
                  ? t("audioFailed")
                  : getReciter(reciterId).name[locale]}
              </span>
            </span>
          </button>

          {/* Media controls keep their physical order in every language. */}
          <div dir="ltr" className="flex items-center">
            {finishedAyah ? (
              <Button size="sm" onClick={continueReciting} className="me-1">
                {t("continueReciting")} <SkipForward className="fill-current" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={previous}
                  aria-label={t("previous")}
                  className="hidden md:inline-flex"
                >
                  <SkipBack className="fill-current" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggle}
                  aria-label={status === "playing" ? t("pause") : t("play")}
                >
                  <PlayPauseIcon />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={next}
                  aria-label={t("next")}
                >
                  <SkipForward className="fill-current" />
                </Button>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={stop}
            aria-label={t("stopAudio")}
            className="hidden text-muted-foreground md:inline-flex"
          >
            <X />
          </Button>
          <ProgressLine />
        </div>
      </div>
      <NowPlaying open={expanded} onOpenChange={setExpanded} />
    </>
  );
}

/** Full player: scrubber, repeat, speed, reciter and download. */
function NowPlaying({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const { verseKey, status, repeat } = useAudio();
  const { toggle, next, previous, stop, setRepeat } = useAudio.getState();
  const reciterId = usePreferences((s) => s.reciterId);
  const playbackRate = usePreferences((s) => s.playbackRate);
  const setPrefs = usePreferences((s) => s.set);
  const { current, duration } = useAudioTime();
  const [picking, setPicking] = useState(false);

  const ref = verseKey ? parseVerseKey(verseKey) : null;
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  if (!ref || !chapter) return null;

  const RepeatIcon = repeat === "verse" ? Repeat1 : Repeat;
  const repeatLabel = t(
    repeat === "off"
      ? "repeatOff"
      : repeat === "verse"
        ? "repeatVerse"
        : "repeatSurah",
  );
  const nextSpeed =
    SPEEDS[
      (SPEEDS.findIndex((speed) => speed === playbackRate) + 1) % SPEEDS.length
    ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="gap-6 sm:max-w-sm">
          <DialogTitle className="text-center text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("nowPlaying")}
          </DialogTitle>

          <div className="hero-glow flex flex-col items-center rounded-3xl px-6 py-8 text-center">
            <SurahName
              chapter={chapter.id}
              withPrefix
              className="text-5xl text-primary"
            />
            <p className="mt-4 text-xl font-bold">
              {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("ayahOf", { verse: ref.verse, total: chapter.versesCount })}
            </p>
          </div>

          <button
            onClick={() => setPicking(true)}
            className="flex items-center justify-between rounded-2xl bg-secondary/70 px-4 py-3 text-start transition-colors hover:bg-secondary"
          >
            <span>
              <span className="block text-xs text-muted-foreground">
                {t("reciter")}
              </span>
              <span className="font-semibold">
                {getReciter(reciterId).name[locale]}
              </span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground rtl:rotate-180" />
          </button>

          <div>
            <Slider
              min={0}
              max={1}
              step={0.001}
              value={[duration ? current / duration : 0]}
              onValueChange={([value]) => seekTo(value)}
              aria-label={t("nowPlaying")}
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
              <span>{clock(current)}</span>
              <span>-{clock(Math.max(0, duration - current))}</span>
            </div>
          </div>

          <div dir="ltr" className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRepeat(NEXT_REPEAT[repeat])}
              aria-label={repeatLabel}
              title={repeatLabel}
              className={cn(repeat !== "off" && "bg-secondary text-primary")}
            >
              <RepeatIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={previous}
              aria-label={t("previous")}
              className="size-12"
            >
              <SkipBack className="size-6 fill-current" />
            </Button>
            <Button
              size="icon"
              onClick={toggle}
              aria-label={status === "playing" ? t("pause") : t("play")}
              className="size-16 [&_svg]:size-7"
            >
              <PlayPauseIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={next}
              aria-label={t("next")}
              className="size-12"
            >
              <SkipForward className="size-6 fill-current" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPrefs({ playbackRate: nextSpeed })}
              aria-label={t("playbackSpeed")}
              className="text-sm font-bold tabular-nums"
            >
              {playbackRate}×
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <DownloadRecitation chapter={chapter.id} />
            <Button
              variant="ghost"
              onClick={() => {
                stop();
                onOpenChange(false);
              }}
            >
              <X /> {t("stop")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <ReciterPicker open={picking} onOpenChange={setPicking} />
    </>
  );
}
