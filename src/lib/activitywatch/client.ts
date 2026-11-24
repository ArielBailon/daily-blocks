import { categorizeRules, type CategorizeRule } from "./categories";
import { AW_TIMEOUT_MS, AW_URL, STALE_WINDOW_MS } from "./config";
import { buildQuery, findBuckets, type AwBuckets } from "./query";

export type AwConnection = { buckets: AwBuckets; rules: CategorizeRule[] };

// Stays in browser memory only: the title is shown in Ahora behind a toggle.
export type CurrentActivity = {
  app: string;
  title: string;
  since: string;
  afk: boolean;
};

// A failed fetch cannot tell "ActivityWatch is off" from "blocked by CORS";
// callers treat every error the same way.
async function getJson(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${AW_URL}${path}`, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(AW_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ActivityWatch responded ${res.status}`);
  return res.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readClasses(): Promise<unknown> {
  try {
    const settings = await getJson("/api/0/settings");
    return isRecord(settings) ? settings.classes : undefined;
  } catch {
    return undefined;
  }
}

export async function connect(): Promise<AwConnection> {
  const info = await getJson("/api/0/info");
  const hostname = isRecord(info) && typeof info.hostname === "string" ? info.hostname : "";
  // The Python server redirects /api/0/buckets without the slash, and a
  // redirect breaks the CORS request.
  const [all, classes] = await Promise.all([getJson("/api/0/buckets/"), readClasses()]);
  const buckets = findBuckets(all, hostname);
  if (!buckets) throw new Error("ActivityWatch has no window or AFK bucket");
  return { buckets, rules: categorizeRules(classes) };
}

async function lastEvent(bucket: string): Promise<Record<string, unknown> | null> {
  const events = await getJson(
    `/api/0/buckets/${encodeURIComponent(bucket)}/events?limit=1`
  );
  return Array.isArray(events) && isRecord(events[0]) ? events[0] : null;
}

export async function readCurrent(
  connection: AwConnection,
  nowMs: number
): Promise<CurrentActivity | null> {
  const [window, afk] = await Promise.all([
    lastEvent(connection.buckets.window),
    lastEvent(connection.buckets.afk),
  ]);
  if (!window || !isRecord(window.data)) return null;
  const { timestamp, duration, data } = window;
  if (typeof timestamp !== "string" || typeof duration !== "number") return null;
  if (nowMs - (Date.parse(timestamp) + duration * 1000) > STALE_WINDOW_MS) return null;
  return {
    app: typeof data.app === "string" ? data.app : "",
    title: typeof data.title === "string" ? data.title : "",
    since: timestamp,
    afk: isRecord(afk?.data) && afk.data.status === "afk",
  };
}

// One raw result per period, in the same order.
export async function queryPeriods(
  connection: AwConnection,
  periods: string[]
): Promise<unknown[]> {
  const results = await getJson("/api/0/query/", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: buildQuery(connection.buckets, connection.rules),
      timeperiods: periods,
    }),
  });
  if (!Array.isArray(results) || results.length !== periods.length) {
    throw new Error("Unexpected ActivityWatch query response");
  }
  return results;
}
