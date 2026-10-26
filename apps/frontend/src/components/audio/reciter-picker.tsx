import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@template/ui";
import { RECITERS } from "@noor/core";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";

/** Reciter list; picking one switches playback immediately. */
export function ReciterPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useI18n();
  const reciterId = usePreferences((s) => s.reciterId);
  const set = usePreferences((s) => s.set);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chooseReciter")}</DialogTitle>
        </DialogHeader>
        <div className="-mx-2 flex max-h-[60dvh] flex-col overflow-y-auto">
          {RECITERS.map((reciter) => {
            const selected = reciter.id === reciterId;
            return (
              <button
                key={reciter.id}
                onClick={() => {
                  set({ reciterId: reciter.id });
                  onOpenChange(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors hover:bg-secondary",
                  selected && "bg-secondary",
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {reciter.name[locale]}
                  </span>
                  {reciter.style && (
                    <span className="text-sm text-muted-foreground">
                      {reciter.style[locale]}
                    </span>
                  )}
                </span>
                {selected && <Check className="size-5 text-primary" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
