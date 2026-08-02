"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dispatchStockTransferAction, receiveStockTransferAction, cancelStockTransferAction } from "@/actions/stock-transfer-actions";
import { StockTransferStatus } from "@/lib/erp/constants";

export function StockTransferRowActions({ id, status }: { id: string; status: string }) {
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

  if (status === StockTransferStatus.PENDING) {
    return (
      <div className="flex gap-2">
        <Button size="sm" disabled={submitting} onClick={() => run(() => dispatchStockTransferAction(id), "Dispatched.")}>
          Dispatch
        </Button>
        <Button size="sm" variant="outline" disabled={submitting} onClick={() => run(() => cancelStockTransferAction(id), "Cancelled.")}>
          Cancel
        </Button>
      </div>
    );
  }

  if (status === StockTransferStatus.IN_TRANSIT) {
    return (
      <Button size="sm" disabled={submitting} onClick={() => run(() => receiveStockTransferAction(id), "Received.")}>
        Confirm receipt
      </Button>
    );
  }

  return null;
}
