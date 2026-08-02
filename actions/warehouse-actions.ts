"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { warehouseSchema } from "@/lib/validation/erp";
import { toggleActiveSchema } from "@/lib/validation/hr-master-data";
import * as warehouseService from "@/lib/services/warehouse-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function saveWarehouseAction(id: string | null, input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_WAREHOUSES_MANAGE.code);
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const warehouse = id
      ? await warehouseService.updateWarehouse(actor, id, parsed.data)
      : await warehouseService.createWarehouse(actor, parsed.data);
    revalidatePath("/erp/warehouses");
    return { ok: true, data: warehouse };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function setWarehouseActiveAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_WAREHOUSES_MANAGE.code);
  const parsed = toggleActiveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input." };
  const warehouse = await warehouseService.setWarehouseActive(actor, parsed.data.id, parsed.data.isActive);
  revalidatePath("/erp/warehouses");
  return { ok: true, data: warehouse };
}
