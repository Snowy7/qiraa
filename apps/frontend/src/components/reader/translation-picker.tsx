import { useState } from "react";
import { Check, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@template/ui";
import { DEFAULT_TRANSLATION_ID } from "@qiraa/core";
import { useTranslationResources } from "@/lib/api/queries";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/stores/preferences";
import { cn } from "@/lib/utils";

/** Display name of the selected translation (falls back while offline). */
export function useTranslationName(): string {
  const translationId = usePreferences((s) => s.translationId);
  const resources = useTranslationResources().data;
  const match = resources?.find((r) => r.id === translationId);
  if (match) return match.name;
  return translationId === DEFAULT_TRANSLATION_ID
    ? "M.A.S. Abdel Haleem"
    : `#${translationId}`;
}

/** Searchable list of every translation quran.com offers, grouped by language. */
export function TranslationPicker({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const translationId = usePreferences((s) => s.translationId);
  const set = usePreferences((s) => s.set);
  const { data, isError } = useTranslationResources();

  const q = query.trim().toLowerCase();
  const filtered = (data ?? []).filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.languageName.toLowerCase().includes(q),
  );
  const groups = new Map<string, typeof filtered>();
  for (const resource of filtered) {
    groups.set(resource.languageName, [
      ...(groups.get(resource.languageName) ?? []),
      resource,
    ]);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[80dvh] gap-3 sm:h-[75dvh]">
        <DialogHeader>
          <DialogTitle>{t("translation")}</DialogTitle>
        </DialogHeader>
        <label className="relative block">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-10 w-full rounded-full border border-input bg-card pe-4 ps-10 text-sm outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
        </label>
        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto">
          {isError && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {t("needsConnection")}
            </p>
          )}
          {[...groups].map(([language, resources]) => (
            <div key={language} className="mb-3">
              <p className="sticky top-0 bg-popover px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {language}
              </p>
              {resources.map((resource) => {
                const selected = resource.id === translationId;
                return (
                  <button
                    key={resource.id}
                    onClick={() => {
                      set({
                        translationId: resource.id,
                        showTranslation: true,
                      });
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-start transition-colors hover:bg-secondary",
                      selected && "bg-secondary",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {resource.name}
                      </span>
                      {resource.authorName !== resource.name && (
                        <span className="block truncate text-sm text-muted-foreground">
                          {resource.authorName}
                        </span>
                      )}
                    </span>
                    {selected && <Check className="size-5 text-primary" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
