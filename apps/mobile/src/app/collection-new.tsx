import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { Icon } from "@/components/ui/icon";
import { SheetHeader } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { COLLECTION_COLORS, useLibrary } from "@/lib/library";
import { useThemeColors } from "@/lib/theme";

/** Creates a collection; with `verseKey`, saves that ayah into it straight away. */
export default function NewCollectionSheet() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const { verseKey } = useLocalSearchParams<{ verseKey?: string }>();
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(COLLECTION_COLORS[0]);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const library = useLibrary.getState();
    const id = library.createCollection(trimmed, color);
    if (verseKey) library.toggleBookmark(id, verseKey);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <View className="gap-5 pb-10">
      <SheetHeader title={t("newCollection")} />
      <View className="gap-2 px-6">
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {t("collectionName")}
        </Text>
        <TextInput
          autoFocus
          value={name}
          onChangeText={setName}
          onSubmitEditing={create}
          returnKeyType="done"
          placeholder={t("collectionPlaceholder")}
          placeholderTextColor={colors.mutedForeground}
          className="h-12 rounded-2xl bg-foreground/5 px-4 text-base text-foreground"
        />
      </View>
      <View className="gap-2 px-6">
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {t("color")}
        </Text>
        <View className="flex-row gap-3">
          {COLLECTION_COLORS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setColor(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected: option === color }}
              className={cn("size-10 items-center justify-center rounded-full", option === color && "border-2 border-foreground/40")}
            >
              <View className="size-7 items-center justify-center rounded-full" style={{ backgroundColor: option }}>
                {option === color && <Icon name="check" color="#fff" size={14} />}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      <Pressable
        onPress={create}
        disabled={!name.trim()}
        className={cn("mx-6 h-12 items-center justify-center rounded-full bg-primary", !name.trim() && "opacity-40")}
      >
        <Text weight="semibold" className="text-primary-foreground">
          {t("create")}
        </Text>
      </Pressable>
    </View>
  );
}
