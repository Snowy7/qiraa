import { useEffect } from "react";
import { Text as NativeText, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { QURAN_SCRIPTS } from "@qiraa/core";
import { WordText } from "@/components/quran/word-text";
import { SheetAction } from "@/components/ui/sheet";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/lib/i18n";
import { usePreferences } from "@/lib/preferences";
import { getVerse, getWordByWord } from "@/lib/quran/data";
import { useScriptFonts } from "@/lib/quran/fonts";
import { playWord, useAudio } from "@/lib/audio/player";
import { useReaderUi } from "@/lib/reader-ui";

/** A tapped word: the word large, its meaning and transliteration, and what to do next. */
export default function WordSheet() {
  const { t } = useI18n();
  const { key = "" } = useLocalSearchParams<{ key: string }>();
  const [chapter, verseNumber, position] = key.split(":").map(Number);
  const verseKey = `${chapter}:${verseNumber}`;
  const scriptId = usePreferences((s) => s.script);
  const script = QURAN_SCRIPTS[scriptId];
  const word = getVerse(scriptId, verseKey)?.words[position - 1];
  const fontFamily = useScriptFonts(script, word ? [word.page] : [])(word?.page ?? 0);
  const gloss = getWordByWord(chapter)[verseKey]?.[position - 1];

  // The word stays highlighted on the page until the sheet closes.
  useEffect(() => () => useReaderUi.setState({ selectedWord: null }), []);

  return (
    <View className="gap-5 px-6 pb-10 pt-8">
      <View className="items-center gap-1">
        {word && fontFamily && (
          <NativeText
            allowFontScaling={false}
            className="text-quran-ink"
            style={{ fontFamily, fontSize: 52 * script.sizeAdjust, lineHeight: 52 * script.sizeAdjust * 1.8 }}
          >
            <WordText word={word.text} />
          </NativeText>
        )}
        {gloss && (
          <>
            <Text weight="semibold" className="text-center text-lg">
              {gloss[0]}
            </Text>
            {gloss[1] && <Text className="text-center italic text-muted-foreground">{gloss[1]}</Text>}
          </>
        )}
        <Text className="mt-1 text-xs text-muted-foreground">{key}</Text>
      </View>
      <View className="flex-row gap-2">
        <SheetAction icon="speaker" label={t("listen")} onPress={() => playWord(verseKey, position)} />
        <SheetAction
          icon="play"
          label={t("playAyah")}
          onPress={() => {
            void useAudio.getState().play(verseKey, { scope: "ayah" });
            router.back();
          }}
        />
        <SheetAction
          icon="tafsir"
          label={t("tafsir")}
          onPress={() => router.replace({ pathname: "/tafsir/[key]", params: { key: verseKey } })}
        />
        <SheetAction
          icon="more"
          label={t("more")}
          onPress={() => router.replace({ pathname: "/verse/[key]", params: { key: verseKey } })}
        />
      </View>
    </View>
  );
}
