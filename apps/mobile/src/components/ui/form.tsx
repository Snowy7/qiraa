import { Children, Fragment, type ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";
import { Slider } from "@expo/ui/community/slider";
import { useThemeColors } from "@/lib/theme";
import { Icon } from "./icon";
import { Text } from "./text";

/** A titled group of rows on a rounded card, like an inset grouped list. */
export function FormSection({
  title,
  footer,
  children,
}: {
  title?: string;
  footer?: string;
  children: ReactNode;
}) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="gap-2">
      {title && (
        <Text weight="semibold" className="px-4 text-[13px] uppercase tracking-wide text-muted-foreground">
          {title}
        </Text>
      )}
      <View className="overflow-hidden rounded-2xl bg-card">
        {rows.map((row, i) => (
          <Fragment key={i}>
            {i > 0 && <View className="ms-4 h-px bg-border/70" />}
            {row}
          </Fragment>
        ))}
      </View>
      {footer && <Text className="px-4 text-[13px] text-muted-foreground">{footer}</Text>}
    </View>
  );
}

export function FormRow({
  label,
  hint,
  children,
  onPress,
}: {
  label: string;
  hint?: string;
  children?: ReactNode;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const content = (
    <View className="min-h-12 flex-row items-center gap-3 px-4 py-3">
      <View className="min-w-0 flex-1">
        <Text>{label}</Text>
        {hint && <Text className="mt-0.5 text-[13px] text-muted-foreground">{hint}</Text>}
      </View>
      {children}
      {onPress && <Icon name="forward" color={colors.mutedForeground} size={14} />}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} className="active:bg-foreground/5">
      {content}
    </Pressable>
  ) : (
    content
  );
}

export function FormSwitch({
  label,
  hint,
  value,
  onValueChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const colors = useThemeColors();
  return (
    <FormRow label={label} hint={hint}>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ true: colors.primary }} />
    </FormRow>
  );
}

/** A labelled native slider showing its value as a percentage. */
export function FormScale({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="gap-1 px-4 py-3">
      <View className="flex-row items-baseline justify-between">
        <Text>{label}</Text>
        <Text className="text-sm text-muted-foreground">{Math.round(value * 100)}%</Text>
      </View>
      <Slider
        value={value}
        minimumValue={min}
        maximumValue={max}
        step={0.05}
        minimumTrackTintColor={colors.primary}
        onValueChange={(next) => onChange(Math.round(next * 100) / 100)}
        accessibilityLabel={label}
        style={{ height: 36 }}
      />
    </View>
  );
}
