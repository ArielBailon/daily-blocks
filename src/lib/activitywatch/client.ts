import { categorizeRules, type CategorizeRule } from "./categories";
import { AW_TIMEOUT_MS, AW_URL } from "./config";
import { buildQuery, findBuckets, type AwBuckets } from "./query";

export type AwConnection = { buckets: AwBuckets; rules: CategorizeRule[] };

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

// Cheap liveness check while connected.
export async function ping(): Promise<void> {
  await getJson("/api/0/info");
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
