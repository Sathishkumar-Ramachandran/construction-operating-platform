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

export const setBudgetLineSchema = z.object({
  id: z.uuid().optional(),
  projectId: z.uuid(),
  category: z.enum(["LABOUR", "MATERIAL", "EQUIPMENT", "SUBCONTRACT", "OVERHEAD"]),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  budgetedAmount: z.coerce.number().nonnegative(),
  actualAmount: z.coerce.number().nonnegative().optional(),
});
export type SetBudgetLineInput = z.infer<typeof setBudgetLineSchema>;

export const documentUploadRequestSchema = z.object({
  projectId: z.uuid().optional(),
  leadId: z.uuid().optional(),
  documentTypeId: z.uuid(),
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(150),
  fileSizeBytes: z.coerce.number().int().positive(),
});
export type DocumentUploadRequestInput = z.infer<typeof documentUploadRequestSchema>;

export const confirmDocumentUploadSchema = documentUploadRequestSchema.extend({
  storageKey: z.string().trim().min(1),
  checksum: z.string().trim().min(1),
  isConfidential: z.boolean(),
});
export type ConfirmDocumentUploadInput = z.infer<typeof confirmDocumentUploadSchema>;

export const createProgressClaimSchema = z.object({
  projectId: z.uuid(),
  claimPeriodTo: z.string().trim().min(1, "Claim period end date is required."),
  claimedAmount: z.coerce.number().positive(),
  retentionPercentage: z.coerce.number().min(0).max(100).default(5),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CreateProgressClaimInput = z.infer<typeof createProgressClaimSchema>;

export const createDefectItemSchema = z.object({
  projectId: z.uuid(),
  siteId: z.uuid().optional().or(z.literal("")),
  description: z.string().trim().min(3, "Description is required.").max(1000),
  dueDate: z.string().trim().optional().or(z.literal("")),
});
export type CreateDefectItemInput = z.infer<typeof createDefectItemSchema>;

export const changeDefectItemStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RECTIFIED", "DISPUTED", "CLOSED"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type ChangeDefectItemStatusInput = z.infer<typeof changeDefectItemStatusSchema>;
