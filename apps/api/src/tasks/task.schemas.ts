import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "./task.types.js";

const optionalDate = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: optionalDate.nullable().optional(),
  origin: z.string().trim().max(200).optional(),
}).strict();

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueAt: optionalDate.nullable().optional(),
  origin: z.string().trim().max(200).nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Informe ao menos um campo para atualização.",
});

export const taskFilterSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
}).strict();
