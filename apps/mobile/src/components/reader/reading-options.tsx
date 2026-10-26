import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { DEFAULT_TRANSLATION_ID, QURAN_SCRIPTS, QURAN_SCRIPT_IDS, type QuranScriptId } from "@qiraa/core";
import { VerseText } from "@/components/quran/verse-text";
import { FormRow, FormScale, FormSection, FormSwitch } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useTranslationResources } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { usePreferences, type MushafLayout } from "@/lib/preferences";
import { getChapterVerses } from "@/lib/quran/data";
import { useThemeColors } from "@/lib/theme";

const LAYOUTS: readonly MushafLayout[] = ["scroll", "pages"];

/** Script, layout, text sizes and translation options (reader sheet and Settings). */
export function ReadingOptions() {
  const { t } = useI18n();
  const prefs = usePreferences();
  const translationName = useTranslationName();

  return (
    <View className="gap-6">
      <FormSection title={t("quranScript")}>
        {QURAN_SCRIPT_IDS.map((id) => (
          <ScriptOption key={id} id={id} selected={prefs.script === id} />
        ))}
      </FormSection>

      <FormSection title={t("mushafLayout")}>
        <View className="px-4 py-3">
          <SegmentedControl
            values={[t("scrollLayout"), t("pagesLayout")]}
            selectedIndex={LAYOUTS.indexOf(prefs.mushafLayout)}
            onChange={({ nativeEvent }) =>
              prefs.set({ mushafLayout: LAYOUTS[nativeEvent.selectedSegmentIndex] })
            }
          />
        </View>
      </FormSection>

      <FormSection>
        <FormScale
          label={t("quranTextSize")}
          value={prefs.quranTextScale}
          min={0.8}
          max={1.6}
          onChange={(value) => prefs.set({ quranTextScale: value })}
        />
        <FormScale
          label={t("translationTextSize")}
          value={prefs.translationTextScale}
          min={0.85}
          max={1.4}
          onChange={(value) => prefs.set({ translationTextScale: value })}
        />
      </FormSection>

      <FormSection>
        <FormSwitch
          label={t("showTranslation")}
          value={prefs.showTranslation}
          onValueChange={(value) => prefs.set({ showTranslation: value })}
        />
        <FormRow label={t("translation")} hint={translationName} onPress={() => router.push("/translations")} />
        <FormSwitch
          label={t("wordByWord")}
          hint={t("wordByWordHint")}
          value={prefs.showWordByWord}
          onValueChange={(value) => prefs.set({ showWordByWord: value })}
        />
        <FormSwitch
          label={t("keepScreenOn")}
          hint={t("keepScreenOnHint")}
          value={prefs.keepAwake}
          onValueChange={(value) => prefs.set({ keepAwake: value })}
        />
      </FormSection>
    </View>
  );
}

/** A script with Al-Ikhlas 112:1 rendered in it as a live preview. */
function ScriptOption({ id, selected }: { id: QuranScriptId; selected: boolean }) {
  const { locale } = useI18n();
  const colors = useThemeColors();
  const script = QURAN_SCRIPTS[id];
  return (
    <Pressable
      onPress={() => usePreferences.getState().set({ script: id })}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      className={cn("gap-2 px-4 py-4 active:bg-foreground/5", selected && "bg-primary/5")}
    >
      <VerseText verse={getChapterVerses(id, 112)[0]} script={script} fontSize={22} align="center" />
      <View className="flex-row items-center gap-2">
        <View className="min-w-0 flex-1">
          <Text weight="semibold">{script.name[locale]}</Text>
          <Text className="text-[13px] text-muted-foreground">{script.description[locale]}</Text>
        </View>
        {selected && <Icon name="check" color={colors.primary} size={18} />}
      </View>
    </Pressable>
  );
}

/** Display name of the chosen translation (falls back to its id offline). */
export function useTranslationName(): string {
  const translationId = usePreferences((s) => s.translationId);
  const resource = useTranslationResources().data?.find((r) => r.id === translationId);
  if (resource) return resource.name;
  return translationId === DEFAULT_TRANSLATION_ID ? "M.A.S. Abdel Haleem" : `#${translationId}`;
}
