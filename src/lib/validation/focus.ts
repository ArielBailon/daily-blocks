import { z } from "zod";
import { CUSTOM_LIMITS, FOCUS_PRESET_KEYS } from "@/lib/focus/config";

const blockId = z
  .number("El bloque es obligatorio")
  .int("El bloque es inválido")
  .positive("El bloque es inválido");

const FIXED_PRESET_ERROR = "Con un preset fijo no se envían minutos";

export const startFocusInput = z.discriminatedUnion(
  "preset",
  [
    z.strictObject({
      preset: z.literal("CUSTOM"),
      blockId,
      workMinutes: z
        .number("El tiempo de trabajo debe ser un número")
        .int("El tiempo de trabajo debe ser entero")
        .min(
          CUSTOM_LIMITS.workMin,
          `El trabajo debe durar al menos ${CUSTOM_LIMITS.workMin} minutos`
        )
        .max(
          CUSTOM_LIMITS.workMax,
          `El trabajo no puede superar ${CUSTOM_LIMITS.workMax} minutos`
        ),
      breakMinutes: z
        .number("El descanso debe ser un número")
        .int("El descanso debe ser entero")
        .min(CUSTOM_LIMITS.breakMin, "El descanso no puede ser negativo")
        .max(
          CUSTOM_LIMITS.breakMax,
          `El descanso no puede superar ${CUSTOM_LIMITS.breakMax} minutos`
        ),
    }),
    z.strictObject(
      { preset: z.enum(["CLASSIC", "DEEP_2", "DEEP_3"]), blockId },
      FIXED_PRESET_ERROR
    ),
  ],
  `El preset debe ser uno de: ${FOCUS_PRESET_KEYS.join(", ")}`
);

export const FOCUS_ACTIONS = [
  "pause",
  "resume",
  "finish",
  "abandon",
  "skipBreak",
] as const;

export const focusActionInput = z.object({
  action: z.enum(FOCUS_ACTIONS, "Acción inválida"),
});
