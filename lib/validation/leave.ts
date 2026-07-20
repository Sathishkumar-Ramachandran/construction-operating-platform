import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters.")
  .max(40)
  .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores only.");

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(150);

export const leaveTypeSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  defaultEntitlementDays: z.coerce.number().min(0).max(365),
  isPaid: z.boolean().default(true),
});
export type LeaveTypeInput = z.infer<typeof leaveTypeSchema>;

export const createLeaveRequestSchema = z.object({
  leaveTypeId: z.uuid("Select a leave type."),
  startDate: z.string().trim().min(1, "Start date is required."),
  endDate: z.string().trim().min(1, "End date is required."),
  startHalfDay: z.boolean().default(false),
  endHalfDay: z.boolean().default(false),
  reason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;

export const cancelLeaveRequestSchema = z.object({
  id: z.uuid(),
});
export type CancelLeaveRequestInput = z.infer<typeof cancelLeaveRequestSchema>;

export const adjustLeaveBalanceSchema = z.object({
  employeeId: z.uuid(),
  leaveTypeId: z.uuid(),
  year: z.coerce.number().int().min(2020).max(2100),
  entitledDays: z.coerce.number().min(0).max(365),
  carriedForwardDays: z.coerce.number().min(0).max(365),
  reason: z.string().trim().min(3, "A reason is required.").max(500),
});
export type AdjustLeaveBalanceInput = z.infer<typeof adjustLeaveBalanceSchema>;

export const listLeaveRequestsQuerySchema = z.object({
  employeeId: z.uuid().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListLeaveRequestsQuery = z.infer<typeof listLeaveRequestsQuerySchema>;
