import { describe, expect, it } from "vitest";
import { suggestPreset, type SuggestBlock } from "./suggest";

const b = (activity: string, tag: string | null = null): SuggestBlock => ({
  activity,
  tag,
});

describe("suggestPreset", () => {
  it("suggests Deep 2 for a DEEP block, even with a longer run", () => {
    const blocks = [b("Code", "DEEP"), b("Code"), b("Code")];
    expect(suggestPreset(blocks, 0)).toBe("DEEP_2");
  });

  it("maps runs of 1, 2 and 3 or more to the presets", () => {
    expect(suggestPreset([b("A"), b("B")], 0)).toBe("CLASSIC");
    expect(suggestPreset([b("A"), b("A"), b("B")], 0)).toBe("DEEP_2");
    expect(suggestPreset([b("A"), b("A"), b("A"), b("B")], 0)).toBe("DEEP_3");
    expect(suggestPreset([b("A"), b("A"), b("A"), b("A"), b("A")], 0)).toBe(
      "DEEP_3"
    );
  });

  it("ignores case and surrounding spaces", () => {
    expect(suggestPreset([b("Leer"), b("  leer "), b("LEER")], 0)).toBe(
      "DEEP_3"
    );
  });

  it("never forms a run from empty activities", () => {
    expect(suggestPreset([b(""), b(""), b("")], 0)).toBe("CLASSIC");
    expect(suggestPreset([b("   "), b("")], 0)).toBe("CLASSIC");
  });

  it("only counts blocks from the chosen one onwards", () => {
    const blocks = [b("A"), b("A"), b("A"), b("B")];
    expect(suggestPreset(blocks, 1)).toBe("DEEP_2");
    expect(suggestPreset(blocks, 2)).toBe("CLASSIC");
  });

  it("handles the last block and an out-of-range index", () => {
    expect(suggestPreset([b("A"), b("A")], 1)).toBe("CLASSIC");
    expect(suggestPreset([b("A")], 5)).toBe("CLASSIC");
  });
});
