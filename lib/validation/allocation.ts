import { z } from "zod";

export const createAssignmentSchema = z.object({
  employeeId: z.uuid(),
  projectId: z.uuid("Select a project."),
  siteId: z.uuid().optional().or(z.literal("")),
  projectRoleId: z.uuid().optional().or(z.literal("")),
  allocationPercentage: z.coerce.number().int().min(1).max(100),
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;

export const endAssignmentSchema = z.object({
  assignmentId: z.uuid(),
  endDate: z.string().trim().min(1, "End date is required."),
});
export type EndAssignmentInput = z.infer<typeof endAssignmentSchema>;

export const availabilityOverrideSchema = z.object({
  employeeId: z.uuid(),
  status: z.enum([
    "IN_PROJECT",
    "FREE",
    "PARTIALLY_ALLOCATED",
    "TEMPORARILY_UNAVAILABLE",
    "ON_LEAVE",
    "INACTIVE",
  ]),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
  effectiveFrom: z.string().trim().min(1),
  effectiveUntil: z.string().trim().optional().or(z.literal("")),
});
export type AvailabilityOverrideInput = z.infer<
  typeof availabilityOverrideSchema
>;

export const listAvailabilityQuerySchema = z.object({
  search: z.string().max(255).optional(),
  departmentId: z.uuid().optional(),
  designationId: z.uuid().optional(),
  projectId: z.uuid().optional(),
  siteId: z.uuid().optional(),
  status: z
    .enum([
      "IN_PROJECT",
      "FREE",
      "PARTIALLY_ALLOCATED",
      "TEMPORARILY_UNAVAILABLE",
      "ON_LEAVE",
      "INACTIVE",
    ])
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListAvailabilityQuery = z.infer<typeof listAvailabilityQuerySchema>;
