"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createPurchaseOrderSchema } from "@/lib/validation/erp";
import * as purchaseOrderService from "@/lib/services/purchase-order-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function createPurchaseOrderAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_PURCHASE_ORDERS_MANAGE.code);
  const parsed = createPurchaseOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const po = await purchaseOrderService.createPurchaseOrder(actor, parsed.data);
    revalidatePath("/erp/purchase-orders");
    return { ok: true, data: po };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function submitPurchaseOrderAction(id: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_PURCHASE_ORDERS_MANAGE.code);
  try {
    const po = await purchaseOrderService.submitPurchaseOrder(actor, id);
    revalidatePath(`/erp/purchase-orders/${id}`);
    revalidatePath("/erp/purchase-orders");
    return { ok: true, data: po };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function cancelPurchaseOrderAction(id: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_PURCHASE_ORDERS_MANAGE.code);
  try {
    const po = await purchaseOrderService.cancelPurchaseOrder(actor, id);
    revalidatePath(`/erp/purchase-orders/${id}`);
    revalidatePath("/erp/purchase-orders");
    return { ok: true, data: po };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
