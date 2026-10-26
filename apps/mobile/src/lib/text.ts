import { I18nManager } from "react-native";

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#\d+|#x[\da-f]+|\w+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const value = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Plain text from quran.com HTML (translations, search highlights): drops
 * footnote markers and tags, decodes entities.
 */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<sup[^>]*>.*?<\/sup>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+/g, " ")
    .trim();
}

export interface TextBlock {
  kind: "heading" | "paragraph";
  text: string;
}

/** Splits tafsir HTML into headings and paragraphs for native rendering. */
export function htmlToBlocks(html: string): TextBlock[] {
  const blocks: TextBlock[] = [];
  const pattern = /<(h[1-6]|p|div)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let consumed = 0;
  while ((match = pattern.exec(html))) {
    const before = htmlToText(html.slice(consumed, match.index));
    if (before) blocks.push({ kind: "paragraph", text: before });
    const text = htmlToText(match[2]);
    if (text) blocks.push({ kind: match[1][0] === "h" ? "heading" : "paragraph", text });
    consumed = pattern.lastIndex;
  }
  const rest = htmlToText(html.slice(consumed));
  if (rest) {
    for (const paragraph of rest.split(/\n{2,}/)) {
      if (paragraph.trim()) blocks.push({ kind: "paragraph", text: paragraph.trim() });
    }
  }
  return blocks;
}

// A letter of a right-to-left script (Hebrew, Arabic, Syriac, Thaana…), or of a common left-to-right one.
const RTL_LETTER = "\\u0590-\\u08ff\\ufb1d-\\ufdff\\ufe70-\\ufeff";
const STRONG = new RegExp(`[${RTL_LETTER}A-Za-z\\u00c0-\\u024f\\u0370-\\u04ff\\u0900-\\u0dff]`);
const RTL = new RegExp(`[${RTL_LETTER}]`);

/** Direction of a text from its first letter, like HTML's `dir="auto"`. */
export function textDirection(text: string): "rtl" | "ltr" {
  const letter = STRONG.exec(text)?.[0];
  return letter && RTL.test(letter) ? "rtl" : "ltr";
}

/**
 * Text style that sets a text in its own direction, aligned to its start, in
 * either UI language. React Native mirrors `left`/`right` in Arabic, so
 * "right" means the end edge of the UI.
 */
export function alignedTo(direction: "rtl" | "ltr") {
  return {
    writingDirection: direction,
    textAlign: (direction === "rtl") === I18nManager.isRTL ? undefined : "right",
  } as const;
}
