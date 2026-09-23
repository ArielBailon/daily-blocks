import { z } from "zod";
import { taskInput } from "@/lib/validation/template";

export const dailyTaskCompletionInput = z.object({
  completed: z.boolean("El estado de la tarea es obligatorio"),
});

export const dailyTaskCreateInput = taskInput;
