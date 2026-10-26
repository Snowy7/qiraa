import { Pressable, ScrollView, View } from "react-native";
import { Link, router, Stack } from "expo-router";
import {
  QURAN_SCRIPTS,
  getChapter,
  parseVerseKey,
  type MessageKey,
} from "@qiraa/core";
import { MosqueSkyline } from "@/components/brand-mark";
import { PrayerHero } from "@/components/prayer/prayer-hero";
import { ProgressRing } from "@/components/progress-ring";
import { SurahName } from "@/components/quran/surah-name";
import { VerseText } from "@/components/quran/verse-text";
import { headerButtons } from "@/components/ui/header-buttons";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useChapterTranslation } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useHifzSummary } from "@/lib/hifz";
import { continueReadingHref, openInReader } from "@/lib/navigation";
import { usePreferences } from "@/lib/preferences";
import { getVerse } from "@/lib/quran/data";
import { useReadingPosition } from "@/lib/reading-position";
import { htmlToText } from "@/lib/text";
import { useThemeColors } from "@/lib/theme";

const DAILY_VERSES = [
  "2:286", "94:5", "2:152", "3:139", "13:28", "65:3",
  "39:53", "2:186", "29:69", "20:114", "8:46", "16:128",
];

/** Frequently recited passages; the label defaults to the surah name. */
const QUICK_ACCESS: readonly { verseKey: string; label?: MessageKey }[] = [
  { verseKey: "2:255", label: "ayatAlKursi" },
  { verseKey: "18:1" },
  { verseKey: "36:1" },
  { verseKey: "55:1" },
  { verseKey: "56:1" },
  { verseKey: "67:1" },
];

function greetingKey(hour: number): MessageKey {
  if (hour >= 4 && hour < 12) return "greetingMorning";
  if (hour >= 12 && hour < 17) return "greetingAfternoon";
  if (hour >= 17 && hour < 22) return "greetingEvening";
  return "greetingNight";
}

