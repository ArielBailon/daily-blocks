// The single user's time zone. "Today" must not depend on the server's zone
// (Vercel runs in UTC and reserves the TZ env var).
const APP_TIME_ZONE = "America/Guayaquil";

const calendarDayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function resolveToday(now: Date = new Date()) {
  const parts = calendarDayFormat.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const weekday = date.getUTCDay();
  return { date, weekday };
}
