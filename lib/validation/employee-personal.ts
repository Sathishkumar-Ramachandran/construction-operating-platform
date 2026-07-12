import { z } from "zod";

export const emergencyContactInputSchema = z.object({
  employeeId: z.uuid(),
  name: z.string().trim().min(1).max(150),
  relationship: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1).max(30),
  alternatePhone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
});
export type EmergencyContactActionInput = z.infer<typeof emergencyContactInputSchema>;

export const bankAccountInputSchema = z.object({
  employeeId: z.uuid(),
  bankName: z.string().trim().min(1).max(150),
  accountHolderName: z.string().trim().min(1).max(150),
  accountNumber: z.string().trim().min(4).max(40),
  bankCode: z.string().trim().max(20).optional().or(z.literal("")),
  branchCode: z.string().trim().max(20).optional().or(z.literal("")),
  isPrimary: z.boolean().default(true),
  effectiveFrom: z.string().trim().min(1),
});
export type BankAccountActionInput = z.infer<typeof bankAccountInputSchema>;
