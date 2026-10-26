import { I18nManager, Platform } from "react-native";
import { Stack } from "expo-router";
import { fonts } from "@/components/ui/text";

/**
 * Large titles collapse on scroll, except in Arabic: react-native-screens
 * forces the bar's direction, and iOS 26 then draws large Arabic titles
 * unjoined and reversed, so RTL keeps the standard inline title.
 */
export const largeTitles = !I18nManager.isRTL;

/** Each tab keeps its own stack, with a large title that collapses on scroll. */
export function TabStack() {
  return (
    <Stack
      screenOptions={{
        headerLargeTitleEnabled: largeTitles,
        headerTransparent: Platform.OS === "ios",
        headerShadowVisible: false,
        headerLargeTitleStyle: { fontFamily: fonts.bold },
        headerTitleStyle: { fontFamily: fonts.semibold },
      }}
    />
  );
}
