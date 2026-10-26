import { useState } from "react";
import { ActivityIndicator, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { FlashList } from "@shopify/flash-list";
import { Icon } from "@/components/ui/icon";
import { SheetHeader } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useTranslationResources } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { useThemeColors } from "@/lib/theme";

/** Every quran.com translation, filterable by name, author or language. */
export default function TranslationsSheet() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const [query, setQuery] = useState("");
  const translationId = usePreferences((s) => s.translationId);
  const { data, isPending, isError } = useTranslationResources();
  const q = query.trim().toLowerCase();
  const matches = (data ?? []).filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.authorName.toLowerCase().includes(q) ||
      r.languageName.toLowerCase().includes(q),
  );

  return (
    <View className="flex-1">
      <SheetHeader title={t("translation")} />
      <View className="mx-6 mb-2 flex-row items-center gap-2 rounded-xl bg-foreground/5 px-3">
        <Icon name="search" color={colors.mutedForeground} size={16} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("searchTranslations")}
          placeholderTextColor={colors.mutedForeground}
          className="h-11 flex-1 text-base text-foreground"
          autoCorrect={false}
        />
      </View>
      {isPending && <ActivityIndicator className="mt-8" color={colors.primary} />}
      {isError && <Text className="px-6 py-8 text-muted-foreground">{t("needsConnection")}</Text>}
      <FlashList
        data={matches}
        keyExtractor={(r) => String(r.id)}
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              usePreferences.getState().set({ translationId: item.id, showTranslation: true });
              router.back();
            }}
            className="flex-row items-center gap-3 px-6 py-3 active:bg-foreground/5"
          >
            <View className="min-w-0 flex-1">
              <Text weight="semibold" numberOfLines={1}>
                {item.name}
              </Text>
              <Text numberOfLines={1} className="text-[13px] text-muted-foreground">
                {item.languageName} · {item.authorName}
              </Text>
            </View>
            {item.id === translationId && <Icon name="check" color={colors.primary} size={18} />}
          </Pressable>
        )}
      />
    </View>
  );
}
