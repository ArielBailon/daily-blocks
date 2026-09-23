export function resolveToday(now: Date = new Date()) {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const weekday = now.getDay();
  return { date, weekday };
}
