import { z } from "zod";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const templateTaskInput = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(200),
  suggestedTime: z
    .string()
    .trim()
    .regex(timePattern, "Formato de hora inválido (HH:MM)")
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const templateInput = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  tasks: z.array(templateTaskInput),
  recurrence: z.array(z.number().int().min(0).max(6)).max(7).default([]),
  isDefault: z.boolean().default(false),
});

export type TemplateInput = z.infer<typeof templateInput>;
