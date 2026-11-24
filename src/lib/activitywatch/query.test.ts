import { describe, expect, it } from "vitest";
import { categorizeRules, DEFAULT_CATEGORIES } from "./categories";
import { buildQuery, findBuckets } from "./query";

describe("categorizeRules", () => {
  it("keeps regex classes with their ignore_case flag", () => {
    const rules = categorizeRules([
      { name: ["Work"], rule: { type: "regex", regex: "Docs" } },
      {
        name: ["Media", "Music"],
        rule: { type: "regex", regex: "Spotify", ignore_case: true },
      },
    ]);
    expect(rules).toEqual([
      [["Work"], { type: "regex", regex: "Docs" }],
      [["Media", "Music"], { type: "regex", regex: "Spotify", ignore_case: true }],
    ]);
  });

  it("drops parents without a rule and empty regexes", () => {
    const rules = categorizeRules([
      { name: ["Media"], rule: { type: "none" } },
      { name: ["Uncategorized"], rule: { type: null } },
      { name: ["Work"], rule: { type: "regex", regex: "" } },
      { name: ["Comms", "IM"], rule: { type: "regex", regex: "Slack" } },
    ]);
    expect(rules).toEqual([[["Comms", "IM"], { type: "regex", regex: "Slack" }]]);
  });

  it("falls back to the defaults when nothing is usable", () => {
    expect(categorizeRules(undefined)).toBe(DEFAULT_CATEGORIES);
    expect(categorizeRules([])).toBe(DEFAULT_CATEGORIES);
    expect(categorizeRules([{ name: "Work", rule: {} }, null])).toBe(
      DEFAULT_CATEGORIES
    );
  });
});

describe("findBuckets", () => {
  const buckets = {
    "aw-watcher-afk_AbsPC": { last_updated: "2026-11-24T15:42:14Z" },
    "aw-watcher-window_AbsPC": { last_updated: "2026-11-24T15:42:08Z" },
    "aw-watcher-web-chrome": { last_updated: "2026-09-12T14:44:00Z" },
    "aw-watcher-web-chrome_AbsPC": { last_updated: "2026-11-24T15:41:19Z" },
    "aw-stopwatch": { last_updated: "2026-09-12T16:00:32Z" },
  };

  it("prefers the buckets of this host over a stale one", () => {
    expect(findBuckets(buckets, "AbsPC")).toEqual({
      window: "aw-watcher-window_AbsPC",
      afk: "aw-watcher-afk_AbsPC",
      web: "aw-watcher-web-chrome_AbsPC",
    });
  });

  it("falls back to the latest prefix match for another hostname", () => {
    expect(
      findBuckets(
        {
          "aw-watcher-window_old": { last_updated: "2026-01-01T00:00:00Z" },
          "aw-watcher-window_new": { last_updated: "2026-11-01T00:00:00Z" },
          "aw-watcher-afk_new": { last_updated: "2026-11-01T00:00:00Z" },
        },
        "renamed"
      )
    ).toEqual({
      window: "aw-watcher-window_new",
      afk: "aw-watcher-afk_new",
      web: null,
    });
  });

  it("is null without a window or AFK bucket", () => {
    expect(findBuckets({ "aw-watcher-afk_AbsPC": {} }, "AbsPC")).toBeNull();
    expect(findBuckets({ "aw-watcher-window_AbsPC": {} }, "AbsPC")).toBeNull();
    expect(findBuckets(null, "AbsPC")).toBeNull();
  });
});

describe("buildQuery", () => {
  const statements = buildQuery(
    { window: "aw-watcher-window_AbsPC", afk: "aw-watcher-afk_AbsPC", web: null },
    [[["Media", "Video"], { type: "regex", regex: "YouTube" }]]
  );

  it("embeds bucket ids and rules as JSON", () => {
    expect(statements[0]).toBe('window = query_bucket("aw-watcher-window_AbsPC");');
    expect(statements[1]).toBe('afk = query_bucket("aw-watcher-afk_AbsPC");');
    expect(statements[4]).toBe(
      'active = categorize(active, [[["Media","Video"],{"type":"regex","regex":"YouTube"}]]);'
    );
  });

  it("filters to not-afk time and has no // comments", () => {
    expect(statements.join("\n")).toContain(
      'filter_keyvals(afk, "status", ["not-afk"])'
    );
    expect(statements.join("\n")).not.toContain("//");
  });
});
