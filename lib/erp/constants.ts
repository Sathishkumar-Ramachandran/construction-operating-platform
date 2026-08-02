/**
 * Domain "enums" for the ERP module, following the same TS-const pattern
 * used by lib/hr/constants.ts / lib/projects/constants.ts — values are
 * enforced at the TypeScript layer, columns stay plain strings in the DB
 * (see prisma/schema.prisma).
 */

export const MaterialType = {
  MATERIAL: "MATERIAL",
  EQUIPMENT: "EQUIPMENT",
  SERVICE: "SERVICE",
} as const;
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  MATERIAL: "Material",
  EQUIPMENT: "Equipment",
  SERVICE: "Service",
};

export const StockTransactionType = {
  RECEIPT: "RECEIPT",
  ISSUE: "ISSUE",
  ADJUSTMENT: "ADJUSTMENT",
} as const;
export type StockTransactionType = (typeof StockTransactionType)[keyof typeof StockTransactionType];

export const STOCK_TRANSACTION_TYPE_LABELS: Record<StockTransactionType, string> = {
  RECEIPT: "Receipt",
  ISSUE: "Issue",
  ADJUSTMENT: "Adjustment",
};

export const StockReferenceType = {
  PURCHASE_ORDER: "PURCHASE_ORDER",
  PROJECT_RESOURCE_REQUEST: "PROJECT_RESOURCE_REQUEST",
  STOCK_TRANSFER: "STOCK_TRANSFER",
  MANUAL: "MANUAL",
} as const;
export type StockReferenceType = (typeof StockReferenceType)[keyof typeof StockReferenceType];

export const PurchaseOrderStatus = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  PARTIALLY_RECEIVED: "PARTIALLY_RECEIVED",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;
export type PurchaseOrderStatus = (typeof PurchaseOrderStatus)[keyof typeof PurchaseOrderStatus];

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

/** DRAFT<->SUBMITTED<->APPROVED mirror the Payroll-run
 * prepare/submit/approve/reject shape (see PAYROLL_PERIOD_STATUS_TRANSITIONS
 * in lib/payroll/constants.ts) — a rejected PO goes back to DRAFT for the
 * preparer to revise and resubmit, never a dead end. */
export const PURCHASE_ORDER_STATUS_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: [PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.CANCELLED],
  SUBMITTED: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.CANCELLED],
  APPROVED: [PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  PARTIALLY_RECEIVED: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.CANCELLED],
  RECEIVED: [],
  CANCELLED: [],
};

export const StockTransferStatus = {
  PENDING: "PENDING",
  IN_TRANSIT: "IN_TRANSIT",
  RECEIVED: "RECEIVED",
  CANCELLED: "CANCELLED",
} as const;
export type StockTransferStatus = (typeof StockTransferStatus)[keyof typeof StockTransferStatus];

export const STOCK_TRANSFER_STATUS_LABELS: Record<StockTransferStatus, string> = {
  PENDING: "Pending",
  IN_TRANSIT: "In Transit",
  RECEIVED: "Received",
  CANCELLED: "Cancelled",
};

/** IN_TRANSIT is when the ISSUE-side stock write happens (dispatched from
 * source); RECEIVED is when the RECEIPT-side write happens (confirmed at
 * destination) — see stock-transfer-service.ts. Two separate writing
 * moments, not one atomic move — matches real goods-in-transit timing. */
export const STOCK_TRANSFER_STATUS_TRANSITIONS: Record<StockTransferStatus, StockTransferStatus[]> = {
  PENDING: [StockTransferStatus.IN_TRANSIT, StockTransferStatus.CANCELLED],
  IN_TRANSIT: [StockTransferStatus.RECEIVED, StockTransferStatus.CANCELLED],
  RECEIVED: [],
  CANCELLED: [],
};

export const DEFAULT_WAREHOUSE_CODE = "MAIN";
