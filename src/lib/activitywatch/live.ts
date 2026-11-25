import { shouldShowAlert } from "./summary";

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
