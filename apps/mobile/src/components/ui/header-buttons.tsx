import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { ICONS, Icon, type IconName } from "./icon";
import { Text } from "./text";

export interface HeaderButton {
  icon: IconName;
  /** Accessibility label (iOS shows the icon only). */
  label: string;
  onPress: () => void;
}

/**
 * Stack screen options for header buttons: native bar button items on iOS
 * (grouped in Liquid Glass on iOS 26), plain icon buttons on Android.
 */
export function headerButtons(buttons: readonly HeaderButton[], tint: string) {
  return {
    unstable_headerRightItems: () =>
      buttons.map((button) => ({
        type: "button" as const,
        label: button.label,
        icon: { type: "sfSymbol" as const, name: ICONS[button.icon].ios },
        onPress: button.onPress,
      })),
    headerRight: () => (
      <View className="flex-row gap-3">
        {buttons.map((button) => (
          <Pressable
            key={button.icon}
            onPress={button.onPress}
            accessibilityRole="button"
            accessibilityLabel={button.label}
            hitSlop={8}
          >
            <Icon name={button.icon} color={tint} size={22} />
          </Pressable>
        ))}
      </View>
    ),
  };
}

/** Closes a modal: the native "Done" item on iOS, a text button on Android. */
export function doneButton(label: string, tint: string) {
  const close = () => router.back();
  return {
    headerLeft: () => null,
    unstable_headerRightItems: () => [
      { type: "button" as const, label, variant: "done" as const, tintColor: tint, onPress: close },
    ],
    headerRight: () => (
      <Pressable onPress={close} accessibilityRole="button" hitSlop={8}>
        <Text weight="semibold" style={{ color: tint }}>
          {label}
        </Text>
      </Pressable>
    ),
  };
}
