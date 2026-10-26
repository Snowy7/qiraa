import { useMemo } from "react";
import DOMPurify from "dompurify";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@template/ui";
import {
  QURAN_SCRIPTS,
  TAFSIRS,
  getChapter,
  parseVerseKey,
  toVerseKey,
} from "@noor/core";
import { VerseText } from "@/components/quran/verse-text";
import { useTafsirId, useVerseTafsir } from "@/lib/api/queries";
import { useI18n } from "@/lib/i18n";
import { useChapterVerses } from "@/lib/quran/data";
import { usePreferences } from "@/lib/stores/preferences";
import { useReaderUi } from "@/lib/stores/reader-ui";

/** Tafsir for one ayah: a side panel on larger screens, a sheet on phones. */
export function TafsirSheet() {
  const { t, locale } = useI18n();
  const { sheet, verseKey, open, close } = useReaderUi();
  const isOpen = sheet === "tafsir" && !!verseKey;
  const ref = verseKey ? parseVerseKey(verseKey) : null;
  const chapter = ref ? getChapter(ref.chapter) : undefined;

  const scriptId = usePreferences((s) => s.script);
  const setPrefs = usePreferences((s) => s.set);
  const tafsirId = useTafsirId();
  const tafsir = useVerseTafsir(isOpen ? verseKey : null);
  const verses = useChapterVerses(scriptId, ref?.chapter ?? 1).data;
  const verse = verses?.find((v) => v.key === verseKey);
  const html = useMemo(
    () => (tafsir.data ? DOMPurify.sanitize(tafsir.data.html) : ""),
    [tafsir.data],
  );

  const goTo = (verseNumber: number) =>
    ref && open("tafsir", toVerseKey(ref.chapter, verseNumber));

  return (
    <Dialog open={isOpen} onOpenChange={(value) => !value && close()}>
      <DialogContent side="end" className="h-[88dvh] gap-0 p-0 sm:h-dvh sm:p-0">
        <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-2 sm:pt-6">
          <DialogTitle>
            {t("tafsir")} ·{" "}
            {chapter &&
              (locale === "ar" ? chapter.nameArabic : chapter.nameSimple)}{" "}
            {verseKey}
          </DialogTitle>
          <DialogDescription asChild>
            <select
              value={tafsirId}
              onChange={(e) => setPrefs({ tafsirId: Number(e.target.value) })}
              className="mt-2 h-10 w-full rounded-full border border-input bg-card px-4 text-sm text-foreground"
            >
              {TAFSIRS.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </DialogDescription>
        </DialogHeader>

        <div
          className="reader-scope min-h-0 flex-1 overflow-y-auto px-5 py-5"
          style={{ "--quran-scale": 0.85 } as React.CSSProperties}
        >
          {verse && (
            <VerseText
              verse={verse}
              script={QURAN_SCRIPTS[scriptId]}
              className="mb-5 border-b border-border/60 pb-5"
            />
          )}
          {tafsir.isPending && (
            <div className="space-y-3" aria-busy>
              {[100, 92, 96, 70].map((width, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded-full bg-foreground/[0.06]"
                  style={{ width: `${width}%` }}
                />
              ))}
            </div>
          )}
          {tafsir.isError && (
            <p className="text-muted-foreground">{t("needsConnection")}</p>
          )}
          {tafsir.data && (
            <div
              dir="auto"
              className="prose-tafsir text-[15px] leading-[1.85] text-foreground/85"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>

        {ref && chapter && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="ghost"
              size="sm"
              disabled={ref.verse <= 1}
              onClick={() => goTo(ref.verse - 1)}
            >
              <ChevronLeft className="rtl:rotate-180" /> {t("previousAyah")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={ref.verse >= chapter.versesCount}
              onClick={() => goTo(ref.verse + 1)}
            >
              {t("nextAyah")} <ChevronRight className="rtl:rotate-180" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
