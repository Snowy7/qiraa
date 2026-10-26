import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { View, type ViewProps } from "react-native";
import { withUniwind } from "uniwind";
import { cn } from "@/lib/cn";

const hasGlass = isLiquidGlassAvailable();
const StyledGlassView = withUniwind(GlassView);

interface GlassProps extends ViewProps {
  /** Reacts to touches with the glass "press" effect (iOS 26+). */
  interactive?: boolean;
}

/**
 * A floating surface: Liquid Glass on iOS 26+, a solid card with a hairline
 * border elsewhere. Shape and padding come from className.
 */
export function Glass({ interactive, className, ...props }: GlassProps) {
  if (hasGlass) {
    return (
      <StyledGlassView
        isInteractive={interactive}
        className={cn("overflow-hidden", className)}
        {...props}
      />
    );
  }
  return (
    <View
      className={cn("overflow-hidden border border-border bg-card", className)}
      {...props}
    />
  );
}
