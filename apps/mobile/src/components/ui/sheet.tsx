import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Icon, type IconName } from "./icon";
import { Text } from "./text";
import { useThemeColors } from "@/lib/theme";

/** Title row of a form sheet. */
export function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View className="px-6 pb-2 pt-6">
      <Text weight="bold" className="text-xl">
        {title}
      </Text>
      {subtitle && <Text className="mt-0.5 text-sm text-muted-foreground">{subtitle}</Text>}
    </View>
  );
}

/** A square action tile, laid out in a row of equal tiles. */
export function SheetAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-1 items-center gap-2 rounded-2xl bg-foreground/5 px-2 py-3.5 active:bg-foreground/10"
    >
      <Icon name={icon} color={colors.primary} size={20} />
      <Text weight="semibold" numberOfLines={1} className="text-[13px]">
        {label}
      </Text>
    </Pressable>
  );
}

export function SheetSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-2 px-6 py-3">
      {title && (
        <Text weight="semibold" className="text-sm text-muted-foreground">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}
