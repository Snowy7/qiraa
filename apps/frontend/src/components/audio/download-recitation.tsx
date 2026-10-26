import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@template/ui";
import { useI18n } from "@/lib/i18n";
import { downloadChapterAudio, jobId, useDownloads } from "@/lib/offline";
import { usePreferences } from "@/lib/stores/preferences";

/** Saves every ayah of a surah, for the current reciter, for offline listening. */
export function DownloadRecitation({ chapter }: { chapter: number }) {
  const { t } = useI18n();
  const reciterId = usePreferences((s) => s.reciterId);
  const job = useDownloads((s) => s.jobs[jobId.audio(reciterId, chapter)]);

  if (job?.status === "done") {
    return (
      <span className="inline-flex h-11 items-center gap-2 px-3 text-sm font-semibold text-primary">
        <CheckCircle2 className="size-[1.15em]" /> {t("downloaded")}
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={() => downloadChapterAudio(reciterId, chapter)}
      disabled={job?.status === "running"}
    >
      {job?.status === "running" ? (
        <>
          <Loader2 className="animate-spin" />{" "}
          {t("downloading", { done: job.done, total: job.total })}
        </>
      ) : (
        <>
          <Download /> {t("downloadSurahAudio")}
        </>
      )}
    </Button>
  );
}
