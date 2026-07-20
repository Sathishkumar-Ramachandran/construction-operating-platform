import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { MaterialCategoryInput, MaterialInput, SupplierInput } from "@/lib/validation/erp";
import type { AuthenticatedUser } from "@/types/auth";

function normalizeOptional(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function assertCodeAvailable(
  model: "materialCategory" | "material" | "supplier",
  code: string,
  excludeId?: string
) {
  const where = { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
  const existing = await (db[model] as { findFirst: (args: unknown) => Promise<{ id: string } | null> }).findFirst({
    where,
    select: { id: true },
  });
  if (existing) throw new AppError(ErrorCode.MASTER_DATA_CODE_ALREADY_EXISTS);
}

// --- Material categories ---------------------------------------------------

export async function listMaterialCategories() {
  return db.materialCategory.findMany({ orderBy: { name: "asc" } });
}

export async function createMaterialCategory(actor: AuthenticatedUser, input: MaterialCategoryInput) {
  await assertCodeAvailable("materialCategory", input.code);
  const category = await db.materialCategory.create({
    data: {
      code: input.code,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "MaterialCategory",
    entityId: category.id,
  });
  return category;
}

export async function updateMaterialCategory(
  actor: AuthenticatedUser,
  input: MaterialCategoryInput & { id: string }
) {
  const existing = await db.materialCategory.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.MATERIAL_CATEGORY_NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("materialCategory", input.code, input.id);
  }
  const category = await db.materialCategory.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "MaterialCategory",
    entityId: category.id,
  });
  return category;
}

export async function setMaterialCategoryActive(id: string, isActive: boolean) {
  return db.materialCategory.update({ where: { id }, data: { isActive } });
}

// --- Materials --------------------------------------------------------------

export async function listMaterials() {
  return db.material.findMany({
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, code: true, name: true } },
      stockLevel: { select: { quantityOnHand: true } },
    },
  });
}

export async function createMaterial(actor: AuthenticatedUser, input: MaterialInput) {
  await assertCodeAvailable("material", input.code);

  return db.$transaction(async (tx) => {
    const material = await tx.material.create({
      data: {
        code: input.code,
        name: input.name,
        type: input.type,
        categoryId: input.categoryId || null,
        unit: input.unit,
        referenceCost: input.referenceCost ?? null,
        reorderLevel: input.reorderLevel ?? null,
        notes: normalizeOptional(input.notes),
      },
    });

    await tx.stockLevel.create({
      data: { materialId: material.id, quantityOnHand: 0 },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.MASTER_DATA_CREATED,
      entityType: "Material",
      entityId: material.id,
      afterData: { code: material.code, name: material.name, type: material.type },
    });

    return material;
  });
}

export async function updateMaterial(actor: AuthenticatedUser, input: MaterialInput & { id: string }) {
  const existing = await db.material.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.MATERIAL_NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("material", input.code, input.id);
  }

  const material = await db.material.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      type: input.type,
      categoryId: input.categoryId || null,
      unit: input.unit,
      referenceCost: input.referenceCost ?? null,
      reorderLevel: input.reorderLevel ?? null,
      notes: normalizeOptional(input.notes),
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "Material",
    entityId: material.id,
    afterData: { code: material.code, name: material.name, type: material.type },
  });

  return material;
}

export async function setMaterialActive(id: string, isActive: boolean) {
  return db.material.update({ where: { id }, data: { isActive } });
}

// --- Suppliers ----------------------------------------------------------

export async function listSuppliers() {
  return db.supplier.findMany({ orderBy: { name: "asc" } });
}

export async function createSupplier(actor: AuthenticatedUser, input: SupplierInput) {
  await assertCodeAvailable("supplier", input.code);
  const supplier = await db.supplier.create({
    data: {
      code: input.code,
      name: input.name,
      contactPersonName: normalizeOptional(input.contactPersonName),
      phone: normalizeOptional(input.phone),
      email: normalizeOptional(input.email),
      address: normalizeOptional(input.address),
      notes: normalizeOptional(input.notes),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "Supplier",
    entityId: supplier.id,
  });
  return supplier;
}

export async function updateSupplier(actor: AuthenticatedUser, input: SupplierInput & { id: string }) {
  const existing = await db.supplier.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.SUPPLIER_NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("supplier", input.code, input.id);
  }
  const supplier = await db.supplier.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      contactPersonName: normalizeOptional(input.contactPersonName),
      phone: normalizeOptional(input.phone),
      email: normalizeOptional(input.email),
      address: normalizeOptional(input.address),
      notes: normalizeOptional(input.notes),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "Supplier",
    entityId: supplier.id,
  });
  return supplier;
}

export async function setSupplierActive(id: string, isActive: boolean) {
  return db.supplier.update({ where: { id }, data: { isActive } });
}
