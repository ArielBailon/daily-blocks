import { describe, expect, it } from "vitest";
import { parseStoredCustom, validateCustom } from "./custom";

describe("validateCustom", () => {
  it("accepts the limits", () => {
    expect(validateCustom("5", "0")).toEqual({
      ok: true,
      workMinutes: 5,
      breakMinutes: 0,
    });
    expect(validateCustom("120", "30")).toEqual({
      ok: true,
      workMinutes: 120,
      breakMinutes: 30,
    });
  });

  it("rejects work just outside the limits or not an integer", () => {
    for (const work of ["4", "121", "", "  ", "abc", "25.5"]) {
      const result = validateCustom(work, "5");
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.field).toBe("work");
    }
  });

  it("rejects break just outside the limits or not an integer", () => {
    for (const rest of ["-1", "31", "", "x", "2.5"]) {
      const result = validateCustom("25", rest);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.field).toBe("break");
    }
  });

  it("trims spaces", () => {
    expect(validateCustom(" 25 ", " 5 ").ok).toBe(true);
  });
});

describe("parseStoredCustom", () => {
  it("reads a valid stored value", () => {
    expect(
      parseStoredCustom(JSON.stringify({ workMinutes: 40, breakMinutes: 8 }))
    ).toEqual({ work: "40", rest: "8" });
  });

  it("drops missing, malformed or out-of-range values", () => {
    expect(parseStoredCustom(null)).toBeNull();
    expect(parseStoredCustom("")).toBeNull();
    expect(parseStoredCustom("{")).toBeNull();
    expect(parseStoredCustom("null")).toBeNull();
    expect(parseStoredCustom('"text"')).toBeNull();
    expect(parseStoredCustom('{"workMinutes":"40","breakMinutes":8}')).toBeNull();
    expect(
      parseStoredCustom(JSON.stringify({ workMinutes: 500, breakMinutes: 8 }))
    ).toBeNull();
  });
});
