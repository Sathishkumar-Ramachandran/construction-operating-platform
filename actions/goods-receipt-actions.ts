"use server";

import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { postGoodsReceiptSchema } from "@/lib/validation/erp";
import { postGoodsReceipt } from "@/lib/services/goods-receipt-service";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

export async function postGoodsReceiptAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.ERP_GOODS_RECEIPT_MANAGE.code, async (actor) => {
    const parsed = postGoodsReceiptSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    try {
      const receipt = await postGoodsReceipt(actor, parsed.data);
      revalidatePath(`/erp/purchase-orders/${parsed.data.purchaseOrderId}`);
      return { ok: true, data: receipt };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}
