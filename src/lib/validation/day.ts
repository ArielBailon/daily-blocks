import { z } from "zod";
import { TIME_PATTERN, toMinutes } from "@/lib/blocks";
import { BLOCK_TAGS } from "@/lib/block-tags";

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
    tag: z.enum(BLOCK_TAGS, "Etiqueta inválida").nullable().optional(),
  })
  .refine(
    (v) =>
      v.activity !== undefined ||
      v.completed !== undefined ||
      v.tag !== undefined,
    { message: "No hay cambios que guardar" }
  );

export const miscTasksInput = z.object({
  tasks: z
    .array(
      z
        .string("La tarea debe ser texto")
        .trim()
        .min(1, "La tarea no puede estar vacía")
        .max(200, "La tarea no puede superar 200 caracteres"),
      "Las tareas deben ser una lista"
    )
    .max(50, "Máximo 50 tareas"),
});
