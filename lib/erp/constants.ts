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
  MANUAL: "MANUAL",
} as const;
export type StockReferenceType = (typeof StockReferenceType)[keyof typeof StockReferenceType];
