import { Text } from "react-native";
import { getChapter } from "@qiraa/core";
import { cn } from "@/lib/cn";

/**
 * Surah name in calligraphy from the SurahNames font, which draws a whole
 * name for the digits "001"–"114" and the word for "surah" for `surah`.
 */
export function SurahName({
  chapter,
  size,
  withPrefix = false,
  className,
}: {
  chapter: number;
  size: number;
  withPrefix?: boolean;
  /** Colour classes, e.g. `text-primary`. */
  className?: string;
}) {
  const code = String(chapter).padStart(3, "0");
  return (
    <Text
      accessibilityLabel={getChapter(chapter)?.nameArabic}
      allowFontScaling={false}
      className={cn("text-foreground", className)}
      style={{ fontFamily: "SurahNames", fontSize: size, lineHeight: size * 1.3 }}
    >
      {withPrefix ? `${code}surah` : code}
    </Text>
  );
}
