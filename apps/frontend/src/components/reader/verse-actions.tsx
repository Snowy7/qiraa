import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpenText, Check, Copy, Play, Plus, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from "@template/ui";
import {
  getChapter,
  parseVerseKey,
  wordToPlainText,
  type ReviewRating,
} from "@noor/core";
import { chapterTranslationQuery } from "@/lib/api/queries";
import { db } from "@/lib/db";
import { toggleBookmark } from "@/lib/db/bookmarks";
import { createCollection } from "@/lib/db/collections";
import { recordReview } from "@/lib/db/hifz";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { queryClient } from "@/lib/query-client";
import { chapterVersesQuery } from "@/lib/quran/data";
import { useAudio } from "@/lib/stores/audio";
import { usePreferences } from "@/lib/stores/preferences";
import { useReaderUi } from "@/lib/stores/reader-ui";
import { cn } from "@/lib/utils";

const RATINGS: readonly {
  rating: ReviewRating;
  label: MessageKey;
  className: string;
}[] = [
  {
    rating: "forgot",
    label: "forgot",
    className: "hover:border-destructive/40 hover:bg-destructive/10",
  },
  {
    rating: "shaky",
    label: "shaky",
    className: "hover:border-amber-500/40 hover:bg-amber-500/10",
  },
  {
    rating: "good",
    label: "good",
    className: "hover:border-emerald-500/40 hover:bg-emerald-500/10",
  },
  {
    rating: "solid",
    label: "solid",
    className: "hover:border-primary/40 hover:bg-primary/10",
  },
];

/** Plain Arabic (Uthmani Hafs, whatever script is shown) plus the cached translation. */
async function verseAsText(verseKey: string): Promise<string> {
  const ref = parseVerseKey(verseKey)!;
  const verses = await queryClient.ensureQueryData(
    chapterVersesQuery("qpc-hafs", ref.chapter),
  );
  const verse = verses.find((v) => v.key === verseKey);
  const arabic = verse
    ? [
        ...verse.words.map((w) => wordToPlainText(w.text)),
        verse.end?.text,
      ].join(" ")
    : "";
  const { translationId } = usePreferences.getState();
  const html = queryClient.getQueryData(
    chapterTranslationQuery(translationId, ref.chapter).queryKey,
  )?.[ref.verse - 1];
  let translation = "";
  if (html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    doc.querySelectorAll("sup").forEach((sup) => sup.remove());
    translation = doc.body.textContent?.trim() ?? "";
  }
  return [
    arabic,
    translation,
    `— ${getChapter(ref.chapter)?.nameSimple} ${verseKey}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Everything you can do with an ayah, in one sheet (from the list or the mushaf). */
export function VerseActionsSheet() {
  const { t, locale } = useI18n();
  const { sheet, verseKey, open, close } = useReaderUi();
  const isOpen = sheet === "actions" && !!verseKey;
  const ref = verseKey ? parseVerseKey(verseKey) : null;
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const [newName, setNewName] = useState("");

  const collections = useLiveQuery(
    () => db.collections.orderBy("sortOrder").toArray(),
    [],
  );
  const savedIn = useLiveQuery(
    async () =>
      new Set(
        (
          await db.bookmarks
            .where("verseKey")
            .equals(verseKey ?? "")
            .toArray()
        ).map((b) => b.collectionId),
      ),
    [verseKey],
  );

  if (!verseKey || !ref || !chapter) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(await verseAsText(verseKey));
    toast.success(t("copied"));
  };
  const share = async () => {
    const text = await verseAsText(verseKey);
    if (navigator.share) await navigator.share({ text }).catch(() => {});
    else {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    }
  };
  const rate = async (rating: ReviewRating, label: MessageKey) => {
    await recordReview(verseKey, rating);
    toast.success(t("markedAs", { key: verseKey, level: t(label) }));
    close();
  };
  const addCollection = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = await createCollection({ name, color: "#b7791f" });
    await toggleBookmark(id, verseKey);
    setNewName("");
  };

  const action = (
    icon: React.ReactNode,
    label: string,
    onClick: () => void,
  ) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl bg-secondary/70 px-2 py-3.5 text-[13px] font-semibold transition-colors hover:bg-secondary [&_svg]:size-5 [&_svg]:text-primary"
    >
      {icon}
      {label}
    </button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(value) => !value && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} ·{" "}
            {verseKey}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2">
          {action(<Play />, t("play"), () => {
            useAudio.getState().play(verseKey);
            close();
          })}
          {action(<BookOpenText />, t("tafsir"), () =>
            open("tafsir", verseKey),
          )}
          {action(<Copy />, t("copy"), copy)}
          {action(<Share2 />, t("share"), share)}
        </div>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("saveTo", { key: verseKey })}
          </h3>
          <div className="flex flex-wrap gap-2">
            {collections?.map((collection) => {
              const saved = savedIn?.has(collection.id) ?? false;
              return (
                <button
                  key={collection.id}
                  onClick={() => toggleBookmark(collection.id, verseKey)}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
                    saved
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-secondary",
                  )}
                >
                  {saved ? (
                    <Check className="size-4" />
                  ) : (
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: collection.color }}
                    />
                  )}
                  {collection.name}
                </button>
              );
            })}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addCollection();
            }}
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("newCollection")}
              className="h-10"
            />
            <Button
              type="submit"
              size="icon"
              variant="secondary"
              aria-label={t("create")}
              disabled={!newName.trim()}
            >
              <Plus />
            </Button>
          </form>
        </section>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            {t("howWellKnown", { key: verseKey })}
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map(({ rating, label, className }) => (
              <button
                key={rating}
                onClick={() => rate(rating, label)}
                className={cn(
                  "rounded-2xl border border-border py-3 text-sm font-semibold transition-colors",
                  className,
                )}
              >
                {t(label)}
              </button>
            ))}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
