import { describe, expect, it } from "vitest";
import { parseTajweed } from "./tajweed";

describe("parseTajweed", () => {
  it("keeps plain words as strings", () => {
    expect(parseTajweed("ٱهۡدِنَا")).toBe("ٱهۡدِنَا");
  });

  it("colours nested rules by the innermost real rule", () => {
    expect(
      parseTajweed(
        "<rule class=ham_wasl>ٱ</rule>صِّر<rule class=madda_normal><rule class=custom-alef-maksora>ٰ</rule></rule>طَ",
      ),
    ).toEqual([["ٱ", "ham_wasl"], ["صِّر"], ["ٰ", "madda_normal"], ["طَ"]]);
  });

  it("drops the end-of-ayah span wrapper", () => {
    expect(parseTajweed("<span class=end>٢</span>")).toBe("٢");
  });
});