export default function HomeScreen() {
  const { t } = useI18n();
  const colors = useThemeColors();

  return (
    <>
      <Stack.Screen
        options={{
          title: t(greetingKey(new Date().getHours())),
          ...headerButtons(
            [
              { icon: "search", label: t("search"), onPress: () => router.push("/search") },
              { icon: "settings", label: t("settings"), onPress: () => router.push("/settings") },
            ],
            colors.foreground,
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerClassName="gap-4 px-5 pb-32 pt-2"
      >
        <PrayerHero onPress={() => router.navigate("/prayer")} />
        <ContinueReading />
        <MemorizeCard />
        <VerseOfTheDay />
        <QuickAccess />
      </ScrollView>
    </>
  );
}

function ContinueReading() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const last = useReadingPosition((s) => s.last);
  const chapter = getChapter(last?.chapter ?? 1)!;
  const verse = last?.verse ?? 1;
  const progress = last ? verse / chapter.versesCount : 0;

  return (
    <Pressable
      onPress={() => router.push(continueReadingHref(last))}
      className="overflow-hidden rounded-3xl bg-primary p-6 active:opacity-90"
    >
      <View className="absolute -bottom-2 end-0 opacity-15">
        <MosqueSkyline color={colors.primaryForeground} width={240} />
      </View>
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text weight="medium" className="text-sm text-primary-foreground/80">
            {last ? t("continueReading") : t("startReading")}
          </Text>
          <Text weight="bold" className="mt-1 text-2xl text-primary-foreground">
            {locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
          </Text>
          <Text className="mt-0.5 text-sm text-primary-foreground/80">
            {last ? t("ayahOf", { verse, total: chapter.versesCount }) : t("startWithFatiha")}
          </Text>
        </View>
        <SurahName chapter={chapter.id} size={44} className="text-primary-foreground/90" />
      </View>
      <View className="mt-6 flex-row items-center gap-3">
        <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary-foreground/20">
          <View
            className="h-full rounded-full bg-primary-foreground/85"
            style={{ width: `${Math.max(progress, 0.02) * 100}%` }}
          />
        </View>
        <Icon name="arrowForward" color={colors.primaryForeground} size={18} />
      </View>
    </Pressable>
  );
}

function MemorizeCard() {
  const { t, n } = useI18n();
  const colors = useThemeColors();
  const summary = useHifzSummary();
  const fraction = summary.memorized / summary.total;
  return (
    <Pressable
      onPress={() => (summary.due > 0 ? router.push("/memorize/review") : router.navigate("/memorize"))}
      className="flex-row items-center gap-5 rounded-3xl border border-border/70 bg-card p-5 active:opacity-90"
    >
      <ProgressRing progress={fraction} size={60} stroke={6} color={colors.primary} track={colors.secondary}>
        <Icon name="brain" color={colors.primary} size={22} />
      </ProgressRing>
      <View className="min-w-0 flex-1">
        <Text weight="bold">{t("memorization")}</Text>
        <Text className="mt-0.5 text-sm text-muted-foreground">
          {summary.due > 0
            ? t("dueCount", { n: summary.due })
            : summary.memorized > 0
              ? t("memorizedOf", { n: summary.memorized, total: summary.total })
              : t("startMemorizing")}
        </Text>
      </View>
      {summary.due > 0 && (
        <View className="rounded-full bg-primary px-3 py-1">
          <Text weight="bold" className="text-sm text-primary-foreground">
            {n(summary.due)}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function VerseOfTheDay() {
  const { t, locale } = useI18n();
  const colors = useThemeColors();
  const scriptId = usePreferences((s) => s.script);
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000,
  );
  const verseKey = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
  const ref = parseVerseKey(verseKey)!;
  const verse = getVerse(scriptId, verseKey);
  const translation = useChapterTranslation(ref.chapter, locale === "en").data?.[ref.verse - 1];
  const chapter = getChapter(ref.chapter)!;

  return (
    <Pressable
      onPress={() => openInReader(verseKey)}
      className="rounded-3xl border border-border/70 bg-card p-6 active:opacity-90"
    >
      <View className="mb-4 flex-row items-center gap-2">
        <Icon name="sparkles" color={colors.accent} size={18} />
        <Text weight="bold" className="text-lg">
          {t("verseOfTheDay")}
        </Text>
      </View>
      {verse ? (
        <VerseText verse={verse} script={QURAN_SCRIPTS[scriptId]} fontSize={26} align="center" />
      ) : (
        <View className="h-12 rounded-2xl bg-foreground/5" />
      )}
      {translation && (
        <Text className="mt-4 text-center text-[15px] leading-relaxed text-foreground/70">
          {htmlToText(translation)}
        </Text>
      )}
      <Text weight="semibold" className="mt-4 text-center text-sm text-primary">
        {locale === "ar" ? chapter.nameArabic : chapter.nameSimple} · {verseKey}
      </Text>
    </Pressable>
  );
}

function QuickAccess() {
  const { t, locale } = useI18n();
  return (
    <View className="rounded-3xl border border-border/70 bg-card p-5">
      <View className="mb-3 flex-row items-center justify-between">
        <Text weight="bold" className="text-lg">
          {t("quickAccess")}
        </Text>
        <Link href="/quran" asChild>
          <Pressable hitSlop={8}>
            <Text weight="semibold" className="text-sm text-primary">
              {t("seeAll")}
            </Text>
          </Pressable>
        </Link>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {QUICK_ACCESS.map(({ label, verseKey }) => {
          const chapter = getChapter(parseVerseKey(verseKey)!.chapter)!;
          return (
            <Pressable
              key={verseKey}
              onPress={() => openInReader(verseKey)}
              className="min-w-[46%] flex-1 flex-row items-center justify-between gap-2 rounded-2xl bg-secondary/70 px-4 py-3 active:bg-secondary"
            >
              <View className="min-w-0 flex-1">
                <Text weight="semibold" numberOfLines={1} className="text-sm">
                  {label ? t(label) : locale === "ar" ? chapter.nameArabic : chapter.nameSimple}
                </Text>
                <Text className="text-xs text-muted-foreground">{verseKey}</Text>
              </View>
              <SurahName chapter={chapter.id} size={24} className="text-primary" />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
