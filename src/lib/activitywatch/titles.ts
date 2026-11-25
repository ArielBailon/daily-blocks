export type TitleTime = { app: string; title: string; seconds: number };
export type DetailTime = { label: string; seconds: number };

// Sites and editors put their name last: "Feed | LinkedIn", "setsuko - Twitch",
// "Inicio / X", "file - daily-blocks - Visual Studio Code".
const SEPARATOR = / (?:-|–|—|\||\/|·) /;

function segments(title: string): string[] {
  return title
    .split(SEPARATOR)
    .map((s) => s.trim())
    .filter(Boolean);
}

// The trailing segment most of an app's titles share ("Google Chrome",
// "Visual Studio Code"): the app's own name, not what was open in it.
function appSuffix(titles: string[]): string | null {
  const counts = new Map<string, number>();
  for (const title of titles) {
    const parts = segments(title);
    if (parts.length < 2) continue;
    const last = parts[parts.length - 1];
    counts.set(last, (counts.get(last) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [suffix, count] of counts) {
    if (count > bestCount) [best, bestCount] = [suffix, count];
  }
  return bestCount * 2 > titles.length ? best : null;
}

export const UNTITLED = "Sin título";

// What was open in each app, grouped by the last part of the window title
// once the app's own name is dropped: the site in a browser, the project in an
// editor. Longest first.
export function groupTitles(titles: TitleTime[]): Map<string, DetailTime[]> {
  const byApp = new Map<string, TitleTime[]>();
  for (const t of titles) {
    const list = byApp.get(t.app);
    if (list) list.push(t);
    else byApp.set(t.app, [t]);
  }

  const out = new Map<string, DetailTime[]>();
  for (const [app, list] of byApp) {
    const suffix = appSuffix(list.map((t) => t.title));
    const totals = new Map<string, number>();
    for (const { title, seconds } of list) {
      let parts = segments(title);
      if (suffix && parts.length > 1 && parts[parts.length - 1] === suffix) {
        parts = parts.slice(0, -1);
      }
      // A window titled only with the app's name says nothing more.
      const label = parts.length === 0 || parts.join() === suffix ? UNTITLED : parts[parts.length - 1];
      totals.set(label, (totals.get(label) ?? 0) + seconds);
    }
    out.set(
      app,
      [...totals]
        .map(([label, seconds]) => ({ label, seconds }))
        .sort((a, b) => b.seconds - a.seconds)
    );
  }
  return out;
}
