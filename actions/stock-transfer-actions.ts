"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { createStockTransferSchema } from "@/lib/validation/erp";
import * as stockTransferService from "@/lib/services/stock-transfer-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

function revalidateTransfers() {
  revalidatePath("/erp/stock-transfers");
}

export async function createStockTransferAction(input: unknown): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code);
  const parsed = createStockTransferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const transfer = await stockTransferService.createStockTransfer(actor, parsed.data);
    revalidateTransfers();
    return { ok: true, data: transfer };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function dispatchStockTransferAction(id: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code);
  try {
    const transfer = await stockTransferService.dispatchStockTransfer(actor, id);
    revalidateTransfers();
    return { ok: true, data: transfer };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function receiveStockTransferAction(id: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code);
  try {
    const transfer = await stockTransferService.receiveStockTransfer(actor, id);
    revalidateTransfers();
    return { ok: true, data: transfer };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}

export async function cancelStockTransferAction(id: string): Promise<ActionResult> {
  const actor = await requirePermission(PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code);
  try {
    const transfer = await stockTransferService.cancelStockTransfer(actor, id);
    revalidateTransfers();
    return { ok: true, data: transfer };
  } catch (error) {
    if (isAppError(error)) return { ok: false, message: error.message };
    throw error;
  }
}
