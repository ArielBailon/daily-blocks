import { describe, expect, it } from "vitest";
import { groupTitles, UNTITLED } from "./titles";

const t = (app: string, title: string, seconds: number) => ({ app, title, seconds });

describe("groupTitles", () => {
  it("groups browser tabs by the site name at the end of the title", () => {
    const groups = groupTitles([
      t("chrome.exe", "Inicio / X - Google Chrome", 600),
      t("chrome.exe", 'Theo en X: "hola - mundo" / X - Google Chrome', 60),
      t("chrome.exe", "setsuko - Twitch - Google Chrome", 300),
      t("chrome.exe", "Feed | LinkedIn - Google Chrome", 30),
      t("chrome.exe", "daily-blocks", 20),
    ]);
    expect(groups.get("chrome.exe")).toEqual([
      { label: "X", seconds: 660 },
      { label: "Twitch", seconds: 300 },
      { label: "LinkedIn", seconds: 30 },
      { label: "daily-blocks", seconds: 20 },
    ]);
  });

  it("groups an editor by project", () => {
    const groups = groupTitles([
      t("Code.exe", "Necesito ajustes - daily-blocks - Visual Studio Code", 50),
      t("Code.exe", "Claude Code - daily-blocks - Visual Studio Code", 50),
      t("Code.exe", "Claude Code - ai-job-search - Visual Studio Code", 10),
    ]);
    expect(groups.get("Code.exe")).toEqual([
      { label: "daily-blocks", seconds: 100 },
      { label: "ai-job-search", seconds: 10 },
    ]);
  });

  it("keeps titles without separators and names empty ones", () => {
    const groups = groupTitles([
      t("olk.exe", "Bandeja de entrada: Ariel - Outlook", 3),
      t("explorer.exe", "", 6),
      t("explorer.exe", "Descargas", 2),
    ]);
    expect(groups.get("olk.exe")).toEqual([{ label: "Bandeja de entrada: Ariel", seconds: 3 }]);
    expect(groups.get("explorer.exe")).toEqual([
      { label: UNTITLED, seconds: 6 },
      { label: "Descargas", seconds: 2 },
    ]);
  });

  it("does not strip a suffix most titles do not share", () => {
    const groups = groupTitles([
      t("app", "a - One", 1),
      t("app", "b - Two", 1),
      t("app", "c - Three", 1),
    ]);
    expect(groups.get("app")?.map((d) => d.label).sort()).toEqual(["One", "Three", "Two"]);
  });
});
