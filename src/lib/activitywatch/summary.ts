import { DISTRACTION_ALERT_MINUTES, DISTRACTION_CATEGORIES } from "./config";
import { groupTitles, type DetailTime } from "./titles";

export type CategoryTime = { path: string[]; seconds: number; percent: number };
export type AppTime = { app: string; seconds: number };

export type PeriodSummary = {
  periodSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
  categories: CategoryTime[];
  apps: AppTime[];
  // What was open in each app (site, project…), longest first.
  appDetails: Map<string, DetailTime[]>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Durations per key from one merged event list; malformed events are skipped
// because the response comes from outside the app.
function readDurations<K>(
  events: unknown,
  readKey: (data: Record<string, unknown>) => K | null
): { key: K; seconds: number }[] {
  if (!Array.isArray(events)) return [];
  const out: { key: K; seconds: number }[] = [];
  for (const event of events) {
    if (!isRecord(event) || !isRecord(event.data)) continue;
    const seconds = event.duration;
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
      continue;
    }
    const key = readKey(event.data);
    if (key !== null) out.push({ key, seconds });
  }
  return out;
}

const readCategory = (data: Record<string, unknown>) => {
  const path = data.$category;
  return Array.isArray(path) && path.every((p) => typeof p === "string")
    ? (path as string[])
    : null;
};

const readApp = (data: Record<string, unknown>) =>
  typeof data.app === "string" ? data.app : null;

const readAppTitle = (data: Record<string, unknown>) =>
  typeof data.app === "string"
    ? { app: data.app, title: typeof data.title === "string" ? data.title : "" }
    : null;

// One query result (`{ apps, cats }`) for a period of `periodSeconds`.
// ActivityWatch does not clip events to the period, so an active total longer
// than the period is scaled down. Idle is whatever the period has left (AFK,
// PC off or ActivityWatch not running); percentages are of the period.
export function summarizePeriod(result: unknown, periodSeconds: number): PeriodSummary {
  const data = isRecord(result) ? result : {};
  const cats = readDurations(data.cats, readCategory);
  const apps = readDurations(data.apps, readApp);
  const titles = readDurations(data.titles, readAppTitle);
  const rawActive = cats.reduce((sum, c) => sum + c.seconds, 0);
  const scale = rawActive > periodSeconds ? periodSeconds / rawActive : 1;
  const activeSeconds = rawActive * scale;

  const bySeconds = (a: { seconds: number }, b: { seconds: number }) =>
    b.seconds - a.seconds;

  return {
    periodSeconds,
    activeSeconds,
    idleSeconds: Math.max(0, periodSeconds - activeSeconds),
    categories: cats
      .map(({ key, seconds }) => ({
        path: key,
        seconds: seconds * scale,
        percent: periodSeconds > 0 ? ((seconds * scale) / periodSeconds) * 100 : 0,
      }))
      .sort(bySeconds),
    apps: apps
      .map(({ key, seconds }) => ({ app: key, seconds: seconds * scale }))
      .sort(bySeconds),
    appDetails: groupTitles(
      titles.map(({ key, seconds }) => ({ ...key, seconds: seconds * scale }))
    ),
  };
}

function isUnder(path: string[], parent: readonly string[]): boolean {
  return path.length >= parent.length && parent.every((p, i) => path[i] === p);
}

export function distractionSeconds(categories: CategoryTime[]): number {
  return categories
    .filter((c) => DISTRACTION_CATEGORIES.some((d) => isUnder(c.path, d)))
    .reduce((sum, c) => sum + c.seconds, 0);
}

export function distractionMinutes(categories: CategoryTime[]): number {
  return Math.floor(distractionSeconds(categories) / 60);
}

// `key` names what is being watched (a focus session or a DEEP block).
// Distraction only grows within one key, so after a dismissal the banner
// returns only for a new key that crosses the threshold.
export function shouldShowAlert({
  minutes,
  key,
  dismissedKey,
}: {
  minutes: number;
  key: string;
  dismissedKey: string | null;
}): boolean {
  return minutes > DISTRACTION_ALERT_MINUTES && dismissedKey !== key;
}
