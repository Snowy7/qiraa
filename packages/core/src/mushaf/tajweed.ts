import type { WordText } from "./types";

type Run = [text: string] | [text: string, rule: string];

/**
 * Converts quran.com tajweed markup (`<rule class=x>…</rule>`, possibly
 * nested, plus `<span class=end>`) into typed runs, so no HTML is rendered
 * at runtime. Each run takes the innermost colour rule; quran.com's
 * `custom-*` classes are typographic hints, not tajweed rules, so they never
 * override an outer colour.
 */
export function parseTajweed(markup: string): WordText {
  const runs: Run[] = [];
  const stack: (string | null)[] = [];
  const tokens = /<(rule|span) class=([\w-]+)>|<\/(?:rule|span)>|([^<]+)/g;

  for (const [, , className, text] of markup.matchAll(tokens)) {
    if (className !== undefined) {
      stack.push(
        className.startsWith("custom-") || className === "end"
          ? null
          : className,
      );
    } else if (text === undefined) {
      stack.pop();
    } else {
      let rule: string | undefined;
      for (let i = stack.length - 1; i >= 0 && !rule; i--)
        rule = stack[i] ?? undefined;
      const previous = runs.at(-1);
      // Merge with the previous run when the colour is the same.
      if (previous && previous[1] === rule) previous[0] += text;
      else runs.push(rule ? [text, rule] : [text]);
    }
  }

  if (runs.length === 1 && runs[0].length === 1) return runs[0][0];
  return runs;
}
