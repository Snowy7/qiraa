import { Share } from "react-native";
import * as Clipboard from "expo-clipboard";
import { getChapter, parseVerseKey, wordToPlainText } from "@qiraa/core";
import { chapterTranslationQuery } from "@/lib/api";
import { currentLocale } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { getVerse } from "@/lib/quran/data";
import { queryClient } from "@/lib/query-client";
import { htmlToText } from "@/lib/text";

/** The web address of a verse, which also opens in the app (universal links). */
export function verseUrl(verseKey: string): string {
  const ref = parseVerseKey(verseKey);
  return ref ? `https://qiraa.app/quran/${ref.chapter}?verse=${ref.verse}` : "https://qiraa.app";
}

/** Plain Arabic (Uthmani Hafs, whatever script is shown), the cached translation and a reference. */
export function verseAsText(verseKey: string): string {
  const ref = parseVerseKey(verseKey);
  const chapter = ref ? getChapter(ref.chapter) : undefined;
  if (!ref || !chapter) return verseKey;
  const verse = getVerse("qpc-hafs", verseKey);
  const arabic = verse
    ? [...verse.words.map((w) => wordToPlainText(w.text)), verse.end?.text].join(" ")
    : "";
  const { translationId } = usePreferences.getState();
  const html = queryClient.getQueryData(chapterTranslationQuery(translationId, ref.chapter).queryKey)?.[
    ref.verse - 1
  ];
  const name = currentLocale() === "ar" ? chapter.nameArabic : chapter.nameSimple;
  return [arabic, html ? htmlToText(html) : "", `— ${name} ${verseKey}`].filter(Boolean).join("\n\n");
}

export async function copyVerse(verseKey: string) {
  await Clipboard.setStringAsync(verseAsText(verseKey));
}

/** Opens the system share sheet with the verse text and its link. */
export async function shareVerse(verseKey: string) {
  const url = verseUrl(verseKey);
  const text = verseAsText(verseKey);
  // iOS shares `url` as a rich link alongside the message; Android only reads `message`.
  await Share.share(process.env.EXPO_OS === "ios" ? { message: text, url } : { message: `${text}\n\n${url}` });
}
