import { memo } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import type { AssembledVerse, QuranScript } from "@qiraa/core";
import { VerseText } from "@/components/quran/verse-text";
import { Icon, type IconName } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useAudio, useIsReciting } from "@/lib/audio/player";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { openVerse, useReaderUi } from "@/lib/reader-ui";
import { alignedTo, htmlToText, textDirection } from "@/lib/text";
import { useThemeColors } from "@/lib/theme";

interface VerseItemProps {
  verse: AssembledVerse;
  script: QuranScript;
  quranSize: number;
  translationSize: number;
  /** Translation HTML from the API. */
  translation?: string;
  glosses?: readonly (readonly [string, string])[];
  highlighted: boolean;
}

/**
 * One ayah in verse-by-verse mode. Memoised and subscribed only to whether
 * *this* ayah is selected, so the list never re-renders as a whole.
 */
export const VerseItem = memo(function VerseItem({
  verse,
  script,
  quranSize,
  translationSize,
  translation,
  glosses,
  highlighted,
}: VerseItemProps) {
  const { t, n } = useI18n();
  const selected = useReaderUi((s) => s.selectedVerse === verse.key);
  const reciting = useIsReciting(verse.key);
  const playing = useAudio((s) => s.verseKey === verse.key && s.status === "playing");
  const togglePlay = () => {
    const audio = useAudio.getState();
    if (reciting) audio.toggle();
    else void audio.play(verse.key, { scope: "ayah" });
  };

  return (
    <Pressable
      onLongPress={() => openVerse(verse.key)}
      className={cn(
        "mx-2 rounded-[28px] px-3 pb-7 pt-4",
        reciting ? "bg-verse-highlight" : (selected || highlighted) && "bg-secondary/70",
      )}
    >
      <View className="mb-4 flex-row items-center gap-3">
        <View className="rounded-full bg-secondary px-3 py-1">
          <Text weight="bold" className="text-xs text-primary">
            {n(verse.chapter)}:{n(verse.verse)}
          </Text>
        </View>
        <View className="h-px flex-1 bg-border/70" />
        <VerseButton
          icon={playing ? "pause" : "play"}
          label={playing ? t("pause") : t("play")}
          active={reciting}
          onPress={togglePlay}
        />
        <VerseButton
          icon="tafsir"
          label={t("tafsir")}
          onPress={() => router.push({ pathname: "/tafsir/[key]", params: { key: verse.key } })}
        />
        <VerseButton icon="more" label={t("moreActions")} onPress={() => openVerse(verse.key)} />
      </View>

      <VerseText verse={verse} script={script} fontSize={quranSize} glosses={glosses} />

      {translation && (
        <Text
          className="mt-4 text-foreground/75"
          style={{
            fontSize: translationSize,
            lineHeight: translationSize * 1.65,
            ...alignedTo(textDirection(translation)),
          }}
        >
          {htmlToText(translation)}
        </Text>
      )}
    </Pressable>
  );
});

function VerseButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="size-9 items-center justify-center rounded-full active:bg-secondary"
    >
      <Icon name={icon} color={active ? colors.primary : colors.mutedForeground} size={18} />
    </Pressable>
  );
}
