import "../global.css";
import { useEffect, useMemo } from "react";
import { Stack, ThemeProvider, DarkTheme, DefaultTheme, type Theme } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { QueryClientProvider } from "@tanstack/react-query";
import { useUniwind } from "uniwind";
import { largeTitles } from "@/components/tab-stack";
import { fonts } from "@/components/ui/text";
import { usePreferences } from "@/lib/preferences";
import { queryClient } from "@/lib/query-client";
import { applyTheme, useThemeColors } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();
applyTheme(usePreferences.getState().theme);

/** A sheet that sizes to its content, with the native grabber. */
const sheet = {
  presentation: "formSheet",
  sheetAllowedDetents: "fitToContents",
  sheetGrabberVisible: true,
  headerShown: false,
} as const;

export default function RootLayout() {
  // Quran fonts load under the family names @qiraa/core's scripts use.
  const [fontsLoaded] = useFonts({
    UthmanicHafs: require("../../assets/fonts/UthmanicHafs.ttf"),
    IndoPak: require("../../assets/fonts/IndoPak.ttf"),
    SurahNames: require("../../assets/fonts/SurahNames.ttf"),
  });
  const theme = usePreferences((s) => s.theme);
  const colors = useThemeColors();
  const dark = useUniwind().theme === "dark";

  useEffect(() => applyTheme(theme), [theme]);
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  const navigationTheme = useMemo<Theme>(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.foreground,
        border: colors.border,
      },
    };
  }, [dark, colors]);

  if (!fontsLoaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerBackButtonDisplayMode: "minimal",
            headerShadowVisible: false,
            headerTitleStyle: { fontFamily: fonts.semibold },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false, title: "Qiraa" }} />
          <Stack.Screen name="quran/[chapter]" />
          <Stack.Screen name="mushaf/[page]" />
          <Stack.Screen name="settings" options={{ presentation: "modal" }} />
          <Stack.Screen name="word/[key]" options={sheet} />
          <Stack.Screen name="verse/[key]" options={sheet} />
          <Stack.Screen
            name="tafsir/[key]"
            options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }}
          />
          <Stack.Screen
            name="reader-settings"
            options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }}
          />
          <Stack.Screen name="translations" options={{ ...sheet, sheetAllowedDetents: [0.8, 1] }} />
          <Stack.Screen name="player" options={sheet} />
          <Stack.Screen name="collection-new" options={sheet} />
          <Stack.Screen
            name="search"
            options={{ headerLargeTitleEnabled: largeTitles, headerTransparent: process.env.EXPO_OS === "ios" }}
          />
          <Stack.Screen name="memorize/review" options={{ presentation: "fullScreenModal", headerShown: false }} />
          <Stack.Screen name="qibla" options={{ presentation: "modal" }} />
          <Stack.Screen name="reciters" options={{ ...sheet, sheetAllowedDetents: [0.6, 1] }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
