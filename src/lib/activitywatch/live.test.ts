import { describe, expect, it } from "vitest";
import { pickAlert } from "./live";

describe("pickAlert", () => {
  const none = new Set<string>();
  const session = (minutes: number) => ({ id: 7, minutes });
  const block = (minutes: number) => ({ dateKey: "2026-11-24", startTime: "09:00", minutes });

  it("is null at or below the threshold", () => {
    expect(pickAlert({ session: session(4), block: block(5), dismissed: none })).toBeNull();
  });

  it("alerts for the session or the block over the threshold", () => {
    expect(pickAlert({ session: session(6), block: null, dismissed: none })).toEqual({
      key: "session:7",
      kind: "session",
      minutes: 6,
    });
    expect(pickAlert({ session: session(2), block: block(8), dismissed: none })).toEqual({
      key: "block:2026-11-24:09:00",
      kind: "block",
      minutes: 8,
    });
  });

  it("prefers the session when both qualify", () => {
    expect(pickAlert({ session: session(6), block: block(9), dismissed: none })?.kind).toBe(
      "session"
    );
  });

  it("falls back to the block after the session is dismissed", () => {
    expect(
      pickAlert({ session: session(6), block: block(9), dismissed: new Set(["session:7"]) })?.kind
    ).toBe("block");
    expect(
      pickAlert({
        session: session(6),
        block: block(9),
        dismissed: new Set(["session:7", "block:2026-11-24:09:00"]),
      })
    ).toBeNull();
  });
});
