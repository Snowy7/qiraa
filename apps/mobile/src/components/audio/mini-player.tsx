import { ActivityIndicator, Pressable, View } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { getChapter, getReciter, parseVerseKey } from "@qiraa/core";
import { Glass } from "@/components/ui/glass";
import { Icon, type IconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAudio, useAudioTime } from "@/lib/audio/player";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useThemeColors } from "@/lib/theme";

/**
 * The recitation in progress: surah and ayah, reciter, play/pause and next.
 * Tapping it opens the full player. Renders nothing when nothing is playing.
 */
export function MiniPlayer({ floating = false }: { floating?: boolean }) {
  const { t, n, locale } = useI18n();
  const colors = useThemeColors();
  const verseKey = useAudio((s) => s.verseKey);
  const status = useAudio((s) => s.status);
  const finishedAyah = useAudio((s) => s.finishedAyah);
  const reciterId = usePreferences((s) => s.reciterId);
  const ref = verseKey ? parseVerseKey(verseKey) : null;
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  if (!ref || !chapter) return null;

  const playing = status === "playing";
  const content = (
    <Pressable
      onPress={() => router.push("/player")}
      accessibilityLabel={t("nowPlaying")}
      className="flex-row items-center gap-3 px-4 py-2"
    >
      <View className="min-w-0 flex-1">
        <Text weight="semibold" numberOfLines={1} className="text-[15px]">
          {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} · {n(ref.verse)}
        </Text>
        {/* Play retries after a failure. */}
        <Text numberOfLines={1} className={cn("text-xs", status === "error" ? "text-destructive" : "text-muted-foreground")}>
          {status === "error" ? t("audioFailed") : getReciter(reciterId).name[locale]}
        </Text>
      </View>
      {status === "loading" ? (
        <ActivityIndicator color={colors.foreground} style={{ width: 36 }} />
      ) : (
        <PlayerButton
          icon={playing ? "pause" : "play"}
          label={playing ? t("pause") : t("play")}
          onPress={() => (finishedAyah ? useAudio.getState().continueReciting() : useAudio.getState().toggle())}
        />
      )}
      <PlayerButton icon="next" label={t("nextAyah")} onPress={() => useAudio.getState().next()} />
    </Pressable>
  );

  if (!floating) return content;
  return (
    <Glass interactive className="mx-3 rounded-full">
      {content}
      <Progress />
    </Glass>
  );
}

function Progress() {
  const { current, duration } = useAudioTime();
  return (
    <View className="absolute inset-x-6 bottom-0 h-0.5 overflow-hidden rounded-full bg-foreground/10">
      <View className="h-full bg-primary" style={{ width: `${duration ? (current / duration) * 100 : 0}%` }} />
    </View>
  );
}

export function PlayerButton({
  icon,
  label,
  onPress,
  size = 22,
  className,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  size?: number;
  className?: string;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className={cn("size-9 items-center justify-center rounded-full active:bg-foreground/10", className)}
    >
      <Icon name={icon} color={colors.foreground} size={size} />
    </Pressable>
  );
}
