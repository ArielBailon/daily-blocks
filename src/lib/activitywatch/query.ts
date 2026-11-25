import type { CategorizeRule } from "./categories";

export type AwBuckets = { window: string; afk: string; web: string | null };

const WINDOW_PREFIX = "aw-watcher-window_";
const AFK_PREFIX = "aw-watcher-afk_";
const WEB_PREFIX = "aw-watcher-web-";

type BucketInfo = { id: string; lastUpdated: string };

function readBuckets(buckets: unknown): BucketInfo[] {
  if (typeof buckets !== "object" || buckets === null) return [];
  return Object.entries(buckets).map(([id, value]) => {
    const lastUpdated =
      typeof value === "object" &&
      value !== null &&
      "last_updated" in value &&
      typeof value.last_updated === "string"
        ? value.last_updated
        : "";
    return { id, lastUpdated };
  });
}

// Bucket ids end in the hostname, so they are found by prefix: the one for
// this host first, otherwise the most recently updated match.
function pick(
  all: BucketInfo[],
  prefix: string,
  isPreferred: (id: string) => boolean
): string | null {
  const matches = all.filter((b) => b.id.startsWith(prefix));
  const preferred = matches.find((b) => isPreferred(b.id));
  if (preferred) return preferred.id;
  const latest = [...matches].sort((a, b) =>
    b.lastUpdated.localeCompare(a.lastUpdated)
  )[0];
  return latest?.id ?? null;
}

export function findBuckets(buckets: unknown, hostname: string): AwBuckets | null {
  const all = readBuckets(buckets);
  const window = pick(all, WINDOW_PREFIX, (id) => id === WINDOW_PREFIX + hostname);
  const afk = pick(all, AFK_PREFIX, (id) => id === AFK_PREFIX + hostname);
  if (!window || !afk) return null;
  const web = pick(all, WEB_PREFIX, (id) => id.endsWith(`_${hostname}`));
  return { window, afk, web };
}

// Active time only: window events intersected with not-afk periods, then
// categorized. Window titles come back only merged per app and title, to show
// what was open in each app; they stay in browser memory. No URL is read.
// ActivityWatch rejects `//` comments, so none are added.
export function buildQuery(buckets: AwBuckets, rules: CategorizeRule[]): string[] {
  return [
    `window = query_bucket(${JSON.stringify(buckets.window)});`,
    `afk = query_bucket(${JSON.stringify(buckets.afk)});`,
    `notafk = filter_keyvals(afk, "status", ["not-afk"]);`,
    `active = filter_period_intersect(window, notafk);`,
    `active = categorize(active, ${JSON.stringify(rules)});`,
    `RETURN = {"apps": sort_by_duration(merge_events_by_keys(active, ["app"])), "cats": sort_by_duration(merge_events_by_keys(active, ["$category"])), "titles": sort_by_duration(merge_events_by_keys(active, ["app", "title"]))};`,
  ];
}
