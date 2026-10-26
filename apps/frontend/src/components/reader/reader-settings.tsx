import { useState, type ReactNode } from "react";
import { Check, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Slider,
  Switch,
} from "@template/ui";
import {
  QURAN_SCRIPTS,
  QURAN_SCRIPT_IDS,
  getReciter,
  type QuranScriptId,
} from "@noor/core";
import { ReciterPicker } from "@/components/audio/reciter-picker";
import { VerseText } from "@/components/quran/verse-text";
import { useI18n } from "@/lib/i18n";
import { useChapterVerses } from "@/lib/quran/data";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";
import { TranslationPicker, useTranslationName } from "./translation-picker";

/** Al-Ikhlas 112:1, rendered in a script as its live preview. */
function ScriptPreview({ id }: { id: QuranScriptId }) {
  const verse = useChapterVerses(id, 112).data?.[0];
  return verse ? (
    <VerseText
      verse={verse}
      script={QURAN_SCRIPTS[id]}
      className="text-center"
    />
  ) : (
    <div className="h-12 animate-pulse rounded-xl bg-foreground/[0.05]" />
  );
}

export function SettingRow({
  label,
  hint,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

/** Reader options as a side sheet (phones: bottom sheet). */
export function ReaderSettings({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent side="end" className="gap-6 sm:overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("readingSettings")}</DialogTitle>
        </DialogHeader>
        <ReadingOptions />
      </DialogContent>
    </Dialog>
  );
}

/** Script picker, text sizes, translation and audio options (sheet and Settings page). */
export function ReadingOptions() {
  const { t, locale } = useI18n();
  const prefs = usePreferences();
  const [picker, setPicker] = useState<"translation" | "reciter" | null>(null);
  const translationName = useTranslationName();

  return (
    <>
      <section
        className="reader-scope"
        style={{ "--quran-scale": 0.72 } as React.CSSProperties}
      >
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("quranScript")}
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {QURAN_SCRIPT_IDS.map((id) => {
            const script = QURAN_SCRIPTS[id];
            const selected = prefs.script === id;
            return (
              <button
                key={id}
                onClick={() => prefs.set({ script: id })}
                aria-pressed={selected}
                className={cn(
                  "rounded-3xl border p-4 text-start transition-colors",
                  selected
                    ? "border-primary bg-primary/[0.06]"
                    : "border-border hover:bg-secondary/60",
                )}
              >
                <ScriptPreview id={id} />
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span>
                    <span className="block font-semibold">
                      {script.name[locale]}
                    </span>
                    <span className="block text-sm text-muted-foreground">
                      {script.description[locale]}
                    </span>
                  </span>
                  {selected && (
                    <Check className="size-5 shrink-0 text-primary" />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-semibold">{t("quranTextSize")}</h3>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(prefs.quranTextScale * 100)}%
            </span>
          </div>
          <Slider
            min={0.8}
            max={1.6}
            step={0.05}
            value={[prefs.quranTextScale]}
            onValueChange={([value]) => prefs.set({ quranTextScale: value })}
          />
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="font-semibold">{t("translationTextSize")}</h3>
            <span className="text-sm tabular-nums text-muted-foreground">
              {Math.round(prefs.translationTextScale * 100)}%
            </span>
          </div>
          <Slider
            min={0.85}
            max={1.4}
            step={0.05}
            value={[prefs.translationTextScale]}
            onValueChange={([value]) =>
              prefs.set({ translationTextScale: value })
            }
          />
        </div>
      </section>

      <section className="divide-y divide-border/60">
        <SettingRow label={t("showTranslation")}>
          <Switch
            checked={prefs.showTranslation}
            onCheckedChange={(value) => prefs.set({ showTranslation: value })}
          />
        </SettingRow>
        <button
          className="flex w-full items-center justify-between gap-4 py-3 text-start"
          onClick={() => setPicker("translation")}
        >
          <span className="min-w-0">
            <span className="block font-semibold">{t("translation")}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {translationName}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" />
        </button>
        <SettingRow label={t("wordByWord")} hint={t("wordByWordHint")}>
          <Switch
            checked={prefs.showWordByWord}
            onCheckedChange={(value) => prefs.set({ showWordByWord: value })}
          />
        </SettingRow>
        <button
          className="flex w-full items-center justify-between gap-4 py-3 text-start"
          onClick={() => setPicker("reciter")}
        >
          <span className="min-w-0">
            <span className="block font-semibold">{t("reciter")}</span>
            <span className="block truncate text-sm text-muted-foreground">
              {getReciter(prefs.reciterId).name[locale]}
            </span>
          </span>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground rtl:rotate-180" />
        </button>
        <SettingRow
          label={t("followRecitation")}
          hint={t("followRecitationHint")}
        >
          <Switch
            checked={prefs.followRecitation}
            onCheckedChange={(value) => prefs.set({ followRecitation: value })}
          />
        </SettingRow>
        <SettingRow label={t("autoPlayNext")} hint={t("autoPlayNextHint")}>
          <Switch
            checked={prefs.autoPlayNext}
            onCheckedChange={(value) => prefs.set({ autoPlayNext: value })}
          />
        </SettingRow>
      </section>
      <TranslationPicker
        open={picker === "translation"}
        onOpenChange={(value) => setPicker(value ? "translation" : null)}
      />
      <ReciterPicker
        open={picker === "reciter"}
        onOpenChange={(value) => setPicker(value ? "reciter" : null)}
      />
    </>
  );
}
