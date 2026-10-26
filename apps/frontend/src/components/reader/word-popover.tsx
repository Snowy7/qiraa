import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MoreHorizontal, Play, Volume2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useWordByWord } from "@/lib/quran/data";
import { playWord, useAudio } from "@/lib/stores/audio";
import { useReaderUi } from "@/lib/stores/reader-ui";

const GAP = 10;
const EDGE = 12;

/**
 * Small card anchored to a tapped word: the word, its meaning and
 * transliteration, and the next things you'd want to do with it.
 */
export function WordPopover() {
  const { t } = useI18n();
  const word = useReaderUi((s) => s.word);
  const showWord = useReaderUi((s) => s.showWord);
  const open = useReaderUi((s) => s.open);
  const chapter = word ? Number(word.verseKey.split(":")[0]) : 0;
  const gloss = useWordByWord(chapter, !!word).data?.[word?.verseKey ?? ""]?.[
    (word?.position ?? 1) - 1
  ];
  const card = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Place above the word when there's room, otherwise below; keep on screen.
  useLayoutEffect(() => {
    if (!word || !card.current) return setPosition(null);
    const { width, height } = card.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(word.rect.left + word.rect.width / 2 - width / 2, EDGE),
      window.innerWidth - width - EDGE,
    );
    const above = word.rect.top - height - GAP;
    setPosition({
      left,
      top: above > EDGE + 56 ? above : word.rect.bottom + GAP,
    });
  }, [word, gloss]);

  // Highlight just the tapped word, wherever it's drawn. An attribute React
  // doesn't manage, so re-renders of the word leave it alone.
  useEffect(() => {
    if (!word) return;
    const elements = document.querySelectorAll(
      `[data-word="${word.verseKey}:${word.position}"]`,
    );
    elements.forEach((element) => element.setAttribute("data-tapped", ""));
    return () =>
      elements.forEach((element) => element.removeAttribute("data-tapped"));
  }, [word]);

  // Dismiss on Escape, scrolling, or a tap anywhere else.
  useEffect(() => {
    if (!word) return;
    const close = () => showWord(null);
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!card.current?.contains(target) && !target.closest("[data-word]"))
        close();
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close);
    };
  }, [word, showWord]);

  if (!word) return null;

  const action = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
  ) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground [&_svg]:size-[18px]"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      ref={card}
      role="dialog"
      aria-label={t("verseActions", { key: word.verseKey })}
      className="fixed z-50 w-60 rounded-3xl border border-border/70 bg-popover p-3 text-popover-foreground shadow-float animate-in fade-in zoom-in-95"
      style={position ?? { top: -9999, left: -9999 }}
    >
      <p
        dir="rtl"
        lang="ar"
        className="quran-text text-center text-[2.4rem] leading-[1.7]"
        style={{ fontFamily: word.fontFamily }}
      >
        {word.text}
      </p>
      {gloss && (
        <div dir="ltr" className="text-center">
          <p className="font-semibold leading-snug">{gloss[0]}</p>
          {gloss[1] && (
            <p className="text-sm italic text-muted-foreground">{gloss[1]}</p>
          )}
        </div>
      )}
      <div className="mt-2 grid grid-cols-3 gap-1 border-t border-border/60 pt-2">
        {action(<Volume2 />, t("listen"), () =>
          playWord(word.verseKey, word.position),
        )}
        {action(<Play />, t("playAyah"), () => {
          void useAudio.getState().play(word.verseKey, { scope: "ayah" });
          showWord(null);
        })}
        {action(<MoreHorizontal />, t("more"), () =>
          open("actions", word.verseKey),
        )}
      </div>
    </div>
  );
}
