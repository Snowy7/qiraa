import { useEffect, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Download,
  Monitor,
  Moon,
  Sun,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@template/ui";
import {
  QURAN_SCRIPTS,
  DEFAULT_SCRIPT,
  QURAN_SCRIPT_IDS,
  getReciter,
  type QuranScriptId,
} from "@qiraa/core";
import { Page, PageHeader, Segmented } from "@/components/page";
import { ReadingOptions } from "@/components/reader/reader-settings";
import { useTranslationName } from "@/components/reader/translation-picker";
import { db } from "@/lib/db";
import { useI18n } from "@/lib/i18n";
import {
  clearDownloads,
  downloadScript,
  downloadTranslation,
  formatBytes,
  jobId,
  storageUsage,
  useDownloads,
} from "@/lib/offline";
import { usePreferences } from "@/lib/stores/preferences";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h2>
      <div className="surface p-5 md:p-6">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const { t } = useI18n();
  const theme = usePreferences((s) => s.theme);
  const language = usePreferences((s) => s.language);
  const set = usePreferences((s) => s.set);

  return (
    <>
      <PageHeader title={t("settings")} width="default" />
      <Page className="grid grid-cols-1 gap-6 pb-10 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <Section title={t("appearance")}>
            <div className="space-y-5">
              <div>
                <p className="mb-2 font-semibold">{t("theme")}</p>
                <Segmented
                  className="w-full"
                  value={theme}
                  onChange={(value) => set({ theme: value })}
                  options={[
                    {
                      value: "light",
                      label: (
                        <>
                          <Sun /> {t("light")}
                        </>
                      ),
                    },
                    {
                      value: "dark",
                      label: (
                        <>
                          <Moon /> {t("dark")}
                        </>
                      ),
                    },
                    {
                      value: "system",
                      label: (
                        <>
                          <Monitor /> {t("system")}
                        </>
                      ),
                    },
                  ]}
                />
              </div>
              <div>
                <p className="mb-2 font-semibold">{t("language")}</p>
                <Segmented
                  className="w-full"
                  value={language}
                  onChange={(value) => set({ language: value })}
                  options={[
                    { value: "en", label: "English" },
                    { value: "ar", label: "العربية" },
                  ]}
                />
              </div>
            </div>
          </Section>

          <Section title={t("reading")}>
            <div className="flex flex-col gap-6">
              <ReadingOptions />
            </div>
          </Section>
        </div>

        <div className="space-y-6">
          <OfflineSection />
          <DataSection />
          <Section title={t("about")}>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              {t("aboutText")}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              {t("version", { version: __APP_VERSION__ })}
            </p>
          </Section>
        </div>
      </Page>
    </>
  );
}

function DownloadRow({
  id,
  label,
  hint,
  start,
  builtIn = false,
}: {
  id: string;
  label: string;
  hint: string;
  start: () => void;
  /** Precached with the app (see vite.config.ts), so nothing to download. */
  builtIn?: boolean;
}) {
  const { t } = useI18n();
  const job = useDownloads((s) => s.jobs[id]);
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{label}</p>
        <p className="text-sm text-muted-foreground">
          {job?.status === "running"
            ? t("downloadingPercent", {
                percent: Math.floor((job.done / job.total) * 100),
              })
            : job?.status === "failed"
              ? t("downloadFailed")
              : hint}
        </p>
        {job?.status === "running" && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${(job.done / job.total) * 100}%` }}
            />
          </div>
        )}
      </div>
      {builtIn || job?.status === "done" ? (
        <span className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <CheckCircle2 className="size-5" />{" "}
          <span className="hidden sm:inline">
            {builtIn ? t("builtIn") : t("downloaded")}
          </span>
        </span>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={start}
          disabled={job?.status === "running"}
        >
          <Download /> {t("download")}
        </Button>
      )}
    </div>
  );
}

/** Compressed download per script (layout data plus fonts), measured from the build. */
const DOWNLOAD_SIZES: Record<QuranScriptId, string> = {
  "qpc-hafs": "0.4 MB",
  tajweed: "0.5 MB",
  indopak: "0.4 MB",
  "qcf-v2": "94 MB",
  "qcf-v1": "47 MB",
};

function OfflineSection() {
  const { t, locale } = useI18n();
  const scriptId = usePreferences((s) => s.script);
  const translationId = usePreferences((s) => s.translationId);
  const reciterId = usePreferences((s) => s.reciterId);
  const translationName = useTranslationName();
  const jobs = useDownloads((s) => s.jobs);
  const [usage, setUsage] = useState<number | null>(null);

  useEffect(() => {
    storageUsage().then(setUsage);
  }, [jobs]);

  // The current script first, then any others the user may switch to.
  const scripts = [
    scriptId,
    ...QURAN_SCRIPT_IDS.filter((id) => id !== scriptId),
  ];

  return (
    <Section title={t("offlineSection")}>
      <p className="text-[15px] text-muted-foreground">{t("offlineIntro")}</p>
      {usage !== null && (
        <p className="mt-1 text-sm text-muted-foreground">
          {t("storageUsed", { used: formatBytes(usage) })}
        </p>
      )}
      <div className="mt-2 divide-y divide-border/60">
        <DownloadRow
          id={jobId.translation(translationId)}
          label={t("translationDownload", { name: translationName })}
          hint={t("translationDownloadHint")}
          start={() => downloadTranslation(translationId)}
        />
        {scripts.map((id) => (
          <DownloadRow
            key={id}
            id={jobId.script(id)}
            label={QURAN_SCRIPTS[id].name[locale]}
            hint={t("scriptDownloadHint", { size: DOWNLOAD_SIZES[id] })}
            builtIn={id === DEFAULT_SCRIPT}
            start={() => downloadScript(id)}
          />
        ))}
        <div className="py-3">
          <p className="font-semibold">
            {t("surahAudio", { name: getReciter(reciterId).name[locale] })}
          </p>
          <p className="text-sm text-muted-foreground">{t("surahAudioHint")}</p>
        </div>
      </div>
    </Section>
  );
}

function DataSection() {
  const { t } = useI18n();

  const exportBackup = async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      collections: await db.collections.toArray(),
      bookmarks: await db.bookmarks.toArray(),
      hifzProgress: await db.hifzProgress.toArray(),
      readingHistory: await db.readingHistory.toArray(),
      preferences: JSON.parse(
        localStorage.getItem("qiraa-preferences") ?? "{}",
      ),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
    );
    const link = Object.assign(document.createElement("a"), {
      href: url,
      download: `qiraa-backup-${new Date().toISOString().slice(0, 10)}.json`,
    });
    link.click();
    URL.revokeObjectURL(url);
    toast.success(t("dataExported"));
  };

  return (
    <Section title={t("data")}>
      <div className="divide-y divide-border/60">
        <button
          onClick={exportBackup}
          className="flex w-full items-center gap-4 py-3 text-start"
        >
          <Download className="size-5 text-primary" />
          <span>
            <span className="block font-semibold">{t("exportData")}</span>
            <span className="text-sm text-muted-foreground">
              {t("exportDataHint")}
            </span>
          </span>
        </button>
        <button
          onClick={async () => {
            await clearDownloads();
            toast.success(t("offlineCleared"));
          }}
          className="flex w-full items-center gap-4 py-3 text-start"
        >
          <Trash2 className="size-5 text-destructive" />
          <span>
            <span className="block font-semibold">{t("clearOffline")}</span>
            <span className="text-sm text-muted-foreground">
              {t("clearOfflineHint")}
            </span>
          </span>
        </button>
      </div>
    </Section>
  );
}
