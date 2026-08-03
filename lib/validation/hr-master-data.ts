import { z } from "zod";
import { ALL_DOCUMENT_TYPE_SCOPES } from "@/lib/hr/constants";

const codeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters.")
  .max(40)
  .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores only.");

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(150);

export const departmentSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  parentDepartmentId: z.uuid().nullable().optional(),
  managerEmployeeId: z.uuid().nullable().optional(),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const designationSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
  gradeId: z.uuid().nullable().optional(),
  departmentId: z.uuid().nullable().optional(),
  isManagerial: z.boolean().default(false),
  requiredDocumentTypeIds: z.array(z.uuid()).default([]),
});
export type DesignationInput = z.infer<typeof designationSchema>;

export const employmentGradeSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  rank: z.coerce.number().int().min(0).max(999),
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type EmploymentGradeInput = z.infer<typeof employmentGradeSchema>;

export const employmentTypeSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type EmploymentTypeInput = z.infer<typeof employmentTypeSchema>;

export const projectRoleSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ProjectRoleInput = z.infer<typeof projectRoleSchema>;

export const documentTypeSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  appliesTo: z
    .array(z.enum(ALL_DOCUMENT_TYPE_SCOPES))
    .min(1, "Select at least one area this document type applies to."),
  requiresExpiryDate: z.boolean().default(false),
  isConfidential: z.boolean().default(false),
  allowedMimeTypes: z.array(z.string()).min(1),
  maximumFileSizeBytes: z.coerce.number().int().min(1024).max(50 * 1024 * 1024),
  retentionCategory: z.string().trim().max(100).optional().or(z.literal("")),
});
export type DocumentTypeInput = z.infer<typeof documentTypeSchema>;

export const certificationTypeSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  issuingAuthority: z.string().trim().max(200).optional().or(z.literal("")),
  requiresExpiryDate: z.boolean().default(true),
  defaultValidityMonths: z.coerce.number().int().min(1).max(600).nullable().optional(),
  reminderDays: z.array(z.coerce.number().int().min(1).max(365)).default([90, 60, 30, 14, 7]),
});
export type CertificationTypeInput = z.infer<typeof certificationTypeSchema>;

export const toggleActiveSchema = z.object({
  id: z.uuid(),
  isActive: z.boolean(),
});
export type ToggleActiveInput = z.infer<typeof toggleActiveSchema>;
