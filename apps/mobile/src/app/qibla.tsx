import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { qiblaDirection } from "@qiraa/core";
import { PrayerHero } from "@/components/prayer/prayer-hero";
import { doneButton } from "@/components/ui/header-buttons";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { usePrayerLocation } from "@/lib/prayer/location";
import { useThemeColors } from "@/lib/theme";

const DIAL = 300;
/** Within this many degrees the phone counts as facing the Qibla. */
const ALIGNED = 4;

/** Shortest signed turn from `from` to `to`, in degrees (-180, 180]. */
function turn(from: number, to: number) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * A compass whose arrow points to the Kaaba, from the device heading. A
 * haptic tap marks the moment the phone lines up with the Qibla.
 */
export default function QiblaScreen() {
  const { t, n } = useI18n();
  const colors = useThemeColors();
  const location = usePrayerLocation((s) => s.location);
  const [heading, setHeading] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const rotation = useSharedValue(0);
  const wasAligned = useRef(false);
  const bearing = location ? qiblaDirection(location) : null;

  useEffect(() => {
    let subscription: Location.LocationSubscription | undefined;
    const timer = setTimeout(() => setUnavailable(true), 4000);
    Location.watchHeadingAsync((value) => {
      const degrees = value.trueHeading >= 0 ? value.trueHeading : value.magHeading;
      clearTimeout(timer);
      setUnavailable(false);
      setHeading(degrees);
    })
      .then((s) => {
        subscription = s;
      })
      .catch(() => setUnavailable(true));
    return () => {
      clearTimeout(timer);
      subscription?.remove();
    };
  }, []);

  // The dial turns against the heading so north stays north; spring the
  // shortest way round so 359° → 1° doesn't spin the whole dial.
  useEffect(() => {
    if (heading === null) return;
    const target = rotation.value + turn(rotation.value, -heading);
    rotation.value = withSpring(target, { damping: 20, stiffness: 120 });
  }, [heading, rotation]);

  const offset = heading !== null && bearing !== null ? turn(heading, bearing) : null;
  const aligned = offset !== null && Math.abs(offset) <= ALIGNED;
  useEffect(() => {
    if (aligned && !wasAligned.current) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    wasAligned.current = aligned;
  }, [aligned]);

  const dialStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));

  return (
    <>
      <Stack.Screen
        options={{
          title: t("qibla"),
          ...doneButton(t("done"), colors.primary),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="bg-background"
        contentContainerClassName="items-center gap-8 px-6 pb-12 pt-6"
      >
        {bearing === null ? (
          <View className="w-full">
            <PrayerHero showDay={false} />
          </View>
        ) : (
          <>
            <Text weight="bold" className={aligned ? "text-2xl text-primary" : "text-2xl"}>
              {aligned ? t("qiblaAligned") : t("qiblaBearing", { degrees: n(Math.round(bearing)) })}
            </Text>

            <View style={{ width: DIAL, height: DIAL }}>
              <Animated.View style={[{ width: DIAL, height: DIAL }, dialStyle]}>
                <Svg width={DIAL} height={DIAL} viewBox="0 0 300 300">
                  <Circle cx={150} cy={150} r={140} fill={colors.card} stroke={colors.border} strokeWidth={2} />
                  {Array.from({ length: 72 }, (_, i) => (
                    <Line
                      key={i}
                      x1={150}
                      y1={14}
                      x2={150}
                      y2={i % 18 === 0 ? 30 : i % 2 === 0 ? 24 : 20}
                      stroke={i === 0 ? colors.destructive : colors.mutedForeground}
                      strokeWidth={i % 18 === 0 ? 3 : 1}
                      transform={`rotate(${i * 5} 150 150)`}
                    />
                  ))}
                  {(["N", "E", "S", "W"] as const).map((label, i) => (
                    <SvgText
                      key={label}
                      x={150}
                      y={50}
                      fontSize={16}
                      fontWeight="700"
                      fill={i === 0 ? colors.destructive : colors.foreground}
                      textAnchor="middle"
                      transform={`rotate(${i * 90} 150 150)`}
                    >
                      {label}
                    </SvgText>
                  ))}
                  {/* The Qibla needle, fixed to the dial at the Kaaba's bearing. */}
                  <G transform={`rotate(${bearing} 150 150)`}>
                    <Path d="M150 62 L163 150 L150 140 L137 150 Z" fill={aligned ? colors.primary : colors.accent} />
                    <Path d="M141 44 h18 v16 h-18 Z" fill={colors.foreground} />
                    <Path d="M141 50 h18" stroke={colors.accent} strokeWidth={2} />
                  </G>
                  <Circle cx={150} cy={150} r={7} fill={colors.foreground} />
                </Svg>
              </Animated.View>
              {/* Fixed marker: the direction the phone points. */}
              <View className="absolute inset-x-0 -top-3 items-center">
                <View className={aligned ? "h-6 w-1.5 rounded-full bg-primary" : "h-6 w-1.5 rounded-full bg-foreground/40"} />
              </View>
            </View>

            <Text className="max-w-72 text-center text-muted-foreground">
              {unavailable && heading === null ? t("compassUnavailable") : t("qiblaHint")}
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}
