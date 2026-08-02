import { z } from "zod";
import { CompensationComponentType } from "@/lib/payroll/constants";

const compensationComponentTypeValues = Object.values(CompensationComponentType) as [
  string,
  ...string[],
];

export const compensationComponentSchema = z.object({
  type: z.enum(compensationComponentTypeValues),
  code: z.string().trim().min(1).max(60),
  label: z.string().trim().min(1).max(120),
  amount: z.coerce.number().min(0),
  isRecurring: z.boolean().default(true),
});
export type CompensationComponentInput = z.infer<typeof compensationComponentSchema>;

export const setSalaryStructureSchema = z.object({
  employeeId: z.uuid(),
  basicMonthlySalary: z.coerce.number().min(0),
  effectiveFrom: z.string().trim().min(1, "Effective date is required."),
  cpfApplicable: z.boolean().default(true),
  components: z.array(compensationComponentSchema).default([]),
});
export type SetSalaryStructureInput = z.infer<typeof setSalaryStructureSchema>;

export const createPayrollPeriodSchema = z.object({
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  cutoffDate: z.string().trim().min(1, "Cutoff date is required."),
});
export type CreatePayrollPeriodInput = z.infer<typeof createPayrollPeriodSchema>;

export const cpfContributionRateSchema = z.object({
  ageBandLabel: z.string().trim().min(1).max(60),
  minAge: z.coerce.number().int().min(0).max(120),
  maxAge: z.coerce.number().int().min(0).max(120).optional().or(z.literal("")),
  wageCeiling: z.coerce.number().min(0),
  employeeRate: z.coerce.number().min(0).max(1),
  employerRate: z.coerce.number().min(0).max(1),
  effectiveFrom: z.string().trim().min(1, "Effective date is required."),
});
export type CpfContributionRateInput = z.infer<typeof cpfContributionRateSchema>;
