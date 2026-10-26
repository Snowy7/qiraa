import { Text } from "react-native";
import { useUniwind } from "uniwind";
import type { WordText as StoredWord } from "@qiraa/core";

/* Tajweed rule colours: the palette used by quran.com and tanzil.net, lifted for dark. */
const SILENT = { light: "#a1a1a1", dark: "#8a8a8a" };
const TAJWEED_COLORS: Record<string, { light: string; dark: string }> = {
  ham_wasl: SILENT,
  slnt: SILENT,
  laam_shamsiyah: SILENT,
  idgham_mutajanisayn: SILENT,
  idgham_mutaqaribayn: SILENT,
  madda_normal: { light: "#537fff", dark: "#8aa8ff" },
  madda_permissible: { light: "#4050ff", dark: "#7d89ff" },
  madda_necessary: { light: "#000ebc", dark: "#6f7bff" },
  madda_obligatory_mottasel: { light: "#2144c1", dark: "#6f8fff" },
  madda_obligatory_monfasel: { light: "#2144c1", dark: "#6f8fff" },
  qalaqah: { light: "#dd0008", dark: "#ff5a5f" },
  ikhafa_shafawi: { light: "#d500b7", dark: "#f25ddc" },
  ikhafa: { light: "#9400a8", dark: "#d06fe6" },
  idgham_shafawi: { light: "#58b800", dark: "#84dd3a" },
  iqlab: { light: "#26bffd", dark: "#5fd2ff" },
  idgham_ghunnah: { light: "#169777", dark: "#3cc9a4" },
  idgham_wo_ghunnah: { light: "#169200", dark: "#4fd13a" },
  ghunnah: { light: "#ff7e1e", dark: "#ff9a4f" },
};

/** One stored word as text: plain, or tajweed runs coloured by rule (nest inside a Text). */
export function WordText({ word }: { word: StoredWord }) {
  const { theme } = useUniwind();
  if (typeof word === "string") return word;
  const scheme = theme === "dark" ? "dark" : "light";
  return word.map(([text, rule], i) => {
    const color = rule ? TAJWEED_COLORS[rule]?.[scheme] : undefined;
    return color ? (
      <Text key={i} style={{ color }}>
        {text}
      </Text>
    ) : (
      text
    );
  });
}
