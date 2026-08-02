import { z } from "zod";

export const createLeadSchema = z.object({
  clientName: z.string().trim().min(2, "Client name is required.").max(150),
  contactPersonName: z.string().trim().max(150).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactEmail: z.email().optional().or(z.literal("")),
  source: z
    .enum(["REFERRAL", "WEBSITE", "TENDER_BOARD", "COLD_OUTREACH", "REPEAT_CLIENT", "OTHER"])
    .optional(),
  acquisitionPath: z.enum(["TENDER", "NORMAL"]),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  ownerUserId: z.uuid(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export const updateLeadSchema = z.object({
  clientName: z.string().trim().min(2).max(150),
  contactPersonName: z.string().trim().max(150).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  contactEmail: z.email().optional().or(z.literal("")),
  estimatedValue: z.coerce.number().nonnegative().optional(),
  ownerUserId: z.uuid(),
});
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const changeLeadStatusSchema = z.object({
  status: z.enum(["NEW", "QUALIFIED", "IN_PROGRESS", "NEGOTIATION", "WON", "LOST"]),
  lostReason: z.string().trim().max(500).optional().or(z.literal("")),
});
export type ChangeLeadStatusInput = z.infer<typeof changeLeadStatusSchema>;

export const tenderDetailsSchema = z.object({
  tenderReferenceNo: z.string().trim().max(100).optional().or(z.literal("")),
  issuingBody: z.string().trim().max(150).optional().or(z.literal("")),
  noticeDate: z.string().trim().optional().or(z.literal("")),
  documentCollectionDeadline: z.string().trim().optional().or(z.literal("")),
  siteVisitMandatory: z.boolean().default(false),
  siteVisitDate: z.string().trim().optional().or(z.literal("")),
  queryDeadline: z.string().trim().optional().or(z.literal("")),
  submissionDeadline: z.string().trim().optional().or(z.literal("")),
  tenderBondAmount: z.coerce.number().nonnegative().optional(),
  evaluationMethod: z.enum(["LOWEST_PRICE", "PRICE_QUALITY_METHOD"]).optional(),
  bidAmount: z.coerce.number().nonnegative().optional(),
});
export type TenderDetailsInput = z.infer<typeof tenderDetailsSchema>;

export const advanceTenderStatusSchema = z.object({
  status: z.enum([
    "DOCUMENT_COLLECTION",
    "SITE_VISIT",
    "QUERY_CLARIFICATION",
    "PRICING",
    "SUBMITTED",
    "OPENED",
    "UNDER_EVALUATION",
    "AWARDED",
    "NOT_AWARDED",
    "WITHDRAWN",
  ]),
  outcomeNotes: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type AdvanceTenderStatusInput = z.infer<typeof advanceTenderStatusSchema>;

const pricingLineSchema = z.object({
  itemNo: z.string().trim().min(1).max(30),
  description: z.string().trim().min(1).max(300),
  unit: z.string().trim().min(1).max(30),
  quantity: z.coerce.number().positive(),
  unitRate: z.coerce.number().nonnegative(),
});

export const setTenderBoqLinesSchema = z.object({
  lines: z.array(pricingLineSchema),
});
export type SetTenderBoqLinesInput = z.infer<typeof setTenderBoqLinesSchema>;

export const createQuotationSchema = z.object({
  leadId: z.uuid(),
  validUntil: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  lines: z.array(pricingLineSchema).min(1, "Add at least one line item."),
});
export type CreateQuotationInput = z.infer<typeof createQuotationSchema>;

export const changeQuotationStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "NEGOTIATING", "ACCEPTED", "REJECTED", "EXPIRED"]),
});
export type ChangeQuotationStatusInput = z.infer<typeof changeQuotationStatusSchema>;

export const convertLeadToProjectSchema = z.object({
  code: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(150),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  startDate: z.string().trim().optional().or(z.literal("")),
});
export type ConvertLeadToProjectInput = z.infer<typeof convertLeadToProjectSchema>;
