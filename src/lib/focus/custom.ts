import { CUSTOM_LIMITS } from "./config";

export type CustomResult =
  | { ok: true; workMinutes: number; breakMinutes: number }
  | { ok: false; field: "work" | "break"; message: string };

function toInteger(raw: string): number | null {
  const text = raw.trim();
  if (text === "") return null;
  const value = Number(text);
  return Number.isInteger(value) ? value : null;
}

// Same limits as the server, checked first so the form can explain them.
export function validateCustom(work: string, rest: string): CustomResult {
  const workMinutes = toInteger(work);
  const { workMin, workMax, breakMin, breakMax } = CUSTOM_LIMITS;
  if (workMinutes === null || workMinutes < workMin || workMinutes > workMax) {
    return {
      ok: false,
      field: "work",
      message: `El trabajo debe ser un número entero entre ${workMin} y ${workMax} minutos`,
    };
  }
  const breakMinutes = toInteger(rest);
  if (breakMinutes === null || breakMinutes < breakMin || breakMinutes > breakMax) {
    return {
      ok: false,
      field: "break",
      message: `El descanso debe ser un número entero entre ${breakMin} y ${breakMax} minutos`,
    };
  }
  return { ok: true, workMinutes, breakMinutes };
}

// localStorage can hold anything, so a bad value is dropped rather than trusted.
export function parseStoredCustom(
  raw: string | null
): { work: string; rest: string } | null {
  if (!raw) return null;
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return null;
    const { workMinutes, breakMinutes } = data as Record<string, unknown>;
    if (typeof workMinutes !== "number" || typeof breakMinutes !== "number") {
      return null;
    }
    const result = validateCustom(String(workMinutes), String(breakMinutes));
    return result.ok
      ? { work: String(result.workMinutes), rest: String(result.breakMinutes) }
      : null;
  } catch {
    return null;
  }
}
