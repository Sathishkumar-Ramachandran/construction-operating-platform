"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { materialCategorySchema, materialSchema, supplierSchema } from "@/lib/validation/erp";
import { toggleActiveSchema } from "@/lib/validation/hr-master-data";
import * as erpMasterData from "@/lib/services/erp-master-data-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

function revalidateErpSettings() {
  revalidatePath("/erp");
}

export async function saveMaterialCategoryAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.INVENTORY_MANAGE.code, async (actor) => {
    const parsed = materialCategorySchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const category = parsed.data.id
        ? await erpMasterData.updateMaterialCategory(actor, { ...parsed.data, id: parsed.data.id })
        : await erpMasterData.createMaterialCategory(actor, parsed.data);
      revalidateErpSettings();
      return { ok: true, data: category };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function setMaterialCategoryActiveAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.INVENTORY_MANAGE.code, async () => {
    const parsed = toggleActiveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Invalid input." };
    const category = await erpMasterData.setMaterialCategoryActive(parsed.data.id, parsed.data.isActive);
    revalidateErpSettings();
    return { ok: true, data: category };
  });
}

export async function saveMaterialAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.INVENTORY_MANAGE.code, async (actor) => {
    const parsed = materialSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const material = parsed.data.id
        ? await erpMasterData.updateMaterial(actor, { ...parsed.data, id: parsed.data.id })
        : await erpMasterData.createMaterial(actor, parsed.data);
      revalidateErpSettings();
      return { ok: true, data: material };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function setMaterialActiveAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.INVENTORY_MANAGE.code, async () => {
    const parsed = toggleActiveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Invalid input." };
    const material = await erpMasterData.setMaterialActive(parsed.data.id, parsed.data.isActive);
    revalidateErpSettings();
    return { ok: true, data: material };
  });
}

export async function saveSupplierAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.INVENTORY_MANAGE.code, async (actor) => {
    const parsed = supplierSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const supplier = parsed.data.id
        ? await erpMasterData.updateSupplier(actor, { ...parsed.data, id: parsed.data.id })
        : await erpMasterData.createSupplier(actor, parsed.data);
      revalidateErpSettings();
      return { ok: true, data: supplier };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function setSupplierActiveAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.INVENTORY_MANAGE.code, async () => {
    const parsed = toggleActiveSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Invalid input." };
    const supplier = await erpMasterData.setSupplierActive(parsed.data.id, parsed.data.isActive);
    revalidateErpSettings();
    return { ok: true, data: supplier };
  });
}
