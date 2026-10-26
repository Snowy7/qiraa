import { Text as NativeText, type TextProps as NativeTextProps } from "react-native";
import { cn } from "@/lib/cn";
import { currentLocale, type Locale } from "@/lib/i18n";

export type TextWeight = "regular" | "medium" | "semibold" | "bold";

// Font files embedded by the expo-font plugin (app.json), named by PostScript name.
const FAMILIES: Record<Locale, Record<TextWeight, string>> = {
  en: {
    regular: "Figtree-Regular",
    medium: "Figtree-Medium",
    semibold: "Figtree-SemiBold",
    bold: "Figtree-Bold",
  },
  ar: {
    regular: "Almarai-Regular",
    medium: "Almarai-Regular",
    semibold: "Almarai-Bold",
    bold: "Almarai-ExtraBold",
  },
};

// The UI language only changes with an app restart, so resolve it once.
/** UI font families for the app language, by weight (also used by native headers). */
export const fonts = FAMILIES[currentLocale()];

// Letter spacing pulls joined Arabic letters apart, so tracking classes only apply in English.
const arabicSpacing = currentLocale() === "ar" ? { letterSpacing: 0 } : undefined;

export interface TextProps extends NativeTextProps {
  weight?: TextWeight;
}

/** UI text in Figtree (Almarai for Arabic) at a weight; colour and size via className. */
export function Text({ weight = "regular", className, style, ...props }: TextProps) {
  return (
    <NativeText
      {...props}
      className={cn("text-base text-foreground", className)}
      style={[{ fontFamily: fonts[weight] }, style, arabicSpacing]}
    />
  );
}
