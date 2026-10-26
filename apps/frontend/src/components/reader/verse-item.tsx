import { memo, useMemo } from "react";
import DOMPurify from "dompurify";
import {
  BookOpenText,
  Bookmark,
  MoreHorizontal,
  Pause,
  Play,
} from "lucide-react";
import { Button } from "@template/ui";
import type { AssembledVerse, QuranScript } from "@noor/core";
import { VerseText } from "@/components/quran/verse-text";
import { useI18n } from "@/lib/i18n";
import { useAudio, useIsReciting } from "@/lib/stores/audio";
import { useReaderUi } from "@/lib/stores/reader-ui";
import { cn } from "@/lib/utils";

interface VerseItemProps {
  verse: AssembledVerse;
  script: QuranScript;
  /** Translation HTML from the API (sanitised here). */
  translation?: string;
  glosses?: readonly (readonly [string, string])[];
  saved: boolean;
  highlighted: boolean;
}

/**
 * One ayah in verse-by-verse mode. Memoised and subscribed only to whether
 * *this* ayah is being recited, so playback never re-renders the list.
 */
export const VerseItem = memo(function VerseItem({
  verse,
  script,
  translation,
  glosses,
  saved,
  highlighted,
}: VerseItemProps) {
  const { t, n } = useI18n();
  const reciting = useIsReciting(verse.key);
  const playing = useAudio(
    (s) => s.verseKey === verse.key && s.status === "playing",
  );
  const open = useReaderUi((s) => s.open);
  const html = useMemo(
    () => (translation ? DOMPurify.sanitize(translation) : null),
    [translation],
  );

  const togglePlay = () => {
    const audio = useAudio.getState();
    if (reciting) audio.toggle();
    else audio.play(verse.key);
  };

  return (
    <article
      id={`ayah-${verse.verse}`}
      data-verse={verse.verse}
      className={cn(
        "defer-render scroll-mt-24 rounded-[28px] px-3 pb-7 pt-4 transition-colors duration-300 sm:px-5",
        reciting && "bg-[hsl(var(--verse-highlight))]",
        highlighted && !reciting && "bg-secondary/70",
      )}
    >
      <header className="mb-4 flex items-center gap-3">
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold tabular-nums text-primary">
          {n(verse.chapter)}:{n(verse.verse)}
        </span>
        <span className="h-px flex-1 bg-border/70" />
        <div className="-me-1.5 flex items-center text-muted-foreground">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={togglePlay}
            aria-label={playing ? t("pause") : t("play")}
            className={cn(reciting && "text-primary")}
          >
            {playing ? <Pause className="fill-current" /> : <Play />}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => open("actions", verse.key)}
            aria-label={t("bookmark")}
            className={cn(saved && "text-primary")}
          >
            <Bookmark className={cn(saved && "fill-current")} />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => open("tafsir", verse.key)}
            aria-label={t("tafsir")}
          >
            <BookOpenText />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => open("actions", verse.key)}
            aria-label={t("moreActions")}
          >
            <MoreHorizontal />
          </Button>
        </div>
      </header>

      <VerseText verse={verse} script={script} glosses={glosses} />

      {html && (
        <p
          dir="auto"
          className="translation-text mt-4 text-[length:var(--translation-size)] leading-[1.75] text-foreground/75"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </article>
  );
});
