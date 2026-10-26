import Svg, { Circle, G, Path } from "react-native-svg";
import type { ColorValue } from "react-native";

/**
 * The Qiraa mark: a pointed medallion like the ornaments in a mushaf's
 * margins. The app icon and splash are drawn from the same shape.
 */
export function BrandMark({ color, size = 32 }: { color: ColorValue; size?: number }) {
  return (
    <Svg viewBox="0 0 512 512" width={size} height={size}>
      <G
        fill="none"
        stroke={color}
        strokeWidth={30}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Path d="M256 34C308 78 356 123 400 158C421 176 428 212 428 256C428 300 421 336 400 354C356 389 308 434 256 478C204 434 156 389 112 354C91 336 84 300 84 256C84 212 91 176 112 158C156 123 204 78 256 34Z" />
        <Circle cx="256" cy="256" r="64" />
        <Path d="M280 197L324 93M315 232L419 189M315 280L419 323M280 315L324 419M232 315L188 419M197 280L93 323M197 232L93 189M232 197L188 93" />
      </G>
    </Svg>
  );
}

/** Mosque skyline drawn behind hero cards; scales to its width. */
export function MosqueSkyline({ color, width, opacity = 1 }: {
  color: ColorValue;
  width: number;
  opacity?: number;
}) {
  return (
    <Svg
      viewBox="0 0 400 100"
      width={width}
      height={width / 4}
      preserveAspectRatio="xMidYMax meet"
      fill={color}
      opacity={opacity}
    >
      <Path d="M150 88V66q0-36 50-44 50 8 50 44v22Z" />
      <Path d="M198.5 22V9h3v13Z" />
      <Path d="M200 0a5 5 0 1 0 4.2 7.7A4 4 0 1 1 200 0Z" />
      <Path d="M95 88V72q0-17 25-22 25 5 25 22v16Zm160 0V72q0-17 25-22 25 5 25 22v16Z" />
      <Path d="M118.8 50v-9h2.4v9Zm160 0v-9h2.4v9Z" />
      <Path d="M60 88V40l6-12 6 12v48Zm268 0V40l6-12 6 12v48Z" />
      <Path d="M56 50h20v4H56Zm268 0h20v4h-20Z" />
      <Path d="M25 88V58l4-8 4 8v30Zm342 0V58l4-8 4 8v30Z" />
      <Path d="M0 86h400v14H0Z" />
    </Svg>
  );
}
