import { z } from "zod";
import { TIME_PATTERN } from "@/lib/blocks";
import { BLOCK_TAGS } from "@/lib/block-tags";

const presetBlock = z.object({
  startTime: z
    .string("La hora es obligatoria")
    .regex(TIME_PATTERN, "Las horas deben terminar en :00 o :30"),
  activity: z
    .string("La actividad debe ser texto")
    .trim()
    .max(200, "La actividad no puede superar 200 caracteres"),
  tag: z.enum(BLOCK_TAGS, "Etiqueta inválida").nullable(),
});

export const presetBlocks = z
  .array(presetBlock, "Los bloques deben ser una lista")
  .max(48, "Máximo 48 bloques")
  .refine(
    (blocks) => new Set(blocks.map((b) => b.startTime)).size === blocks.length,
    { message: "Hay horas repetidas" }
  );

const presetName = z
  .string("El nombre debe ser texto")
  .trim()
  .min(1, "El nombre no puede estar vacío")
  .max(50, "El nombre no puede superar 50 caracteres");

export const createPresetInput = z.object({
  name: presetName,
  copyFromId: z.number().int().positive().optional(),
});

export const updatePresetInput = z
  .object({
    name: presetName.optional(),
    blocks: presetBlocks.optional(),
    isDefault: z
      .literal(true, "Solo se puede marcar como predeterminada")
      .optional(),
  })
  .refine(
    (v) =>
      v.name !== undefined ||
      v.blocks !== undefined ||
      v.isDefault !== undefined,
    { message: "No hay cambios que guardar" }
  );
