// ActivityWatch runs on the user's PC, so only the browser there can reach it.
export const AW_URL = (
  process.env.NEXT_PUBLIC_AW_URL || "http://localhost:5600"
).replace(/\/+$/, "");

// Full category paths: "Video" alone would also match "Work > Video".
export const DISTRACTION_CATEGORIES: readonly (readonly string[])[] = [
  ["Media", "Games"],
  ["Media", "Video"],
  ["Media", "Social Media"],
  ["Media", "Music"],
];

export const DISTRACTION_ALERT_MINUTES = 5;

export const AW_TIMEOUT_MS = 2_000;
export const CURRENT_POLL_MS = 10_000;
export const SUMMARY_POLL_MS = 60_000;
// Slower while unavailable: every failed request logs a CORS or network error
// in the console.
export const UNAVAILABLE_RETRY_MS = 60_000;
// A window event that ended longer ago than this is not "current" anymore.
export const STALE_WINDOW_MS = 120_000;
