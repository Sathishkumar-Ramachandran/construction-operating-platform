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
