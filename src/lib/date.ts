// The single user's time zone. "Today" must not depend on the server's zone
// (Vercel runs in UTC and reserves the TZ env var).
const APP_TIME_ZONE = "America/Guayaquil";

const calendarDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// The server clock as epoch ms, kept out of components so they stay pure.
export function serverNowMs(): number {
  return Date.now();
}

export function resolveToday(now: Date = new Date()) {
  const parts = calendarDayFormat.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const weekday = date.getUTCDay();
  return { date, weekday };
}

// DailyPlan.date is stored as UTC midnight of the calendar day, so keys use UTC parts.
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseDateKey(key: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates such as 2026-02-30, which Date.UTC rolls over.
  return toDateKey(date) === key ? date : null;
}

const timeOfDayFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// Minutes since local midnight (0-1439) on the America/Guayaquil wall clock,
// whatever zone the server or the browser runs in.
export function localMinutesOfDay(now: Date = new Date()): number {
  const parts = timeOfDayFormat.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return part("hour") * 60 + part("minute");
}

const wallClockFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

// The America/Guayaquil wall clock at `instantMs`, read as if it were UTC.
function wallClockAsUtcMs(instantMs: number): number {
  const parts = wallClockFormat.formatToParts(new Date(instantMs));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second")
  );
}

// The instant when the America/Guayaquil wall clock reads `minutes` after
// midnight of `dateKey`, whatever zone the browser runs in. Minutes past 1439
// roll into the next day.
export function zonedTimeToUtc(dateKey: string, minutes: number): Date {
  const day = parseDateKey(dateKey);
  if (!day) throw new RangeError(`Invalid date key: ${dateKey}`);
  const wallMs = day.getTime() + minutes * 60_000;
  return new Date(wallMs - (wallClockAsUtcMs(wallMs) - wallMs));
}
