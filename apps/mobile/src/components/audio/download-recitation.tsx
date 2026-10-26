import { ActivityIndicator, Pressable } from "react-native";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { downloadSurahAudio, jobId, useDownloads, useRecitationDownloaded } from "@/lib/offline";
import { usePreferences } from "@/lib/preferences";
import { useThemeColors } from "@/lib/theme";

/** Saves a surah's recitation by the chosen reciter for offline listening. */
export function DownloadRecitation({ chapter }: { chapter: number }) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const reciterId = usePreferences((s) => s.reciterId);
  const job = useDownloads((s) => s.jobs[jobId.recitation(reciterId, chapter)]);
  const downloaded = useRecitationDownloaded(reciterId, chapter);
  const running = job?.status === "running";

  return (
    <Pressable
      onPress={() => downloadSurahAudio(reciterId, chapter)}
      disabled={downloaded || running}
      accessibilityRole="button"
      className="h-11 flex-row items-center gap-2 rounded-full bg-secondary px-4 active:opacity-70"
    >
      {running ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Icon name={downloaded ? "downloaded" : "download"} color={colors.primary} size={18} />
      )}
      <Text weight="semibold" className="text-sm">
        {job?.status === "failed" ? t("downloadFailed") : downloaded ? t("downloaded") : t("download")}
      </Text>
    </Pressable>
  );
}
