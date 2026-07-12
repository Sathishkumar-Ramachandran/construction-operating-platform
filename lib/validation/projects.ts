import { z } from "zod";

export const createProjectSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, - and _ only."),
  name: z.string().trim().min(2).max(150),
  clientName: z.string().trim().max(150).optional().or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const createSiteSchema = z.object({
  projectId: z.uuid(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(150),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
