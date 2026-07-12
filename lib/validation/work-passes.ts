import { z } from "zod";
import { WORK_PASS_TYPES } from "@/lib/hr/constants";

export const createWorkPassSchema = z.object({
  employeeId: z.uuid(),
  passType: z.enum(WORK_PASS_TYPES),
  passNumber: z.string().trim().min(1).max(60),
  issuingCountry: z.string().trim().min(1).max(100),
  issuingAuthority: z.string().trim().min(1).max(200),
  issueDate: z.string().trim().min(1),
  expiryDate: z.string().trim().min(1),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateWorkPassInput = z.infer<typeof createWorkPassSchema>;

export const documentUploadRequestSchema = z.object({
  employeeId: z.uuid(),
  documentTypeId: z.uuid(),
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  fileSizeBytes: z.coerce.number().int().min(1),
});
export type DocumentUploadRequestInput = z.infer<typeof documentUploadRequestSchema>;

export const confirmDocumentUploadSchema = z.object({
  employeeId: z.uuid(),
  documentTypeId: z.uuid(),
  storageKey: z.string().trim().min(1),
  originalFileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(100),
  fileSizeBytes: z.coerce.number().int().min(1),
  checksum: z.string().trim().min(1),
  issueDate: z.string().trim().optional().or(z.literal("")),
  expiryDate: z.string().trim().optional().or(z.literal("")),
  documentNumber: z.string().trim().max(100).optional().or(z.literal("")),
  issuingAuthority: z.string().trim().max(200).optional().or(z.literal("")),
});
export type ConfirmDocumentUploadInput = z.infer<typeof confirmDocumentUploadSchema>;

export const createCertificationSchema = z.object({
  employeeId: z.uuid(),
  typeId: z.uuid(),
  licenceNumber: z.string().trim().min(1).max(60),
  issuingAuthority: z.string().trim().min(1).max(200),
  issueDate: z.string().trim().min(1),
  expiryDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
