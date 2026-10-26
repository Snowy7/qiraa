import { parseVerseKey } from "../quran/verse-key";

/** A verse-by-verse reciter hosted on everyayah.com (CORS-enabled, cacheable). */
export interface Reciter {
  id: string;
  name: { en: string; ar: string };
  style?: { en: string; ar: string };
  /** everyayah.com folder name. */
  folder: string;
}

const MURATTAL = { en: "Murattal", ar: "مرتل" };

export const RECITERS: readonly Reciter[] = [
  { id: "alafasy", name: { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" }, folder: "Alafasy_128kbps" },
  { id: "sudais", name: { en: "Abdur-Rahman as-Sudais", ar: "عبد الرحمن السديس" }, folder: "Abdurrahmaan_As-Sudais_192kbps" },
  { id: "shuraym", name: { en: "Sa'ud ash-Shuraym", ar: "سعود الشريم" }, folder: "Saood_ash-Shuraym_128kbps" },
  { id: "maher", name: { en: "Maher Al Muaiqly", ar: "ماهر المعيقلي" }, folder: "MaherAlMuaiqly128kbps" },
  { id: "shatri", name: { en: "Abu Bakr al-Shatri", ar: "أبو بكر الشاطري" }, folder: "Abu_Bakr_Ash-Shaatree_128kbps" },
  { id: "abdulbasit", name: { en: "Abdul Basit Abdul Samad", ar: "عبد الباسط عبد الصمد" }, style: MURATTAL, folder: "Abdul_Basit_Murattal_192kbps" },
  { id: "minshawi", name: { en: "Muhammad Siddiq al-Minshawi", ar: "محمد صديق المنشاوي" }, style: MURATTAL, folder: "Minshawy_Murattal_128kbps" },
  { id: "husary", name: { en: "Mahmoud Khalil Al-Husary", ar: "محمود خليل الحصري" }, folder: "Husary_128kbps" },
  { id: "husary-muallim", name: { en: "Al-Husary (Teaching)", ar: "الحصري (المعلم)" }, folder: "Husary_Muallim_128kbps" },
  { id: "rifai", name: { en: "Hani Ar-Rifai", ar: "هاني الرفاعي" }, folder: "Hani_Rifai_192kbps" },
  { id: "dussary", name: { en: "Yasser Ad-Dussary", ar: "ياسر الدوسري" }, folder: "Yasser_Ad-Dussary_128kbps" },
  { id: "qatami", name: { en: "Nasser Al Qatami", ar: "ناصر القطامي" }, folder: "Nasser_Alqatami_128kbps" },
  { id: "juhaynee", name: { en: "Abdullah Awad al-Juhani", ar: "عبد الله عواد الجهني" }, folder: "Abdullaah_3awwaad_Al-Juhaynee_128kbps" },
  { id: "ayyoub", name: { en: "Muhammad Ayyub", ar: "محمد أيوب" }, folder: "Muhammad_Ayyoub_128kbps" },
];

export const DEFAULT_RECITER_ID = "alafasy";

export function getReciter(id: string): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

/** URL of one verse's recitation, e.g. `.../Alafasy_128kbps/002255.mp3`. */
export function verseAudioUrl(reciter: Reciter, verseKey: string): string {
  const ref = parseVerseKey(verseKey);
  if (!ref) throw new Error(`Invalid verse key: ${verseKey}`);
  const file = `${String(ref.chapter).padStart(3, "0")}${String(ref.verse).padStart(3, "0")}`;
  return `https://everyayah.com/data/${reciter.folder}/${file}.mp3`;
}
