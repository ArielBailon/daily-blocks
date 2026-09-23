// Pure helpers for splitting a day into 30-minute blocks. Times are "HH:MM" (24h).

export const BLOCK_MINUTES = 30;

// Range boundaries must fall on :00 or :30.
export const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(total: number): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

// Block start times covering [start, end): the start is included, the end is not.
export function buildBlockTimes(start: string, end: string): string[] {
  const times: string[] = [];
  const last = toMinutes(end);
  for (let t = toMinutes(start); t < last; t += BLOCK_MINUTES) {
    times.push(fromMinutes(t));
  }
  return times;
}

export function isValidRange(start: string, end: string): boolean {
  return (
    TIME_PATTERN.test(start) &&
    TIME_PATTERN.test(end) &&
    toMinutes(start) < toMinutes(end)
  );
}

export function isOnTheHour(time: string): boolean {
  return time.endsWith(":00");
}
