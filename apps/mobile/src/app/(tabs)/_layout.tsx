import { View } from "react-native";
import { NativeTabs } from "expo-router/native-tabs";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "@/components/audio/mini-player";
import { useAppLifecycle } from "@/lib/app-lifecycle";
import { useAudio } from "@/lib/audio/player";
import { useI18n } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme";

/** iOS 26 docks accessories (the mini player) onto the Liquid Glass tab bar. */
const dockedAccessory = isLiquidGlassAvailable();

/** System tab bar: Liquid Glass on iOS 26+, Material 3 navigation bar on Android. */
export default function TabsLayout() {
  const { t } = useI18n();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const playerOpen = useAudio((s) => s.verseKey !== null);
  useAppLifecycle();

  return (
    <View className="flex-1">
      <NativeTabs
        tintColor={colors.primary}
        backgroundColor={colors.background}
        minimizeBehavior="onScrollDown"
      >
        {dockedAccessory && playerOpen && (
          <NativeTabs.BottomAccessory>
            <MiniPlayer />
          </NativeTabs.BottomAccessory>
        )}
        <NativeTabs.Trigger name="(home)">
          <NativeTabs.Trigger.Label>{t("home")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="quran">
          <NativeTabs.Trigger.Label>{t("quran")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} md="menu_book" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="saved">
          <NativeTabs.Trigger.Label>{t("saved")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "bookmark", selected: "bookmark.fill" }} md="bookmark" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="memorize">
          <NativeTabs.Trigger.Label>{t("memorize")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="brain.head.profile" md="psychology" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="prayer">
          <NativeTabs.Trigger.Label>{t("prayer")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} md="schedule" />
        </NativeTabs.Trigger>
      </NativeTabs>
      {!dockedAccessory && (
        // Elsewhere the player floats just above the tab bar.
        <View pointerEvents="box-none" className="absolute inset-x-0" style={{ bottom: insets.bottom + 88 }}>
          <MiniPlayer floating />
        </View>
      )}
    </View>
  );
}
