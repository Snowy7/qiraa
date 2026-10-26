import { useEffect } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { MenuView } from "@expo/ui/community/menu";
import { TAFSIRS, getChapter, parseVerseKey } from "@qiraa/core";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTafsirId, useVerseTafsir } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useReaderUi } from "@/lib/reader-ui";
import { alignedTo, htmlToBlocks, textDirection } from "@/lib/text";
import { useThemeColors } from "@/lib/theme";

/** Commentary on an ayah, with a menu to pick the tafsir. */
export default function TafsirSheet() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const { key = "" } = useLocalSearchParams<{ key: string }>();
  const ref = parseVerseKey(key);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  const tafsirId = useTafsirId();
  const tafsir = useVerseTafsir(key);
  const current = TAFSIRS.find((entry) => entry.id === tafsirId);

  useEffect(() => {
    useReaderUi.setState({ selectedVerse: key });
    return () => useReaderUi.setState({ selectedVerse: null });
  }, [key]);

  return (
    <ScrollView contentContainerClassName="px-6 pb-12 pt-6">
      <Text weight="bold" className="text-xl">
        {t("tafsir")} · {chapter ? (locale === "ar" ? chapter.nameArabic : chapter.nameSimple) : ""} {key}
      </Text>
      <MenuView
        title={t("tafsir")}
        onPressAction={({ nativeEvent }) =>
          usePreferences.getState().set({ tafsirId: Number(nativeEvent.event) })
        }
        actions={(["en", "ar"] as const).map((language) => ({
          id: language,
          title: language === "ar" ? "العربية" : "English",
          displayInline: true,
          subactions: TAFSIRS.filter((entry) => entry.language === language).map((entry) => ({
            id: String(entry.id),
            title: entry.name,
            state: entry.id === tafsirId ? ("on" as const) : ("off" as const),
          })),
        }))}
      >
        <View className="mt-2 flex-row items-center gap-1 self-start rounded-full bg-foreground/5 px-3 py-1.5">
          <Text weight="semibold" className="text-sm text-primary">
            {current?.name ?? tafsir.data?.resourceName ?? ""}
          </Text>
          <Icon name="forward" color={colors.primary} size={12} />
        </View>
      </MenuView>

      <View className="mt-5 gap-3">
        {tafsir.isPending && <ActivityIndicator color={colors.primary} />}
        {tafsir.isError && <Text className="text-muted-foreground">{t("needsConnection")}</Text>}
        {tafsir.data &&
          htmlToBlocks(tafsir.data.html).map((block, i) => (
            <Text
              key={i}
              weight={block.kind === "heading" ? "semibold" : "regular"}
              className={block.kind === "heading" ? "mt-2 text-base" : "text-base leading-7 text-foreground/85"}
              style={alignedTo(textDirection(block.text))}
            >
              {block.text}
            </Text>
          ))}
      </View>
    </ScrollView>
  );
}
