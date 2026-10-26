import { Pressable, ScrollView, View } from "react-native";
import { router } from "expo-router";
import { RECITERS } from "@qiraa/core";
import { Icon } from "@/components/ui/icon";
import { SheetHeader } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { downloadedChapters } from "@/lib/audio/recitations";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useThemeColors } from "@/lib/theme";

/** quran.com reciters; a recitation in progress continues with the new voice. */
export default function RecitersSheet() {
  const { t, n, locale } = useI18n();
  const colors = useThemeColors();
  const reciterId = usePreferences((s) => s.reciterId);
  return (
    <ScrollView contentContainerClassName="pb-10">
      <SheetHeader title={t("chooseReciter")} />
      {RECITERS.map((reciter) => {
        const downloaded = downloadedChapters(reciter.id).length;
        return (
          <Pressable
            key={reciter.id}
            onPress={() => {
              usePreferences.getState().set({ reciterId: reciter.id });
              router.back();
            }}
            className="flex-row items-center gap-3 px-6 py-3 active:bg-foreground/5"
          >
            <View className="min-w-0 flex-1">
              <Text weight="semibold">{reciter.name[locale]}</Text>
              {(reciter.style || downloaded > 0) && (
                <Text className="text-[13px] text-muted-foreground">
                  {[reciter.style?.[locale], downloaded > 0 ? `${n(downloaded)} ↓` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              )}
            </View>
            {reciter.id === reciterId && <Icon name="check" color={colors.primary} size={18} />}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
