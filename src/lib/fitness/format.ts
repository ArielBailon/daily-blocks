import { parseDateKey } from "@/lib/date";

// Date keys are UTC midnight of the calendar day, so format in UTC.
const longFormat = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortFormat = new Intl.DateTimeFormat("es", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateLong(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date ? longFormat.format(date) : dateKey;
}

export function formatDateShort(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date ? shortFormat.format(date) : dateKey;
}

export function formatKg(kg: number): string {
  return `${Number(kg.toFixed(2))} kg`;
}

// "60×8", "PC×6" for bodyweight sets.
export function formatSet(weightKg: number, reps: number): string {
  return `${weightKg === 0 ? "PC" : Number(weightKg.toFixed(2))}×${reps}`;
}
