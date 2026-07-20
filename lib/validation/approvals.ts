import { z } from "zod";

export const decideApprovalSchema = z.object({
  approvalRequestId: z.uuid(),
  stepOrder: z.coerce.number().int().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type DecideApprovalInput = z.infer<typeof decideApprovalSchema>;

export const cancelApprovalSchema = z.object({
  approvalRequestId: z.uuid(),
  reason: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type CancelApprovalInput = z.infer<typeof cancelApprovalSchema>;

export const listApprovalsQuerySchema = z.object({
  scope: z.enum(["PENDING_FOR_ME", "REQUESTED_BY_ME"]).default("PENDING_FOR_ME"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListApprovalsQuery = z.infer<typeof listApprovalsQuerySchema>;
