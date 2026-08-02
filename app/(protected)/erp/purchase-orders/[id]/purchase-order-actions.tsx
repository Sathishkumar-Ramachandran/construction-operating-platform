"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitPurchaseOrderAction, cancelPurchaseOrderAction } from "@/actions/purchase-order-actions";
import { PurchaseOrderStatus } from "@/lib/erp/constants";

export function PurchaseOrderActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>, successMessage: string) {
    setSubmitting(true);
    const result = await action();
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message ?? "Something went wrong.");
      return;
    }
    toast.success(successMessage);
    router.refresh();
  }

  if (status === PurchaseOrderStatus.DRAFT) {
    return (
      <div className="flex gap-2">
        <Button disabled={submitting} onClick={() => run(() => submitPurchaseOrderAction(id), "Submitted for approval.")}>
          Submit for approval
        </Button>
        <Button
          variant="outline"
          disabled={submitting}
          onClick={() => run(() => cancelPurchaseOrderAction(id), "Purchase order cancelled.")}
        >
          Cancel
        </Button>
      </div>
    );
  }

  if (status === PurchaseOrderStatus.SUBMITTED) {
    return (
      <p className="text-sm text-muted-foreground">
        Awaiting approval — decide this in the{" "}
        <a href="/approvals" className="underline">Approvals inbox</a>.
      </p>
    );
  }

  return null;
}
