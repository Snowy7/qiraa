import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MiniPlayer } from "./mini-player";

/** The mini player floating over a reader, `lift` points above the bottom edge. */
export function ReaderPlayer({ lift = 0 }: { lift?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0"
      style={{ bottom: Math.max(insets.bottom, 12) + lift }}
    >
      <MiniPlayer floating />
    </View>
  );
}
