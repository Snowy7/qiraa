import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { Bookmark, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@template/ui";
import { EmptyState, Page, PageHeader } from "@/components/page";
import { db } from "@/lib/db";
import { createCollection } from "@/lib/db/collections";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const COLORS = [
  "#b7791f",
  "#d9488b",
  "#3b82f6",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#0d9488",
  "#64748b",
];

export default function SavedPage() {
  const { t } = useI18n();
  const [creating, setCreating] = useState(false);
  const data = useLiveQuery(async () => {
    const [collections, bookmarks] = await Promise.all([
      db.collections.orderBy("sortOrder").toArray(),
      db.bookmarks.toArray(),
    ]);
    const counts = new Map<string, number>();
    for (const b of bookmarks)
      counts.set(b.collectionId, (counts.get(b.collectionId) ?? 0) + 1);
    return { collections, counts, total: bookmarks.length };
  }, []);

  return (
    <>
      <PageHeader
        title={t("saved")}
        subtitle={t("collections")}
        actions={
          <Button
            onClick={() => setCreating(true)}
            size="sm"
            className="md:h-11 md:px-5 md:text-sm"
          >
            <Plus />{" "}
            <span className="hidden sm:inline">{t("newCollection")}</span>
          </Button>
        }
      />
      <Page>
        {data && data.total === 0 && (
          <EmptyState
            icon={<Bookmark />}
            title={t("noCollections")}
            hint={t("noCollectionsHint")}
          />
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.collections.map((collection) => (
            <Link
              key={collection.id}
              to={`/saved/${collection.id}`}
              className="surface group flex items-center gap-4 p-5 transition-colors hover:bg-secondary/40"
            >
              <span
                className="flex size-12 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: `${collection.color}1f`,
                  color: collection.color,
                }}
              >
                <Bookmark className="size-5 fill-current" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[17px] font-semibold">
                  {collection.name}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("verseCount", { n: data.counts.get(collection.id) ?? 0 })}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Page>
      <CreateCollectionDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}

function CreateCollectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const submit = async () => {
    if (!name.trim()) return;
    await createCollection({ name: name.trim(), color });
    setName("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newCollection")}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t("collectionName")}</span>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("collectionPlaceholder")}
            />
          </label>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("color")}</legend>
            <div className="flex flex-wrap gap-2.5">
              {COLORS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-label={value}
                  aria-pressed={color === value}
                  onClick={() => setColor(value)}
                  className={cn(
                    "size-9 rounded-full outline-offset-2 transition-transform",
                    color === value
                      ? "scale-110 outline outline-2"
                      : "hover:scale-105",
                  )}
                  style={{ background: value, outlineColor: value }}
                />
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim()}>
              {t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
