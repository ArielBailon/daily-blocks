import { describe, expect, it } from "vitest";
import { BLOCK_TAGS, BLOCK_TAG_LABELS } from "@/lib/block-tags";

describe("block tags", () => {
  it("has a label for every tag", () => {
    for (const tag of BLOCK_TAGS) {
      expect(BLOCK_TAG_LABELS[tag]).toBeTruthy();
    }
    expect(Object.keys(BLOCK_TAG_LABELS).sort()).toEqual([...BLOCK_TAGS].sort());
  });

  it("no longer includes the retired tags", () => {
    const tags: readonly string[] = BLOCK_TAGS;
    for (const retired of ["APPLY", "INTERVIEW", "LINKEDIN", "BED"]) {
      expect(tags).not.toContain(retired);
    }
  });

  it("labels JOB_HUNTING as Job Hunting", () => {
    expect(BLOCK_TAG_LABELS.JOB_HUNTING).toBe("Job Hunting");
  });
});
