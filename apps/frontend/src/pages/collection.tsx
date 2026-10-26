import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { BookOpen, Trash2, X } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@template/ui";
import { QURAN_SCRIPTS, getChapter } from "@qiraa/core";
import { EmptyState, Page, PageHeader } from "@/components/page";
import { VerseText } from "@/components/quran/verse-text";
import { db, type Bookmark } from "@/lib/db";
import { removeBookmark } from "@/lib/db/bookmarks";
import { deleteCollection } from "@/lib/db/collections";
import { useI18n } from "@/lib/i18n";
import { useVerse } from "@/lib/quran/data";
import { usePreferences } from "@/lib/stores/preferences";

export default function CollectionPage() {
  const { id = "" } = useParams();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const data = useLiveQuery(
    async () => ({
      collection: await db.collections.get(id),
      bookmarks: await db.bookmarks
        .where("collectionId")
        .equals(id)
        .sortBy("sortOrder"),
    }),
    [id],
  );

  if (data && !data.collection) {
    return (
      <EmptyState
        icon={<BookOpen />}
        title={t("collectionNotFound")}
        className="pt-32"
      />
    );
  }

  return (
    <>
      <PageHeader
        back
        title={data?.collection?.name ?? ""}
        subtitle={data && t("verseCount", { n: data.bookmarks.length })}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setConfirming(true)}
            aria-label={t("delete")}
          >
            <Trash2 />
          </Button>
        }
      />
      <Page>
        {data?.bookmarks.length === 0 && (
          <EmptyState
            icon={<BookOpen />}
            title={t("emptyCollection")}
            hint={t("noCollectionsHint")}
          />
        )}
        <div
          className="reader-scope grid grid-cols-1 gap-3 lg:grid-cols-2"
          style={{ "--quran-scale": 0.8 } as React.CSSProperties}
        >
          {data?.bookmarks.map((bookmark) => (
            <SavedVerse key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      </Page>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("deleteCollection", { name: data?.collection?.name ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("deleteCollectionHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              {t("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteCollection(id);
                navigate("/saved", { replace: true });
              }}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SavedVerse({ bookmark }: { bookmark: Bookmark }) {
  const { t, locale } = useI18n();
  const scriptId = usePreferences((s) => s.script);
  const verse = useVerse(scriptId, bookmark.verseKey).data;
  const chapter = getChapter(bookmark.chapterId);

  return (
    <article className="surface relative flex flex-col p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link
          to={`/quran/${bookmark.chapterId}?verse=${bookmark.verseNumber}`}
          className="text-sm font-semibold text-primary"
        >
          {chapter &&
            (locale === "ar" ? chapter.nameArabic : chapter.nameSimple)}{" "}
          · {bookmark.verseKey}
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => removeBookmark(bookmark.id)}
          aria-label={t("removeFromCollection")}
        >
          <X />
        </Button>
      </div>
      <Link to={`/quran/${bookmark.chapterId}?verse=${bookmark.verseNumber}`}>
        {verse ? (
          <VerseText
            verse={verse}
            script={QURAN_SCRIPTS[scriptId]}
            className="line-clamp-3"
          />
        ) : (
          <div className="h-10 animate-pulse rounded-2xl bg-foreground/[0.05]" />
        )}
      </Link>
    </article>
  );
}
