import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { Button } from "@template/ui";
import { useI18n } from "@/lib/i18n";
import {
  downloadChapterAudio,
  formatBytes,
  jobId,
  useDownloads,
} from "@/lib/offline";
import { recitationQuery } from "@/lib/stores/audio";
import { usePreferences } from "@/lib/stores/preferences";

/** Saves a surah's recitation (current reciter) for offline listening. */
export function DownloadRecitation({ chapter }: { chapter: number }) {
  const { t } = useI18n();
  const reciterId = usePreferences((s) => s.reciterId);
  const job = useDownloads((s) => s.jobs[jobId.audio(reciterId, chapter)]);
  const size = useQuery(recitationQuery(reciterId, chapter)).data?.sizeBytes;

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
          <Loader2 className="animate-spin" />
          {t("downloadingPercent", {
            percent: Math.floor((job.done / job.total) * 100),
          })}
        </>
      ) : (
        <>
          <Download /> {t("downloadSurahAudio")}
          {size ? (
            <span className="font-medium text-muted-foreground">
              {formatBytes(size)}
            </span>
          ) : null}
        </>
      )}
    </Button>
  );
}
