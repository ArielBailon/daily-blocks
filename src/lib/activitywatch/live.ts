import { shouldShowAlert } from "./summary";

// Two events of the same app this far apart are separate stretches of use.
const STREAK_GAP_MS = 60_000;

type WindowEvent = { startMs: number; endMs: number; app: string };

function readEvent(value: unknown): WindowEvent | null {
  if (typeof value !== "object" || value === null) return null;
  const { timestamp, duration, data } = value as Record<string, unknown>;
  if (typeof timestamp !== "string" || typeof duration !== "number") return null;
  if (typeof data !== "object" || data === null) return null;
  const app = (data as Record<string, unknown>).app;
  const startMs = Date.parse(timestamp);
  if (typeof app !== "string" || Number.isNaN(startMs)) return null;
  return { startMs, endMs: startMs + duration * 1000, app };
}

// When the current app came into focus: window events arrive newest first and
// change with every tab or document title, so consecutive events of the same
// app are joined. Returns an ISO timestamp, or null for no usable events.
export function appStreakStart(events: unknown): string | null {
  if (!Array.isArray(events)) return null;
  const newest = readEvent(events[0]);
  if (!newest) return null;
  let start = newest;
  for (const value of events.slice(1)) {
    const older = readEvent(value);
    if (!older || older.app !== newest.app) break;
    if (start.startMs - older.endMs > STREAK_GAP_MS) break;
    start = older;
  }
  return new Date(start.startMs).toISOString();
}

export type DistractionAlert = {
  key: string;
  kind: "session" | "block";
  minutes: number;
};

// The banner to show, if any: the focus session first, then the current DEEP
// block. A dismissed key stays quiet until a new session or block replaces it.
export function pickAlert({
  session,
  block,
  dismissed,
}: {
  session: { id: number; minutes: number } | null;
  block: { dateKey: string; startTime: string; minutes: number } | null;
  dismissed: ReadonlySet<string>;
}): DistractionAlert | null {
  const candidates: DistractionAlert[] = [];
  if (session) {
    candidates.push({ key: `session:${session.id}`, kind: "session", minutes: session.minutes });
  }
  if (block) {
    candidates.push({
      key: `block:${block.dateKey}:${block.startTime}`,
      kind: "block",
      minutes: block.minutes,
    });
  }
  return (
    candidates.find((c) =>
      shouldShowAlert({
        minutes: c.minutes,
        key: c.key,
        dismissedKey: dismissed.has(c.key) ? c.key : null,
      })
    ) ?? null
  );
}
