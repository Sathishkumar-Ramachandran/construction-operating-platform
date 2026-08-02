/**
 * Domain "enums" for the CRM / Lead-to-Delivery module, following the same
 * TS-const pattern used elsewhere (lib/hr/constants.ts, lib/projects/constants.ts)
 * — values are enforced at the TypeScript layer, columns stay plain strings
 * in the DB (see prisma/schema.prisma).
 */

export const LeadAcquisitionPath = {
  TENDER: "TENDER",
  NORMAL: "NORMAL",
} as const;
export type LeadAcquisitionPath = (typeof LeadAcquisitionPath)[keyof typeof LeadAcquisitionPath];

export const LEAD_ACQUISITION_PATH_LABELS: Record<LeadAcquisitionPath, string> = {
  TENDER: "Tender",
  NORMAL: "Normal (Direct/Negotiated)",
};

export const LeadSource = {
  REFERRAL: "REFERRAL",
  WEBSITE: "WEBSITE",
  TENDER_BOARD: "TENDER_BOARD",
  COLD_OUTREACH: "COLD_OUTREACH",
  REPEAT_CLIENT: "REPEAT_CLIENT",
  OTHER: "OTHER",
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  REFERRAL: "Referral",
  WEBSITE: "Website",
  TENDER_BOARD: "Tender Board (GeBIZ / HDB e-Procurement)",
  COLD_OUTREACH: "Cold Outreach",
  REPEAT_CLIENT: "Repeat Client",
  OTHER: "Other",
};

/** Top-level funnel stage — deliberately path-agnostic (a NORMAL lead never
 * enters tender-specific stages; that detail lives on Tender.status
 * instead). CONVERTED is terminal and only reachable from WON, via
 * lead-conversion-service.ts. */
export const LeadStatus = {
  NEW: "NEW",
  QUALIFIED: "QUALIFIED",
  IN_PROGRESS: "IN_PROGRESS",
  NEGOTIATION: "NEGOTIATION",
  WON: "WON",
  LOST: "LOST",
  CONVERTED: "CONVERTED",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "New",
  QUALIFIED: "Qualified",
  IN_PROGRESS: "In Progress",
  NEGOTIATION: "Negotiation",
  WON: "Won",
  LOST: "Lost",
  CONVERTED: "Converted",
};

export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: [LeadStatus.QUALIFIED, LeadStatus.LOST],
  QUALIFIED: [LeadStatus.IN_PROGRESS, LeadStatus.LOST],
  IN_PROGRESS: [LeadStatus.NEGOTIATION, LeadStatus.LOST],
  NEGOTIATION: [LeadStatus.WON, LeadStatus.LOST],
  WON: [LeadStatus.CONVERTED],
  LOST: [],
  CONVERTED: [],
};

export function isLeadStatusTransitionAllowed(from: LeadStatus, to: LeadStatus): boolean {
  return LEAD_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * HDB / Town Council public-sector tender lifecycle. Modeled as an ordered
 * checklist (like SITE_STAGE_ORDER) rather than a strict single-step chain
 * — optional stages (site visit, query/clarification) can be skipped
 * forward over since not every tender has them, but the two real
 * compliance gates are enforced in tender-service.ts, not just the client:
 *   - cannot enter SUBMITTED without a bidAmount set
 *   - cannot enter AWARDED/NOT_AWARDED without having passed SUBMITTED
 */
export const TenderStatus = {
  DOCUMENT_COLLECTION: "DOCUMENT_COLLECTION",
  SITE_VISIT: "SITE_VISIT",
  QUERY_CLARIFICATION: "QUERY_CLARIFICATION",
  PRICING: "PRICING",
  SUBMITTED: "SUBMITTED",
  OPENED: "OPENED",
  UNDER_EVALUATION: "UNDER_EVALUATION",
  AWARDED: "AWARDED",
  NOT_AWARDED: "NOT_AWARDED",
  WITHDRAWN: "WITHDRAWN",
} as const;
export type TenderStatus = (typeof TenderStatus)[keyof typeof TenderStatus];

export const TENDER_STATUS_LABELS: Record<TenderStatus, string> = {
  DOCUMENT_COLLECTION: "Document Collection",
  SITE_VISIT: "Site Visit",
  QUERY_CLARIFICATION: "Query / Clarification",
  PRICING: "Pricing (BOQ)",
  SUBMITTED: "Submitted",
  OPENED: "Tender Opened",
  UNDER_EVALUATION: "Under Evaluation",
  AWARDED: "Awarded",
  NOT_AWARDED: "Not Awarded",
  WITHDRAWN: "Withdrawn",
};

/** The stages that precede submission — used to gate "can this tender be
 * withdrawn" and to render the ordered checklist in the UI. */
export const TENDER_STATUS_ORDER: TenderStatus[] = [
  TenderStatus.DOCUMENT_COLLECTION,
  TenderStatus.SITE_VISIT,
  TenderStatus.QUERY_CLARIFICATION,
  TenderStatus.PRICING,
  TenderStatus.SUBMITTED,
  TenderStatus.OPENED,
  TenderStatus.UNDER_EVALUATION,
  TenderStatus.AWARDED,
];

export const TENDER_EVALUATION_METHODS = ["LOWEST_PRICE", "PRICE_QUALITY_METHOD"] as const;
export type TenderEvaluationMethod = (typeof TENDER_EVALUATION_METHODS)[number];

export const TENDER_EVALUATION_METHOD_LABELS: Record<TenderEvaluationMethod, string> = {
  LOWEST_PRICE: "Lowest Price",
  PRICE_QUALITY_METHOD: "Price-Quality Method (PQM)",
};

export const QuotationStatus = {
  DRAFT: "DRAFT",
  SENT: "SENT",
  NEGOTIATING: "NEGOTIATING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;
export type QuotationStatus = (typeof QuotationStatus)[keyof typeof QuotationStatus];

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  NEGOTIATING: "Negotiating",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

export const QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: [QuotationStatus.SENT],
  SENT: [QuotationStatus.NEGOTIATING, QuotationStatus.ACCEPTED, QuotationStatus.REJECTED, QuotationStatus.EXPIRED],
  NEGOTIATING: [QuotationStatus.SENT, QuotationStatus.ACCEPTED, QuotationStatus.REJECTED],
  ACCEPTED: [],
  REJECTED: [],
  EXPIRED: [],
};
