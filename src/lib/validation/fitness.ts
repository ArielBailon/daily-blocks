import { z } from "zod";
import { parseDateKey } from "@/lib/date";

export const ROUTINE_DAY_KEYS = ["push", "pull", "legsA", "upper", "legsB"] as const;

const dateKey = z
  .string("La fecha debe ser texto")
  .refine((v) => parseDateKey(v) !== null, "Fecha inválida (usa YYYY-MM-DD)");

export const createSessionInput = z.object({
  routineDayKey: z.enum(ROUTINE_DAY_KEYS, "Día de rutina inválido"),
});

const setInput = z.object({
  weightKg: z
    .number("El peso debe ser un número")
    .min(0, "El peso no puede ser negativo")
    .max(1000, "El peso es demasiado alto")
    .nullable(),
  reps: z
    .number("Las repeticiones deben ser un número")
    .int("Las repeticiones deben ser un entero")
    .min(0, "Las repeticiones no pueden ser negativas")
    .max(1000, "Las repeticiones son demasiadas")
    .nullable(),
  completed: z.boolean("El estado de la serie debe ser verdadero o falso"),
});

const checklist = z
  .array(z.number().int().min(0).max(50), "El checklist debe ser una lista")
  .max(50);

// `sets` replaces the whole set list of that exercise; setNumber is the position + 1.
export const sessionUpdateInput = z
  .object({
    warmupChecked: checklist.optional(),
    cooldownChecked: checklist.optional(),
    exercises: z
      .array(
        z.object({
          id: z.number().int(),
          sets: z
            .array(setInput)
            .min(1, "Cada ejercicio necesita al menos una serie")
            .max(30, "Máximo 30 series por ejercicio"),
        })
      )
      .max(40)
      .optional(),
    addExercise: z.object({ exerciseId: z.number().int() }).optional(),
    removeExercise: z.object({ id: z.number().int() }).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No hay cambios que guardar",
  });

export const bodyWeightInput = z.object({
  date: dateKey.optional(),
  kg: z
    .number("El peso debe ser un número")
    .min(20, "El peso debe ser de al menos 20 kg")
    .max(300, "El peso no puede superar 300 kg"),
});

export const bodyWeightQuery = z.object({
  from: dateKey.optional(),
  to: dateKey.optional(),
  limit: z.coerce.number("limit debe ser un número").int().min(1, "limit debe ser al menos 1").max(500, "limit no puede superar 500").optional(),
});

const kg = (label: string) =>
  z.number(`${label} debe ser un número`).min(20).max(300);

export const goalUpdateInput = z
  .object({
    startKg: kg("El peso inicial"),
    goalLowKg: kg("La meta baja"),
    goalHighKg: kg("La meta alta"),
    targetRateKgPerWeek: z
      .number("El ritmo debe ser un número")
      .min(0.05, "El ritmo debe ser mayor a 0")
      .max(2, "El ritmo no puede superar 2 kg por semana"),
    phase: z.enum(["CUT", "BULK"], "Fase inválida"),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "No hay cambios que guardar",
  });

export const historyQuery = z.object({
  limit: z.coerce.number("limit debe ser un número").int().min(1, "limit debe ser al menos 1").max(50, "limit no puede superar 50").optional(),
  cursor: z.coerce.number("cursor inválido").int().positive("cursor inválido").optional(),
});

export const v1RangeQuery = z
  .object({ from: dateKey.optional(), to: dateKey.optional() })
  .refine((v) => !v.from || !v.to || v.from <= v.to, {
    message: "from no puede ser posterior a to",
  });

export const v1WeekQuery = z.object({ week: dateKey.optional() });

export const v1ProgressionQuery = z.object({
  exercise: z.string("Falta el parámetro exercise").min(1, "Falta el parámetro exercise"),
  limit: z.coerce.number("limit debe ser un número").int().min(1, "limit debe ser al menos 1").max(200, "limit no puede superar 200").optional(),
});
