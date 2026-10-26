/**
 * Recitations come as one file per surah with ayah (and word) timestamps,
 * from the quran.com audio API. A single continuous file gives gapless
 * playback, and the timestamps tell us exactly which ayah and word is being
 * recited, so the reader can follow along.
 */

export interface Reciter {
  /** quran.com audio reciter id. */
  id: number;
  name: { en: string; ar: string };
  style?: { en: string; ar: string };
}

const MUJAWWAD = { en: "Mujawwad", ar: "مجوّد" };
const MUALLIM = { en: "Teaching", ar: "المعلم" };

export const RECITERS: readonly Reciter[] = [
  { id: 7, name: { en: "Mishary Rashid Alafasy", ar: "مشاري راشد العفاسي" } },
  { id: 3, name: { en: "Abdur-Rahman as-Sudais", ar: "عبد الرحمن السديس" } },
  { id: 10, name: { en: "Sa'ud ash-Shuraym", ar: "سعود الشريم" } },
  { id: 4, name: { en: "Abu Bakr al-Shatri", ar: "أبو بكر الشاطري" } },
  { id: 97, name: { en: "Yasser Ad-Dussary", ar: "ياسر الدوسري" } },
  {
    id: 2,
    name: { en: "Abdul Basit Abdul Samad", ar: "عبد الباسط عبد الصمد" },
  },
  {
    id: 1,
    name: { en: "Abdul Basit Abdul Samad", ar: "عبد الباسط عبد الصمد" },
    style: MUJAWWAD,
  },
  {
    id: 9,
    name: { en: "Muhammad Siddiq al-Minshawi", ar: "محمد صديق المنشاوي" },
  },
  { id: 6, name: { en: "Mahmoud Khalil Al-Husary", ar: "محمود خليل الحصري" } },
  {
    id: 12,
    name: { en: "Mahmoud Khalil Al-Husary", ar: "محمود خليل الحصري" },
    style: MUALLIM,
  },
  { id: 5, name: { en: "Hani ar-Rifai", ar: "هاني الرفاعي" } },
  { id: 161, name: { en: "Khalifa Al Tunaiji", ar: "خليفة الطنيجي" } },
];

export const DEFAULT_RECITER_ID = 7;

export function getReciter(id: number): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

/** Where an ayah sits in its surah's audio file (milliseconds). */
export interface VerseTiming {
  verseKey: string;
  from: number;
  to: number;
  /** `[wordPosition, from, to]` for each recited word. */
  words: readonly (readonly [number, number, number])[];
}

export interface ChapterRecitation {
  url: string;
  sizeBytes: number;
  verses: readonly VerseTiming[];
}

export function chapterRecitationUrl(
  reciterId: number,
  chapter: number,
): string {
  return `https://api.qurancdn.com/api/qdc/audio/reciters/${reciterId}/audio_files?chapter=${chapter}&segments=true`;
}

export async function fetchChapterRecitation(
  reciterId: number,
  chapter: number,
  signal?: AbortSignal,
): Promise<ChapterRecitation> {
  const res = await fetch(chapterRecitationUrl(reciterId, chapter), { signal });
  if (!res.ok)
    throw new Error(`Recitation ${reciterId}/${chapter}: ${res.status}`);
  const { audio_files } = (await res.json()) as {
    audio_files: {
      audio_url: string;
      file_size: number;
      verse_timings: {
        verse_key: string;
        timestamp_from: number;
        timestamp_to: number;
        segments: number[][];
      }[];
    }[];
  };
  const file = audio_files[0];
  if (!file) throw new Error(`No recitation for ${reciterId}/${chapter}`);
  return {
    url: file.audio_url,
    sizeBytes: file.file_size,
    verses: file.verse_timings.map((v) => ({
      verseKey: v.verse_key,
      from: v.timestamp_from,
      to: v.timestamp_to,
      // Some segments are bare markers without timing; keep only complete ones.
      words: v.segments.filter(
        (s): s is [number, number, number] => s.length === 3,
      ),
    })),
  };
}

/** Index of the timing that contains `ms` (the last one starting before it). */
export function timingIndexAt<T extends { from: number }>(
  timings: readonly T[],
  ms: number,
): number {
  let low = 0;
  let high = timings.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (timings[mid].from <= ms) low = mid;
    else high = mid - 1;
  }
  return low;
}

/** Position of the word being recited at `ms`, or null between words. */
export function wordAt(verse: VerseTiming, ms: number): number | null {
  for (const [position, from, to] of verse.words)
    if (ms >= from && ms < to) return position;
  return null;
}
