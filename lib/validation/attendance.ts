import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters.")
  .max(40)
  .regex(/^[A-Z0-9_]+$/, "Use uppercase letters, numbers, and underscores only.");

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(150);

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use 24-hour HH:mm format.");

export const shiftTypeSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  gracePeriodMinutes: z.coerce.number().int().min(0).max(120).default(15),
});
export type ShiftTypeInput = z.infer<typeof shiftTypeSchema>;

export const holidaySchema = z.object({
  id: z.uuid().optional(),
  date: z.string().trim().min(1, "Date is required."),
  name: nameSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type HolidayInput = z.infer<typeof holidaySchema>;

export const correctAttendanceSchema = z.object({
  employeeId: z.uuid(),
  date: z.string().trim().min(1, "Date is required."),
  status: z.enum(["PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "HOLIDAY"]),
  checkInTime: z.string().trim().optional().or(z.literal("")),
  checkOutTime: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().min(1, "A reason is required.").max(500),
});
export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;

export const attendanceBoardQuerySchema = z.object({
  date: z.string().trim().min(1),
  search: z.string().max(255).optional(),
  departmentId: z.uuid().optional(),
  status: z
    .enum(["PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "HOLIDAY", "WEEKEND", "NOT_MARKED"])
    .optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
});
export type AttendanceBoardQuery = z.infer<typeof attendanceBoardQuerySchema>;

export const attendanceHistoryQuerySchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
});
export type AttendanceHistoryQuery = z.infer<typeof attendanceHistoryQuerySchema>;
