import { z } from "zod";

export const dailyTaskCompletionInput = z.object({
  completed: z.boolean("El estado de la tarea es obligatorio"),
});
