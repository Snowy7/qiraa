/**
 * The Quran scripts (font + text encoding + mushaf layout) the app can render.
 * Every script ships a complete offline layout in `data/scripts/<id>`.
 */

export type QuranScriptId = "qpc-hafs" | "qcf-v2" | "qcf-v1" | "tajweed" | "indopak";

export type ScriptFont =
  /** One font file for the whole Quran. Paths are relative to the font root. */
  | { kind: "static"; family: string; file: string }
  /** King Fahd Complex glyph fonts: one file per mushaf page. */
  | { kind: "page"; version: "v1" | "v2" };

export interface QuranScript {
  id: QuranScriptId;
  name: { en: string; ar: string };
  description: { en: string; ar: string };
  font: ScriptFont;
  /** Mushaf pages in this script's layout (Madani 604, IndoPak 15-line 610). */
  pageCount: number;
  /**
   * Width of a full mushaf line in `em` of the script's font. Lines are
   * justified to this width, so the page reads like the printed mushaf.
   */
  lineWidthEm: number;
  /** Lines that are centred instead of justified (Madani layouts only). */
  centeredLines: "madani" | "none";
}

export const QURAN_SCRIPTS: Record<QuranScriptId, QuranScript> = {
  "qpc-hafs": {
    id: "qpc-hafs",
    name: { en: "Uthmani Hafs", ar: "الرسم العثماني (حفص)" },
    description: {
      en: "KFGQPC Uthmanic script. Crisp at any size.",
      ar: "خط مجمع الملك فهد العثماني. واضح بأي حجم.",
    },
    font: { kind: "static", family: "UthmanicHafs", file: "hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2" },
    pageCount: 604,
    lineWidthEm: 18.5,
    centeredLines: "madani",
  },
  "qcf-v2": {
    id: "qcf-v2",
    name: { en: "Madani Mushaf", ar: "مصحف المدينة" },
    description: {
      en: "Exact glyphs of the 1421H Madani print (QCF V2).",
      ar: "رسم مطابق لطبعة المدينة ١٤٢١هـ.",
    },
    font: { kind: "page", version: "v2" },
    pageCount: 604,
    lineWidthEm: 17.5,
    centeredLines: "madani",
  },
  "qcf-v1": {
    id: "qcf-v1",
    name: { en: "Madani Mushaf 1405", ar: "مصحف المدينة ١٤٠٥" },
    description: {
      en: "The classic 1405H Madani print (QCF V1).",
      ar: "طبعة المدينة الكلاسيكية ١٤٠٥هـ.",
    },
    font: { kind: "page", version: "v1" },
    pageCount: 604,
    lineWidthEm: 15,
    centeredLines: "madani",
  },
  tajweed: {
    id: "tajweed",
    name: { en: "Tajweed", ar: "التجويد الملوّن" },
    description: {
      en: "Uthmani Hafs with colour-coded tajweed rules.",
      ar: "الرسم العثماني مع تلوين أحكام التجويد.",
    },
    font: { kind: "static", family: "UthmanicHafs", file: "hafs/uthmanic_hafs/UthmanicHafs1Ver18.woff2" },
    pageCount: 604,
    lineWidthEm: 18.5,
    centeredLines: "madani",
  },
  indopak: {
    id: "indopak",
    name: { en: "IndoPak", ar: "الخط الهندي" },
    description: {
      en: "Nastaleeq script used across South Asia (15-line mushaf).",
      ar: "الخط النستعليق المستخدم في شبه القارة الهندية.",
    },
    font: {
      kind: "static",
      family: "IndoPak",
      file: "hafs/nastaleeq/indopak/indopak-nastaleeq-waqf-lazim-v4.2.1.woff2",
    },
    pageCount: 610,
    lineWidthEm: 17.3,
    centeredLines: "none",
  },
};

export const QURAN_SCRIPT_IDS = Object.keys(QURAN_SCRIPTS) as QuranScriptId[];

export const DEFAULT_SCRIPT: QuranScriptId = "qpc-hafs";

export function isQuranScriptId(value: unknown): value is QuranScriptId {
  return typeof value === "string" && value in QURAN_SCRIPTS;
}

/** CSS font-family for a QCF page font, matching quran.com's `p{N}-v{X}` naming. */
export function pageFontFamily(version: "v1" | "v2", page: number): string {
  return `p${page}-${version}`;
}

/** Path of a QCF page font relative to the font root. */
export function pageFontFile(version: "v1" | "v2", page: number): string {
  return `hafs/${version}/woff2/p${page}.woff2`;
}

// Lines the printed Madani mushaf centres (short closing lines of surahs).
const MADANI_CENTERED_PAGES = new Set([1, 2]);
const MADANI_CENTERED_LINES: Readonly<Record<number, readonly number[]>> = {
  255: [2],
  528: [9],
  534: [6],
  545: [6],
  586: [1],
  593: [2],
  594: [5],
  600: [10],
  602: [5, 15],
  603: [10, 15],
  604: [4, 9, 14, 15],
};

/** Whether a mushaf line is centred rather than justified edge to edge. */
export function isCenteredLine(script: QuranScript, page: number, line: number): boolean {
  if (script.centeredLines === "none") return false;
  return MADANI_CENTERED_PAGES.has(page) || (MADANI_CENTERED_LINES[page]?.includes(line) ?? false);
}
