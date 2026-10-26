import { useState } from "react";
import { Alert, Linking, Pressable, ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { CHAPTERS, QURAN_SCRIPTS, RECITERS } from "@qiraa/core";
import { BrandMark } from "@/components/brand-mark";
import { ReadingOptions, useTranslationName } from "@/components/reader/reading-options";
import { FormRow, FormSection } from "@/components/ui/form";
import { doneButton } from "@/components/ui/header-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { downloadedChapters, recitationsSize } from "@/lib/audio/recitations";
import {
  clearDownloads,
  deleteReciterDownloads,
  downloadPageFonts,
  downloadTranslation,
  formatBytes,
  jobId,
  offlineStorageSize,
  useDownloads,
} from "@/lib/offline";
import { usePreferences, type ThemePreference } from "@/lib/preferences";
import { downloadedPageFonts, QCF_PAGES } from "@/lib/quran/fonts";
import { useThemeColors } from "@/lib/theme";

const THEMES: readonly ThemePreference[] = ["system", "light", "dark"];

export default function SettingsScreen() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const theme = usePreferences((s) => s.theme);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("settings"),
          ...doneButton(t("done"), colors.primary),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="bg-secondary/40"
        contentContainerClassName="gap-7 px-4 pb-16 pt-4"
      >
        <FormSection title={t("appearance")}>
          <View className="px-4 py-3">
            <SegmentedControl
              values={THEMES.map((value) => t(value))}
              selectedIndex={THEMES.indexOf(theme)}
              onChange={({ nativeEvent }) =>
                usePreferences.getState().set({ theme: THEMES[nativeEvent.selectedSegmentIndex] })
              }
            />
          </View>
        </FormSection>

        <FormSection title={t("language")} footer={t("languageHint")}>
          <FormRow
            label={t("changeLanguage")}
            hint={locale === "ar" ? "العربية" : "English"}
            onPress={() => Linking.openSettings()}
          />
        </FormSection>

        <ReadingOptions />

        <OfflineSection />

        <FormSection title={t("about")}>
          <View className="flex-row items-center gap-4 px-4 py-4">
            <BrandMark color={colors.primary} size={40} />
            <View className="min-w-0 flex-1">
              <Text weight="bold" className="text-lg">
                {t("appName")}
              </Text>
              <Text className="text-[13px] text-muted-foreground">
                {t("version", { version: Constants.expoConfig?.version ?? "" })}
              </Text>
            </View>
          </View>
          <Text className="px-4 py-3 text-[13px] leading-5 text-muted-foreground">{t("aboutText")}</Text>
        </FormSection>
      </ScrollView>
    </>
  );
}

function OfflineSection() {
  // Rows read the disk when they mount; remount them whenever it changes.
  const revision = useDownloads((s) => s.revision);
  return <OfflineRows key={revision} />;
}

function OfflineRows() {
  const { t, locale } = useI18n();
  const translationId = usePreferences((s) => s.translationId);
  const reciterId = usePreferences((s) => s.reciterId);
  const translationName = useTranslationName();
  const [recitations] = useState(() =>
    RECITERS.map((reciter) => ({
      reciter,
      chapters: downloadedChapters(reciter.id).length,
      bytes: recitationsSize(reciter.id),
    })),
  );
  const [used] = useState(offlineStorageSize);

  const confirm = (title: string, message: string | undefined, onConfirm: () => void) =>
    Alert.alert(title, message, [
      { text: t("cancel"), style: "cancel" },
      { text: t("delete"), style: "destructive", onPress: onConfirm },
    ]);

  return (
    <FormSection title={t("offlineSection")} footer={t("offlineIntro")}>
      <DownloadRow
        id={jobId.translation(translationId)}
        label={t("translationDownload", { name: translationName })}
        hint={t("translationDownloadHint")}
        start={() => downloadTranslation(translationId)}
      />
      {(["v2", "v1"] as const).map((version) => (
        <PageFontsRow
          key={version}
          version={version}
          label={QURAN_SCRIPTS[version === "v2" ? "qcf-v2" : "qcf-v1"].name[locale]}
          size={version === "v2" ? "210 MB" : "90 MB"}
        />
      ))}
      {/* The chosen reciter, then any other reciter with downloaded surahs. */}
      {recitations
        .filter(({ reciter, chapters }) => chapters > 0 || reciter.id === reciterId)
        .map(({ reciter, chapters, bytes }) => (
          <FormRow
            key={reciter.id}
            label={t("surahAudio", { name: reciter.name[locale] })}
            hint={
              chapters > 0
                ? t("surahsDownloaded", { n: chapters, total: CHAPTERS.length, size: formatBytes(bytes) })
                : t("surahAudioHint")
            }
          >
            {chapters > 0 && (
              <DeleteButton
                label={t("delete")}
                onPress={() =>
                  confirm(t("deleteReciterDownloads", { name: reciter.name[locale] }), undefined, () =>
                    deleteReciterDownloads(reciter.id),
                  )
                }
              />
            )}
          </FormRow>
        ))}
      <FormRow label={t("clearOffline")} hint={t("storageUsed", { used: formatBytes(used) })}>
        <DeleteButton
          label={t("clearOffline")}
          onPress={() => confirm(t("clearOffline"), t("clearOfflineHint"), clearDownloads)}
        />
      </FormRow>
    </FormSection>
  );
}

function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      className="size-9 items-center justify-center rounded-full bg-destructive/10 active:bg-destructive/20"
    >
      <Icon name="trash" color={colors.destructive} size={18} />
    </Pressable>
  );
}

function PageFontsRow({ version, label, size }: { version: "v1" | "v2"; label: string; size: string }) {
  const { t } = useI18n();
  const [done] = useState(() => downloadedPageFonts(version));
  return (
    <DownloadRow
      id={jobId.pageFonts(version)}
      label={label}
      hint={
        done > 0 && done < QCF_PAGES
          ? t("pagesDownloaded", { n: done, total: QCF_PAGES })
          : t("mushafFontsHint", { size })
      }
      complete={done >= QCF_PAGES}
      start={() => downloadPageFonts(version)}
    />
  );
}

function DownloadRow({
  id,
  label,
  hint,
  start,
  complete = false,
}: {
  id: string;
  label: string;
  hint: string;
  start: () => void;
  complete?: boolean;
}) {
  const { t } = useI18n();
  const colors = useThemeColors();
  const job = useDownloads((s) => s.jobs[id]);
  const finished = complete || job?.status === "done";
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="min-w-0 flex-1">
        <Text>{label}</Text>
        <Text className="mt-0.5 text-[13px] text-muted-foreground">
          {job?.status === "running"
            ? t("downloadingPercent", { percent: Math.floor((job.done / job.total) * 100) })
            : job?.status === "failed"
              ? t("downloadFailed")
              : hint}
        </Text>
        {job?.status === "running" && (
          <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${(job.done / job.total) * 100}%` }}
            />
          </View>
        )}
      </View>
      {finished ? (
        <Icon name="check" color={colors.primary} size={18} />
      ) : (
        <Pressable
          onPress={start}
          disabled={job?.status === "running"}
          accessibilityLabel={t("download")}
          hitSlop={8}
          className="size-9 items-center justify-center rounded-full bg-primary/10 active:bg-primary/20"
        >
          <Icon name="download" color={colors.primary} size={20} />
        </Pressable>
      )}
    </View>
  );
}
