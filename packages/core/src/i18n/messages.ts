/**
 * UI strings for every platform. Placeholders use `{name}` and are filled by
 * the platform's `t(key, params)` helper.
 */
export const MESSAGES = {
  appName: { en: "Qiraa", ar: "قراءة" },

  // Navigation
  home: { en: "Home", ar: "الرئيسية" },
  quran: { en: "Quran", ar: "القرآن" },
  saved: { en: "Saved", ar: "المحفوظات" },
  memorize: { en: "Memorise", ar: "الحفظ" },
  prayer: { en: "Prayer", ar: "الصلاة" },
  search: { en: "Search", ar: "البحث" },
  settings: { en: "Settings", ar: "الإعدادات" },
  back: { en: "Back", ar: "رجوع" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  delete: { en: "Delete", ar: "حذف" },
  create: { en: "Create", ar: "إنشاء" },
  offline: { en: "You're offline", ar: "أنت غير متصل" },
  needsConnection: {
    en: "This needs an internet connection. It will be saved for offline use once loaded.",
    ar: "يحتاج هذا إلى اتصال بالإنترنت، وسيُحفظ للاستخدام دون اتصال بعد تحميله.",
  },

  // Home
  greetingMorning: { en: "Good morning", ar: "صباح الخير" },
  greetingAfternoon: { en: "Good afternoon", ar: "طاب يومك" },
  greetingEvening: { en: "Good evening", ar: "مساء الخير" },
  greetingNight: { en: "Peace be upon you", ar: "السلام عليكم" },
  continueReading: { en: "Continue reading", ar: "تابع القراءة" },
  startReading: { en: "Start reading", ar: "ابدأ القراءة" },
  startWithFatiha: { en: "Begin with Al-Fatihah", ar: "ابدأ بسورة الفاتحة" },
  ayahOf: { en: "Ayah {verse} of {total}", ar: "الآية {verse} من {total}" },
  verseOfTheDay: { en: "Verse of the day", ar: "آية اليوم" },
  quickAccess: { en: "Quick access", ar: "وصول سريع" },
  ayatAlKursi: { en: "Ayat al-Kursi", ar: "آية الكرسي" },
  seeAll: { en: "See all", ar: "عرض الكل" },

  // Prayer
  prayerTimes: { en: "Prayer times", ar: "أوقات الصلاة" },
  nextPrayer: { en: "Next prayer", ar: "الصلاة القادمة" },
  inCountdown: { en: "in {time}", ar: "بعد {time}" },
  fajr: { en: "Fajr", ar: "الفجر" },
  sunrise: { en: "Sunrise", ar: "الشروق" },
  dhuhr: { en: "Dhuhr", ar: "الظهر" },
  asr: { en: "Asr", ar: "العصر" },
  maghrib: { en: "Maghrib", ar: "المغرب" },
  isha: { en: "Isha", ar: "العشاء" },
  useMyLocation: { en: "Use my location", ar: "استخدم موقعي" },
  locationNeeded: {
    en: "Prayer times are calculated on your device from your location.",
    ar: "تُحسب أوقات الصلاة على جهازك بناءً على موقعك.",
  },
  locationDenied: {
    en: "Location access was denied. Allow it in your browser settings to see prayer times.",
    ar: "تم رفض الوصول إلى الموقع. اسمح به من إعدادات المتصفح لعرض أوقات الصلاة.",
  },
  locationUnavailable: {
    en: "Couldn't determine your location.",
    ar: "تعذّر تحديد موقعك.",
  },
  calculatedLocally: {
    en: "Calculated on your device · {method}",
    ar: "محسوبة على جهازك · {method}",
  },

  // Quran index
  surah: { en: "Surah", ar: "سورة" },
  surahs: { en: "Surahs", ar: "السور" },
  juz: { en: "Juz", ar: "الجزء" },
  page: { en: "Page", ar: "الصفحة" },
  juzNumber: { en: "Juz {n}", ar: "الجزء {n}" },
  pageNumber: { en: "Page {n}", ar: "الصفحة {n}" },
  ayahCount: { en: "{n} ayahs", ar: "{n} آية" },
  makkah: { en: "Meccan", ar: "مكية" },
  madinah: { en: "Medinan", ar: "مدنية" },
  searchSurahs: { en: "Search by name or number", ar: "ابحث بالاسم أو الرقم" },
  noSurahsMatch: {
    en: "No surah matches “{query}”",
    ar: "لا توجد سورة تطابق «{query}»",
  },
  goToPage: { en: "Go to page", ar: "انتقل إلى الصفحة" },

  // Reader
  verseByVerse: { en: "Verses", ar: "الآيات" },
  mushafMode: { en: "Mushaf", ar: "المصحف" },
  readingSettings: { en: "Reading settings", ar: "إعدادات القراءة" },
  quranScript: { en: "Quran script", ar: "خط المصحف" },
  quranTextSize: { en: "Quran text size", ar: "حجم خط القرآن" },
  translationTextSize: { en: "Translation size", ar: "حجم الترجمة" },
  translation: { en: "Translation", ar: "الترجمة" },
  showTranslation: { en: "Show translation", ar: "إظهار الترجمة" },
  wordByWord: { en: "Word by word", ar: "كلمة بكلمة" },
  wordByWordHint: { en: "Meaning under each word", ar: "معنى كل كلمة تحتها" },
  previousSurah: { en: "Previous surah", ar: "السورة السابقة" },
  nextSurah: { en: "Next surah", ar: "السورة التالية" },
  previousPage: { en: "Previous page", ar: "الصفحة السابقة" },
  nextPage: { en: "Next page", ar: "الصفحة التالية" },
  chooseSurah: { en: "Choose surah", ar: "اختر السورة" },
  play: { en: "Play", ar: "تشغيل" },
  pause: { en: "Pause", ar: "إيقاف مؤقت" },
  playSurah: { en: "Play surah", ar: "تشغيل السورة" },
  bookmark: { en: "Save", ar: "حفظ" },
  tafsir: { en: "Tafsir", ar: "التفسير" },
  copy: { en: "Copy", ar: "نسخ" },
  share: { en: "Share", ar: "مشاركة" },
  copied: { en: "Copied", ar: "تم النسخ" },
  moreActions: { en: "More actions", ar: "إجراءات أخرى" },
  verseActions: { en: "Ayah {key}", ar: "الآية {key}" },
  loadFailed: {
    en: "Couldn't load this. Check your connection and try again.",
    ar: "تعذّر التحميل. تحقق من اتصالك وحاول مرة أخرى.",
  },
  translationUnavailable: {
    en: "Translation needs a connection the first time. Arabic text is always available.",
    ar: "تحتاج الترجمة إلى اتصال في المرة الأولى. النص العربي متاح دائمًا.",
  },
  previousAyah: { en: "Previous ayah", ar: "الآية السابقة" },
  nextAyah: { en: "Next ayah", ar: "الآية التالية" },

  // Audio
  reciter: { en: "Reciter", ar: "القارئ" },
  chooseReciter: { en: "Choose reciter", ar: "اختر القارئ" },
  repeatOff: { en: "Repeat off", ar: "التكرار متوقف" },
  repeatVerse: { en: "Repeat ayah", ar: "تكرار الآية" },
  repeatSurah: { en: "Repeat surah", ar: "تكرار السورة" },
  playbackSpeed: { en: "Speed", ar: "السرعة" },
  previous: { en: "Previous", ar: "السابق" },
  next: { en: "Next", ar: "التالي" },
  stop: { en: "Stop", ar: "إيقاف" },
  stopAudio: { en: "Stop and close player", ar: "إيقاف وإغلاق المشغل" },
  audioFailed: {
    en: "Couldn't play this recitation",
    ar: "تعذّر تشغيل التلاوة",
  },
  followRecitation: { en: "Follow the recitation", ar: "متابعة التلاوة" },
  followRecitationHint: {
    en: "Scroll and turn pages along with the reciter",
    ar: "التمرير وتقليب الصفحات مع القارئ",
  },
  nowPlaying: { en: "Now playing", ar: "قيد التشغيل" },
  listen: { en: "Listen", ar: "استماع" },
  playAyah: { en: "Play ayah", ar: "تشغيل الآية" },
  more: { en: "More", ar: "المزيد" },
  continueReciting: { en: "Continue", ar: "متابعة" },
  downloadingPercent: {
    en: "Downloading {percent}%",
    ar: "جارٍ التنزيل {percent}٪",
  },

  // Collections
  collections: { en: "Collections", ar: "المجموعات" },
  newCollection: { en: "New collection", ar: "مجموعة جديدة" },
  collectionName: { en: "Name", ar: "الاسم" },
  collectionPlaceholder: {
    en: "e.g. Duas, Reflections",
    ar: "مثال: أدعية، تأملات",
  },
  color: { en: "Colour", ar: "اللون" },
  saveTo: { en: "Save {key} to", ar: "حفظ {key} في" },
  verseCount: { en: "{n} ayahs", ar: "{n} آية" },
  noCollections: { en: "Nothing saved yet", ar: "لا توجد محفوظات بعد" },
  noCollectionsHint: {
    en: "Tap the bookmark on any ayah to keep it here.",
    ar: "اضغط على علامة الحفظ في أي آية لتظهر هنا.",
  },
  emptyCollection: { en: "This collection is empty", ar: "هذه المجموعة فارغة" },
  deleteCollection: { en: "Delete “{name}”?", ar: "حذف «{name}»؟" },
  deleteCollectionHint: {
    en: "Saved ayahs in it will be removed. This can't be undone.",
    ar: "ستُحذف الآيات المحفوظة فيها، ولا يمكن التراجع عن ذلك.",
  },
  collectionNotFound: { en: "Collection not found", ar: "المجموعة غير موجودة" },
  removeFromCollection: { en: "Remove", ar: "إزالة" },

  // Memorisation
  memorization: { en: "Memorisation", ar: "الحفظ" },
  memorizedOf: {
    en: "{n} of {total} ayahs memorised",
    ar: "{n} من {total} آية محفوظة",
  },
  dayStreak: { en: "Day streak", ar: "أيام متتالية" },
  reviewedToday: { en: "Reviewed today", ar: "مراجعات اليوم" },
  learning: { en: "Learning", ar: "قيد الحفظ" },
  memorized: { en: "Memorised", ar: "محفوظة" },
  startReview: { en: "Start review", ar: "ابدأ المراجعة" },
  dueCount: { en: "{n} ayahs ready to review", ar: "{n} آية جاهزة للمراجعة" },
  allCaughtUp: { en: "All caught up", ar: "لا توجد مراجعات" },
  allCaughtUpHint: {
    en: "Nothing is due. Come back later.",
    ar: "لا شيء مستحق الآن، عُد لاحقًا.",
  },
  startMemorizing: { en: "Start memorising", ar: "ابدأ الحفظ" },
  startMemorizingHint: {
    en: "Open any ayah's actions and rate how well you know it. Reviews are scheduled for you.",
    ar: "افتح إجراءات أي آية وقيّم مدى حفظك لها، وستُجدول المراجعات تلقائيًا.",
  },
  howWellKnown: {
    en: "How well do you know {key}?",
    ar: "ما مدى حفظك للآية {key}؟",
  },
  markedAs: { en: "{key} marked as {level}", ar: "تم تقييم {key}: {level}" },
  tapToReveal: {
    en: "Recite from memory, then tap to check",
    ar: "اقرأ من حفظك ثم اضغط للتحقق",
  },
  playHint: { en: "Play first words", ar: "تشغيل البداية" },
  forgot: { en: "Forgot", ar: "نسيت" },
  shaky: { en: "Shaky", ar: "متردد" },
  good: { en: "Good", ar: "جيد" },
  solid: { en: "Solid", ar: "متقن" },
  sessionComplete: { en: "Session complete", ar: "اكتملت الجلسة" },
  reviewedCount: { en: "{n} ayahs reviewed", ar: "تمت مراجعة {n} آية" },
  needsWork: { en: "Needs work", ar: "تحتاج مراجعة" },
  backToMemorize: { en: "Back to memorisation", ar: "العودة إلى الحفظ" },

  // Search
  searchPlaceholder: {
    en: "Surah, ayah (2:255) or words",
    ar: "سورة، آية (٢:٢٥٥) أو كلمات",
  },
  goToVerse: { en: "Go to {key}", ar: "انتقل إلى {key}" },
  verses: { en: "Ayahs", ar: "الآيات" },
  resultCount: { en: "{n} results", ar: "{n} نتيجة" },
  noResults: {
    en: "No results for “{query}”",
    ar: "لا توجد نتائج لـ«{query}»",
  },
  recent: { en: "Recent", ar: "عمليات البحث الأخيرة" },
  clear: { en: "Clear", ar: "مسح" },
  searchHint: {
    en: "Find a surah by name, jump to an ayah like 2:255, or search the meaning.",
    ar: "ابحث عن سورة بالاسم، أو انتقل إلى آية مثل ٢:٢٥٥، أو ابحث بالمعنى.",
  },
  searchOffline: {
    en: "Searching ayah text needs a connection. Surah and ayah jumps work offline.",
    ar: "البحث في نص الآيات يحتاج إلى اتصال، أما الانتقال إلى السور والآيات فيعمل دون اتصال.",
  },

  // Settings
  appearance: { en: "Appearance", ar: "المظهر" },
  theme: { en: "Theme", ar: "السمة" },
  light: { en: "Light", ar: "فاتح" },
  dark: { en: "Dark", ar: "داكن" },
  system: { en: "System", ar: "النظام" },
  language: { en: "Language", ar: "اللغة" },
  reading: { en: "Reading", ar: "القراءة" },
  offlineSection: { en: "Offline", ar: "دون اتصال" },
  offlineIntro: {
    en: "Arabic text for every script is built in. Download the rest to read and listen without a connection.",
    ar: "النص العربي لكل الخطوط مدمج في التطبيق. نزّل الباقي للقراءة والاستماع دون اتصال.",
  },
  storageUsed: {
    en: "{used} used on this device",
    ar: "المستخدم على هذا الجهاز: {used}",
  },
  mushafFonts: { en: "{script} fonts", ar: "خطوط {script}" },
  mushafFontsHint: {
    en: "604 page fonts, about {size}",
    ar: "٦٠٤ خطًا للصفحات، نحو {size}",
  },
  translationDownload: { en: "{name} translation", ar: "ترجمة {name}" },
  translationDownloadHint: { en: "All 114 surahs", ar: "جميع السور الـ١١٤" },
  surahAudio: { en: "Recitation by {name}", ar: "تلاوة {name}" },
  surahAudioHint: {
    en: "Download surah by surah from the reader",
    ar: "نزّل السور واحدة تلو الأخرى من القارئ",
  },
  download: { en: "Download", ar: "تنزيل" },
  downloaded: { en: "Available offline", ar: "متاح دون اتصال" },
  downloadFailed: {
    en: "Download stopped. Try again when online.",
    ar: "توقف التنزيل. حاول مجددًا عند الاتصال.",
  },
  downloadSurahAudio: { en: "Download recitation", ar: "تنزيل التلاوة" },
  data: { en: "Your data", ar: "بياناتك" },
  exportData: { en: "Export backup", ar: "تصدير نسخة احتياطية" },
  exportDataHint: {
    en: "Collections, memorisation and reading history",
    ar: "المجموعات والحفظ وسجل القراءة",
  },
  dataExported: { en: "Backup downloaded", ar: "تم تنزيل النسخة الاحتياطية" },
  clearOffline: { en: "Clear downloads", ar: "حذف التنزيلات" },
  clearOfflineHint: {
    en: "Removes downloaded fonts, translations and audio. Your saved ayahs stay.",
    ar: "يحذف الخطوط والترجمات والتلاوات المنزّلة، وتبقى محفوظاتك.",
  },
  offlineCleared: { en: "Downloads removed", ar: "تم حذف التنزيلات" },
  about: { en: "About", ar: "حول" },
  aboutText: {
    en: "Quran text and layouts from the King Fahd Complex via Quran.com. Recitations from EveryAyah.",
    ar: "نص المصحف وتخطيطاته من مجمع الملك فهد عبر Quran.com، والتلاوات من EveryAyah.",
  },
  version: { en: "Version {version}", ar: "الإصدار {version}" },

  // Not found / errors
  notFound: { en: "Page not found", ar: "الصفحة غير موجودة" },
  notFoundHint: {
    en: "The page you're looking for doesn't exist.",
    ar: "الصفحة التي تبحث عنها غير موجودة.",
  },
  goHome: { en: "Go home", ar: "العودة للرئيسية" },
  somethingWrong: { en: "Something went wrong", ar: "حدث خطأ ما" },
  reload: { en: "Reload", ar: "إعادة التحميل" },
  updateReady: {
    en: "A new version of Qiraa is ready",
    ar: "إصدار جديد من قراءة جاهز",
  },
  install: { en: "Install Qiraa", ar: "تثبيت قراءة" },
  installHint: {
    en: "Add it to your home screen for quick, offline access.",
    ar: "أضفه إلى الشاشة الرئيسية لوصول سريع دون اتصال.",
  },
  installIosHint: {
    en: "Tap Share, then “Add to Home Screen”.",
    ar: "اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية».",
  },
  notNow: { en: "Not now", ar: "ليس الآن" },
} as const satisfies Record<string, { en: string; ar: string }>;

export type MessageKey = keyof typeof MESSAGES;
export type Locale = "en" | "ar";

/** Fills `{placeholders}`; numbers are localised for Arabic. */
export function formatMessage(
  key: MessageKey,
  locale: Locale,
  params?: Record<string, string | number>,
): string {
  const template: string = MESSAGES[key][locale];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === "number" ? formatNumber(value, locale) : value;
  });
}

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === "ar" ? "ar-EG" : "en-US");
}
