import { db, currentCompanyId } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { DEFAULT_WAREHOUSE_CODE } from "@/lib/erp/constants";
import type { WarehouseInput } from "@/lib/validation/erp";
import type { AuthenticatedUser } from "@/types/auth";

export async function listWarehouses() {
  return db.warehouse.findMany({
    orderBy: { name: "asc" },
    include: { managedByEmployee: { select: { id: true, firstName: true, lastName: true, preferredName: true } } },
  });
}

export async function getWarehouseById(id: string) {
  const warehouse = await db.warehouse.findUnique({ where: { id } });
  if (!warehouse) throw new AppError(ErrorCode.WAREHOUSE_NOT_FOUND);
  return warehouse;
}

/** The warehouse a resource request/PO defaults to when the caller doesn't
 * pick one explicitly — the seeded MAIN warehouse if present, else the sole
 * active warehouse if there's exactly one, else null (caller must then
 * require an explicit choice, since guessing among 2+ warehouses would be
 * silently wrong). */
export async function getDefaultWarehouse() {
  const main = await db.warehouse.findUnique({
    where: { companyId_code: { companyId: currentCompanyId(), code: DEFAULT_WAREHOUSE_CODE } },
  });
  if (main) return main;

  const active = await db.warehouse.findMany({ where: { isActive: true }, take: 2 });
  return active.length === 1 ? active[0] : null;
}

export async function createWarehouse(actor: AuthenticatedUser, input: WarehouseInput) {
  const existing = await db.warehouse.findUnique({
    where: { companyId_code: { companyId: actor.companyId, code: input.code } },
  });
  if (existing) throw new AppError(ErrorCode.WAREHOUSE_CODE_IN_USE);

  const warehouse = await db.warehouse.create({
    data: {
      code: input.code,
      name: input.name,
      address: input.address || null,
      managedByEmployeeId: input.managedByEmployeeId || null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.WAREHOUSE_CREATED,
    entityType: "Warehouse",
    entityId: warehouse.id,
    afterData: { code: warehouse.code, name: warehouse.name },
  });

  return warehouse;
}

export async function updateWarehouse(actor: AuthenticatedUser, id: string, input: WarehouseInput) {
  const existing = await db.warehouse.findUnique({ where: { id } });
  if (!existing) throw new AppError(ErrorCode.WAREHOUSE_NOT_FOUND);

  if (input.code !== existing.code) {
    const codeTaken = await db.warehouse.findUnique({
      where: { companyId_code: { companyId: actor.companyId, code: input.code } },
    });
    if (codeTaken) throw new AppError(ErrorCode.WAREHOUSE_CODE_IN_USE);
  }

  const warehouse = await db.warehouse.update({
    where: { id },
    data: {
      code: input.code,
      name: input.name,
      address: input.address || null,
      managedByEmployeeId: input.managedByEmployeeId || null,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.WAREHOUSE_UPDATED,
    entityType: "Warehouse",
    entityId: warehouse.id,
    beforeData: { code: existing.code, name: existing.name },
    afterData: { code: warehouse.code, name: warehouse.name },
  });

  return warehouse;
}

export async function setWarehouseActive(actor: AuthenticatedUser, id: string, isActive: boolean) {
  const warehouse = await db.warehouse.update({ where: { id }, data: { isActive } });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.WAREHOUSE_UPDATED,
    entityType: "Warehouse",
    entityId: warehouse.id,
    afterData: { isActive },
  });
  return warehouse;
}
