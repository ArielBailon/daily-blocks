import { describe, expect, it } from "vitest";
import { plannedVolume, volumeStatus, weeklyVolume } from "./volume";

describe("weeklyVolume", () => {
  it("counts direct sets as 1 and indirect as 0.5", () => {
    const volume = weeklyVolume([
      { muscles: { pecho: 1, deltFront: 0.5, triceps: 0.5 }, completedSets: 3 },
      { muscles: { triceps: 1 }, completedSets: 4 },
    ]);
    expect(volume.pecho).toBe(3);
    expect(volume.deltFront).toBe(1.5);
    expect(volume.triceps).toBe(5.5);
    expect(volume.espalda).toBe(0);
  });

  it("is all zeros with nothing logged", () => {
    expect(Object.values(weeklyVolume([])).every((v) => v === 0)).toBe(true);
  });
});

describe("plannedVolume", () => {
  const planned = plannedVolume();

  it("derives the weekly plan from the routine", () => {
    // Push: 3 incline + 3 flat + 3 flies; Upper: 3 incline + 3 flies.
    expect(planned.pecho).toBe(15);
    // Lateral raises 5 (push) + 5 (pull) + 6 (upper), plus 3 x 0.5 from the shoulder press.
    expect(planned.deltLat).toBe(17.5);
  });
});

describe("volumeStatus", () => {
  const landmark = { mev: 8, mavHigh: 20 };

  it("classifies against MEV and the top of MAV", () => {
    expect(volumeStatus(7.5, landmark)).toBe("below_mev");
    expect(volumeStatus(8, landmark)).toBe("in_mav");
    expect(volumeStatus(20, landmark)).toBe("in_mav");
    expect(volumeStatus(20.5, landmark)).toBe("above_mav");
  });
});
