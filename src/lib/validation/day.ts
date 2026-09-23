import { z } from "zod";
import { TIME_PATTERN, toMinutes } from "@/lib/blocks";

const blockTime = z
  .string("La hora es obligatoria")
  .regex(TIME_PATTERN, "Las horas deben terminar en :00 o :30");

export const generateDayInput = z
  .object({
    startTime: blockTime,
    endTime: blockTime,
    confirmRemoval: z.boolean().optional(),
  })
  .refine((v) => toMinutes(v.startTime) < toMinutes(v.endTime), {
    message: "La hora de inicio debe ser menor que la de fin",
  });

export const blockUpdateInput = z
  .object({
    activity: z
      .string("La actividad debe ser texto")
      .trim()
      .max(200, "La actividad no puede superar 200 caracteres")
      .optional(),
    completed: z.boolean("El estado del bloque debe ser verdadero o falso").optional(),
  })
  .refine((v) => v.activity !== undefined || v.completed !== undefined, {
    message: "No hay cambios que guardar",
  });
