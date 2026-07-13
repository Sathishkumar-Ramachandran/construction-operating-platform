import { z } from "zod";
import { ALL_EMPLOYMENT_STATUSES } from "@/lib/hr/constants";

const optionalTrimmed = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(""));

export const createEmployeeSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(100),
  middleName: optionalTrimmed(100),
  lastName: optionalTrimmed(100),
  preferredName: optionalTrimmed(100),

  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  gender: optionalTrimmed(30),
  nationalityCode: optionalTrimmed(2),
  maritalStatus: optionalTrimmed(30),

  nationalId: optionalTrimmed(50),
  passportNumber: optionalTrimmed(50),

  personalEmail: z.email().optional().or(z.literal("")),
  workEmail: z.email().optional().or(z.literal("")),
  mobileNumber: optionalTrimmed(30),
  alternateMobileNumber: optionalTrimmed(30),

  joiningDate: z.string().trim().min(1, "Joining date is required."),

  departmentId: z.uuid("Select a department."),
  designationId: z.uuid("Select a designation."),
  gradeId: z.uuid().optional().or(z.literal("")),
  employmentTypeId: z.uuid("Select an employment type."),
  reportingManagerId: z.uuid().optional().or(z.literal("")),
  defaultShiftTypeId: z.uuid().optional().or(z.literal("")),
});
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.extend({
  id: z.uuid(),
  version: z.number().int(),
});
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const listEmployeesQuerySchema = z.object({
  search: z.string().max(255).optional(),
  departmentId: z.uuid().optional(),
  designationId: z.uuid().optional(),
  employmentStatus: z.enum(ALL_EMPLOYMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;

export const emergencyContactSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(150),
  relationship: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(1).max(30),
  alternatePhone: optionalTrimmed(30),
  email: z.email().optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
});
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;

export const employeeAddressSchema = z.object({
  type: z.enum(["RESIDENTIAL", "MAILING"]),
  line1: z.string().trim().min(1).max(200),
  line2: optionalTrimmed(200),
  city: optionalTrimmed(100),
  state: optionalTrimmed(100),
  postalCode: optionalTrimmed(20),
  countryCode: optionalTrimmed(2),
});
export type EmployeeAddressInput = z.infer<typeof employeeAddressSchema>;

export const bankAccountSchema = z.object({
  bankName: z.string().trim().min(1).max(150),
  accountHolderName: z.string().trim().min(1).max(150),
  accountNumber: z.string().trim().min(4).max(40),
  bankCode: optionalTrimmed(20),
  branchCode: optionalTrimmed(20),
  isPrimary: z.boolean().default(true),
  effectiveFrom: z.string().trim().min(1, "Effective-from date is required."),
});
export type BankAccountInput = z.infer<typeof bankAccountSchema>;

export const changeEmploymentStatusSchema = z.object({
  employeeId: z.uuid(),
  newStatus: z.enum(ALL_EMPLOYMENT_STATUSES),
  effectiveDate: z.string().trim().min(1, "Effective date is required."),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
  notes: optionalTrimmed(1000),
});
export type ChangeEmploymentStatusInput = z.infer<
  typeof changeEmploymentStatusSchema
>;

export const offboardEmployeeSchema = z.object({
  employeeId: z.uuid(),
  triggerCategory: z.enum([
    "RESIGNATION",
    "TERMINATION",
    "RETIREMENT",
    "CONTRACT_COMPLETION",
    "ABSCONDING",
    "OTHER",
  ]),
  lastWorkingDate: z.string().trim().min(1, "Last working date is required."),
  reason: z.string().trim().min(3, "A reason is required.").max(1000),
  rehireEligible: z.boolean().default(true),
});
export type OffboardEmployeeInput = z.infer<typeof offboardEmployeeSchema>;

export const setReportingManagerSchema = z.object({
  employeeId: z.uuid(),
  reportingManagerId: z.uuid().nullable(),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
});
export type SetReportingManagerInput = z.infer<
  typeof setReportingManagerSchema
>;
