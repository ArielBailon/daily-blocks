import { describe, expect, it } from "vitest";
import { focusActionInput, startFocusInput } from "./focus";

function message(input: unknown): string | null {
  const parsed = startFocusInput.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0].message;
}

describe("startFocusInput", () => {
  it("accepts each fixed preset", () => {
    for (const preset of ["CLASSIC", "DEEP_2", "DEEP_3"]) {
      expect(startFocusInput.safeParse({ blockId: 4, preset }).success).toBe(
        true
      );
    }
  });

  it("accepts custom minutes at the limits", () => {
    for (const [workMinutes, breakMinutes] of [
      [5, 0],
      [120, 30],
    ]) {
      expect(
        startFocusInput.safeParse({
          blockId: 4,
          preset: "CUSTOM",
          workMinutes,
          breakMinutes,
        }).success
      ).toBe(true);
    }
  });

  it("rejects custom minutes just outside the limits", () => {
    for (const [workMinutes, breakMinutes] of [
      [4, 5],
      [121, 5],
      [25, -1],
      [25, 31],
      [25.5, 5],
    ]) {
      expect(
        message({ blockId: 4, preset: "CUSTOM", workMinutes, breakMinutes })
      ).not.toBeNull();
    }
  });

  it("requires the minutes for a custom preset", () => {
    expect(message({ blockId: 4, preset: "CUSTOM" })).not.toBeNull();
  });

  it("rejects minutes sent with a fixed preset", () => {
    expect(
      message({ blockId: 4, preset: "CLASSIC", workMinutes: 10 })
    ).toBe("Con un preset fijo no se envían minutos");
  });

  it("rejects an unknown preset and a bad block", () => {
    expect(message({ blockId: 4, preset: "NOPE" })).toContain("preset");
    expect(message({ blockId: 0, preset: "CLASSIC" })).not.toBeNull();
    expect(message({ preset: "CLASSIC" })).not.toBeNull();
    expect(message(null)).not.toBeNull();
  });
});

describe("focusActionInput", () => {
  it("accepts every action", () => {
    for (const action of [
      "pause",
      "resume",
      "finish",
      "abandon",
      "skipBreak",
    ]) {
      expect(focusActionInput.safeParse({ action }).success).toBe(true);
    }
  });

  it("rejects an unknown or missing action", () => {
    expect(focusActionInput.safeParse({ action: "stop" }).success).toBe(false);
    expect(focusActionInput.safeParse({}).success).toBe(false);
  });
});
