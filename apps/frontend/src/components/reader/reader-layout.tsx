import { useEffect, type ReactNode } from "react";
import {
  BookOpen,
  ChevronDown,
  Pause,
  Play,
  Rows3,
  SlidersHorizontal,
} from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@template/ui";
import type { Chapter } from "@noor/core";
import { BackButton, Segmented } from "@/components/page";
import { SurahName } from "@/components/quran/ornaments";
import { useI18n } from "@/lib/i18n";
import { startWordHighlighting, useAudio } from "@/lib/stores/audio";
import { useReaderUi } from "@/lib/stores/reader-ui";
import type { ReadingMode } from "@/lib/stores/preferences";
import { ReaderSettings } from "./reader-settings";
import { SurahNavigator } from "./surah-navigator";
import { TafsirSheet } from "./tafsir-sheet";
import { VerseActionsSheet } from "./verse-actions";

interface ReaderLayoutProps {
  /** Chapter shown in the title and highlighted in the navigator. */
  chapter: Chapter;
  subtitle: ReactNode;
  mode: ReadingMode;
  onModeChange: (mode: ReadingMode) => void;
  hrefForChapter: (chapter: Chapter) => string;
  /** Ayah to start from when the play button is pressed (what's on screen). */
  playFrom: () => string;
  children: ReactNode;
}

/**
 * Frame shared by both reading modes. Phones get a compact bar and sheets;
 * from `lg` the surah list stays open beside the text for quick switching.
 */
export function ReaderLayout({
  chapter,
  subtitle,
  mode,
  onModeChange,
  hrefForChapter,
  playFrom,
  children,
}: ReaderLayoutProps) {
  const { t, locale } = useI18n();
  const { sheet, open, close } = useReaderUi();
  const playing = useAudio((s) => s.status === "playing");

  useEffect(startWordHighlighting, []);

  const togglePlay = () => {
    const audio = useAudio.getState();
    if (audio.verseKey) audio.toggle();
    else void audio.play(playFrom());
  };

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-[300px] shrink-0 flex-col border-e border-border/60 pt-5 lg:flex">
        <p className="mb-3 px-5 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
          {t("surahs")}
        </p>
        <SurahNavigator
          currentChapter={chapter.id}
          hrefFor={hrefForChapter}
          className="flex-1"
        />
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 pt-safe backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-1 px-2 sm:px-4">
            <BackButton to="/quran" className="md:hidden" />
            <button
              onClick={() => open("surahs")}
              className="flex min-w-0 items-center gap-2.5 rounded-2xl px-2 py-1.5 text-start transition-colors hover:bg-secondary lg:pointer-events-none"
              aria-label={t("chooseSurah")}
            >
              <SurahName
                chapter={chapter.id}
                className="hidden text-[1.75rem] text-primary sm:inline-flex"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-[15px] font-bold leading-tight">
                  <span className="truncate">
                    {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground lg:hidden" />
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {subtitle}
                </span>
              </span>
            </button>

            <div className="ms-auto flex items-center gap-1">
              <Segmented
                size="sm"
                value={mode}
                onChange={onModeChange}
                options={[
                  {
                    value: "verses",
                    label: (
                      <>
                        <Rows3 />
                        <span className="hidden sm:inline">
                          {t("verseByVerse")}
                        </span>
                      </>
                    ),
                    title: t("verseByVerse"),
                  },
                  {
                    value: "mushaf",
                    label: (
                      <>
                        <BookOpen />
                        <span className="hidden sm:inline">
                          {t("mushafMode")}
                        </span>
                      </>
                    ),
                    title: t("mushafMode"),
                  },
                ]}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={togglePlay}
                aria-label={playing ? t("pause") : t("play")}
              >
                {playing ? (
                  <Pause className="fill-current" />
                ) : (
                  <Play className="fill-current" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => open("settings")}
                aria-label={t("readingSettings")}
              >
                <SlidersHorizontal />
              </Button>
            </div>
          </div>
        </header>

        {children}
      </div>

      <Dialog
        open={sheet === "surahs"}
        onOpenChange={(isOpen) => !isOpen && close()}
      >
        <DialogContent className="h-[80dvh] gap-3 px-2 sm:h-[70dvh] sm:px-3">
          <DialogHeader className="px-3">
            <DialogTitle>{t("chooseSurah")}</DialogTitle>
          </DialogHeader>
          <SurahNavigator
            currentChapter={chapter.id}
            hrefFor={hrefForChapter}
            onNavigate={close}
            className="flex-1"
          />
        </DialogContent>
      </Dialog>
      <ReaderSettings
        open={sheet === "settings"}
        onOpenChange={(isOpen) => !isOpen && close()}
      />
      <VerseActionsSheet />
      <TafsirSheet />
    </div>
  );
}
