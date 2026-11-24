export type CategoryRule = {
  type: "regex";
  regex: string;
  ignore_case?: boolean;
};

// The `[name path, rule]` pairs ActivityWatch's `categorize` query function takes.
export type CategorizeRule = [string[], CategoryRule];

function regex(regex: string, ignoreCase = false): CategoryRule {
  return ignoreCase
    ? { type: "regex", regex, ignore_case: true }
    : { type: "regex", regex };
}

// aw-webui's defaultCategories (src/util/classes.ts), used when the server's
// settings cannot be read. Parents without a rule ("Media", "Comms") are left
// out, as aw-webui does.
export const DEFAULT_CATEGORIES: CategorizeRule[] = [
  [["Work"], regex("Google Docs|Google Sheets|libreoffice|ReText|TextEdit|^Pages$|Obsidian")],
  [
    ["Work", "Programming"],
    regex("GitHub|Stack Overflow|BitBucket|Gitlab|vim|Spyder|^kate$|Ghidra|Scite|iTerm|Visual Studio Code"),
  ],
  [["Work", "Programming", "ActivityWatch"], regex("ActivityWatch|aw-", true)],
  [["Work", "Image"], regex("GIMP|Inkscape")],
  [["Work", "Video"], regex("Kdenlive")],
  [["Work", "Audio"], regex("Audacity")],
  [["Work", "3D"], regex("Blender")],
  [["Media", "Games"], regex("Minecraft|RimWorld")],
  [["Media", "Video"], regex("YouTube|Plex|VLC")],
  [
    ["Media", "Social Media"],
    regex("reddit|Facebook|Twitter|Instagram|devRant|LinkedIn|Hacker News", true),
  ],
  [["Media", "Music"], regex("Spotify|Deezer|Amazon Music", true)],
  [
    ["Comms", "IM"],
    regex("Messenger|Telegram|Signal|WhatsApp|Rambox|Slack|Riot|Element|Discord|Nheko|NeoChat|Mattermost|^Texts$"),
  ],
  [["Comms", "Email"], regex("Gmail|Thunderbird|mutt|alpine|Superhuman")],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// The server's `classes` setting as categorize rules: only classes with a
// non-empty regex (aw-webui's hasMatchableRegex). Anything unusable falls back
// to the defaults.
export function categorizeRules(classes: unknown): CategorizeRule[] {
  if (!Array.isArray(classes)) return DEFAULT_CATEGORIES;
  const rules: CategorizeRule[] = [];
  for (const entry of classes) {
    if (!isRecord(entry) || !isRecord(entry.rule)) continue;
    const { name, rule } = entry;
    if (
      !Array.isArray(name) ||
      name.length === 0 ||
      !name.every((part) => typeof part === "string")
    ) {
      continue;
    }
    if (rule.type !== "regex" || typeof rule.regex !== "string" || rule.regex === "") {
      continue;
    }
    rules.push([name, regex(rule.regex, rule.ignore_case === true)]);
  }
  return rules.length > 0 ? rules : DEFAULT_CATEGORIES;
}
