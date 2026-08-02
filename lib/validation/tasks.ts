import { z } from "zod";

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  siteId: z.uuid().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  assignedToEmployeeId: z.uuid(),
  dueDate: z.string().trim().optional().or(z.literal("")),
  parentTaskId: z.uuid().optional().or(z.literal("")),
  wbsCode: z.string().trim().max(30).optional().or(z.literal("")),
  plannedStartDate: z.string().trim().optional().or(z.literal("")),
  plannedEndDate: z.string().trim().optional().or(z.literal("")),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]),
});
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const updateTaskProgressSchema = z.object({
  id: z.uuid(),
  percentComplete: z.coerce.number().int().min(0).max(100),
});
export type UpdateTaskProgressInput = z.infer<typeof updateTaskProgressSchema>;
