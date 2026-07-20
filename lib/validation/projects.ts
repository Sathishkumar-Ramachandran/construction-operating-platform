import { z } from "zod";

const projectFieldsSchema = {
  code: z.string().trim().min(2).max(40).regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, - and _ only."),
  name: z.string().trim().min(2).max(150),
  clientName: z.string().trim().max(150).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  estimatedBudget: z.coerce.number().nonnegative().optional(),
  startDate: z.string().trim().optional().or(z.literal("")),
  endDate: z.string().trim().optional().or(z.literal("")),
};

export const createProjectSchema = z.object(projectFieldsSchema);
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({ id: z.uuid(), ...projectFieldsSchema });
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const activateProjectSchema = z.object({ id: z.uuid() });
export type ActivateProjectInput = z.infer<typeof activateProjectSchema>;

export const closeProjectSchema = z.object({
  id: z.uuid(),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CloseProjectInput = z.infer<typeof closeProjectSchema>;

export const listProjectsQuerySchema = z.object({
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
  search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(200),
});
/** `assignedEmployeeId` is server-computed (Manager/Team Member scoping in
 * `app/(protected)/projects/page.tsx`), never user-supplied — intentionally
 * not part of the Zod schema above. */
export type ListProjectsQuery = Partial<z.infer<typeof listProjectsQuerySchema>> & {
  assignedEmployeeId?: string;
};

export const createSiteSchema = z.object({
  projectId: z.uuid(),
  code: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(150),
});
export type CreateSiteInput = z.infer<typeof createSiteSchema>;
