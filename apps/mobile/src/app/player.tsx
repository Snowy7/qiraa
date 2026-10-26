import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Slider } from "@expo/ui/community/slider";
import { MenuView } from "@expo/ui/community/menu";
import { getChapter, getReciter, parseVerseKey } from "@qiraa/core";
import { PlayerButton } from "@/components/audio/mini-player";
import { SurahName } from "@/components/quran/surah-name";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { seekTo, useAudio, useAudioTime, type RepeatMode } from "@/lib/audio/player";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useThemeColors } from "@/lib/theme";

const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
const REPEATS: readonly RepeatMode[] = ["off", "verse", "surah"];

/** `m:ss`, or `h:mm:ss` for the long surahs. */
function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total / 60) % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(total % 60)}`
    : `${minutes}:${pad(total % 60)}`;
}

/** The full player: what's playing, seeking, repeat, speed and the reciter. */
export default function PlayerSheet() {
  const { t, n, locale } = useI18n();
  const colors = useThemeColors();
  const verseKey = useAudio((s) => s.verseKey);
  const status = useAudio((s) => s.status);
  const repeat = useAudio((s) => s.repeat);
  const finishedAyah = useAudio((s) => s.finishedAyah);
  const reciterId = usePreferences((s) => s.reciterId);
  const rate = usePreferences((s) => s.playbackRate);
  const ref = verseKey ? parseVerseKey(verseKey) : null;
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const audio = useAudio.getState();

  // Only the mini player opens this sheet, so there is always something playing.
  if (!ref || !chapter) return null;

  const nextRepeat = REPEATS[(REPEATS.indexOf(repeat) + 1) % REPEATS.length];
  const repeatLabel = { off: t("repeatOff"), verse: t("repeatVerse"), surah: t("repeatSurah") }[repeat];

  return (
    <View className="gap-6 px-6 pb-10 pt-8">
      <View className="flex-row items-center gap-4">
        <View className="size-16 items-center justify-center rounded-2xl bg-primary">
          <SurahName chapter={chapter.id} size={30} className="text-primary-foreground" />
        </View>
        <View className="min-w-0 flex-1">
          <Text weight="bold" numberOfLines={1} className="text-xl">
            {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {t("ayahOf", { verse: ref.verse, total: chapter.versesCount })}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push("/reciters")}
        className="flex-row items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3 active:bg-foreground/10"
      >
        <Icon name="reciter" color={colors.primary} size={18} />
        <View className="min-w-0 flex-1">
          <Text className="text-xs text-muted-foreground">{t("reciter")}</Text>
          <Text weight="semibold" numberOfLines={1}>
            {getReciter(reciterId).name[locale]}
          </Text>
        </View>
        <Icon name="forward" color={colors.mutedForeground} size={14} />
      </Pressable>

      <Progress />

      <View className="flex-row items-center justify-between" style={{ direction: "ltr" }}>
        <PlayerButton
          icon={repeat === "verse" ? "repeatOne" : "repeat"}
          label={repeatLabel}
          onPress={() => audio.setRepeat(nextRepeat)}
          className={repeat === "off" ? "opacity-40" : undefined}
        />
        <PlayerButton icon="previous" label={t("previousAyah")} size={26} onPress={audio.previous} className="size-12" />
        <Pressable
          onPress={() => (finishedAyah ? audio.continueReciting() : audio.toggle())}
          accessibilityRole="button"
          accessibilityLabel={status === "playing" ? t("pause") : t("play")}
          className="size-18 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Icon name={status === "playing" ? "pause" : "play"} color={colors.primaryForeground} size={30} />
        </Pressable>
        <PlayerButton icon="next" label={t("nextAyah")} size={26} onPress={audio.next} className="size-12" />
        <MenuView
          title={t("playbackSpeed")}
          onPressAction={({ nativeEvent }) =>
            usePreferences.getState().set({ playbackRate: Number(nativeEvent.event) })
          }
          actions={SPEEDS.map((speed) => ({
            id: String(speed),
            title: `${n(speed)}×`,
            state: speed === rate ? ("on" as const) : ("off" as const),
          }))}
        >
          <View className="h-9 min-w-9 items-center justify-center rounded-full px-1">
            <Text weight="bold" className="text-sm">
              {n(rate)}×
            </Text>
          </View>
        </MenuView>
      </View>

      <Pressable
        onPress={() => {
          audio.stop();
          router.back();
        }}
        className="flex-row items-center justify-center gap-2 py-2 active:opacity-60"
      >
        <Icon name="stop" color={colors.mutedForeground} size={14} />
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {t("stopAudio")}
        </Text>
      </Pressable>
    </View>
  );
}

function Progress() {
  const colors = useThemeColors();
  const { current, duration } = useAudioTime();
  return (
    <View style={{ direction: "ltr" }}>
      <Slider
        value={duration ? current / duration : 0}
        minimumValue={0}
        maximumValue={1}
        minimumTrackTintColor={colors.primary}
        onValueChange={seekTo}
        style={{ height: 32 }}
      />
      <View className="flex-row justify-between">
        <Text className="text-xs text-muted-foreground">{formatTime(current)}</Text>
        <Text className="text-xs text-muted-foreground">{formatTime(duration)}</Text>
      </View>
    </View>
  );
}
