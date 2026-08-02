import { z } from "zod";

const codeSchema = z
  .string()
  .trim()
  .min(2, "Code must be at least 2 characters.")
  .max(40)
  .regex(/^[A-Z0-9_-]+$/, "Use uppercase letters, numbers, - and _ only.");

const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(150);

export const materialCategorySchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  description: z.string().trim().max(500).optional().or(z.literal("")),
});
export type MaterialCategoryInput = z.infer<typeof materialCategorySchema>;

export const materialSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  type: z.enum(["MATERIAL", "EQUIPMENT", "SERVICE"]).default("MATERIAL"),
  categoryId: z.uuid().nullable().optional(),
  unit: z.string().trim().min(1, "Unit is required.").max(30),
  referenceCost: z.coerce.number().nonnegative().optional(),
  reorderLevel: z.coerce.number().nonnegative().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type MaterialInput = z.infer<typeof materialSchema>;

export const supplierSchema = z.object({
  id: z.uuid().optional(),
  code: codeSchema,
  name: nameSchema,
  contactPersonName: z.string().trim().max(150).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  address: z.string().trim().max(300).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const warehouseSchema = z.object({
  code: codeSchema,
  name: nameSchema,
  address: z.string().trim().max(300).optional().or(z.literal("")),
  managedByEmployeeId: z.uuid().optional().or(z.literal("")),
});
export type WarehouseInput = z.infer<typeof warehouseSchema>;

const purchaseOrderLineSchema = z.object({
  materialId: z.uuid(),
  quantityOrdered: z.coerce.number().positive(),
  unitCost: z.coerce.number().nonnegative(),
});

export const createPurchaseOrderSchema = z.object({
  supplierId: z.uuid("Select a supplier."),
  warehouseId: z.uuid("Select a delivery warehouse."),
  projectId: z.uuid().optional().or(z.literal("")),
  expectedDeliveryDate: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  lines: z.array(purchaseOrderLineSchema).min(1, "Add at least one line item."),
});
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;

const goodsReceiptLineSchema = z.object({
  purchaseOrderLineId: z.uuid(),
  quantityReceived: z.coerce.number().positive(),
});

export const postGoodsReceiptSchema = z.object({
  purchaseOrderId: z.uuid(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  lines: z.array(goodsReceiptLineSchema).min(1, "Enter at least one received quantity."),
});
export type PostGoodsReceiptInput = z.infer<typeof postGoodsReceiptSchema>;

export const createStockTransferSchema = z.object({
  materialId: z.uuid("Select a material."),
  fromWarehouseId: z.uuid("Select the source warehouse."),
  toWarehouseId: z.uuid("Select the destination warehouse."),
  quantity: z.coerce.number().positive(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;

export const receiveStockTransferSchema = z.object({
  transferId: z.uuid(),
});
export type ReceiveStockTransferInput = z.infer<typeof receiveStockTransferSchema>;
