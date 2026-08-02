"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  processPayrollRunAction,
  disbursePayslipsAction,
  closePayrollPeriodAction,
} from "@/actions/payroll-actions";
import { PayrollPeriodStatus } from "@/lib/payroll/constants";

export function PayrollPeriodActions({
  periodId,
  status,
}: {
  periodId: string;
  status: string;
}) {
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

  if (status === PayrollPeriodStatus.OPEN) {
    return (
      <Button
        disabled={submitting}
        onClick={() =>
          run(() => processPayrollRunAction(periodId), "Payroll run processed and submitted for approval.")
        }
      >
        {submitting ? "Processing…" : "Process payroll run"}
      </Button>
    );
  }

  if (status === PayrollPeriodStatus.PENDING_APPROVAL) {
    return (
      <p className="text-sm text-muted-foreground">
        Awaiting approval — decide this in the{" "}
        <a href="/approvals" className="underline">
          Approvals inbox
        </a>
        .
      </p>
    );
  }

  if (status === PayrollPeriodStatus.APPROVED) {
    return (
      <Button
        disabled={submitting}
        onClick={() => run(() => disbursePayslipsAction(periodId), "Payslips marked as disbursed.")}
      >
        {submitting ? "Disbursing…" : "Mark as disbursed"}
      </Button>
    );
  }

  if (status === PayrollPeriodStatus.PAID) {
    return (
      <Button
        variant="outline"
        disabled={submitting}
        onClick={() => run(() => closePayrollPeriodAction(periodId), "Payroll period closed.")}
      >
        {submitting ? "Closing…" : "Close period"}
      </Button>
    );
  }

  return null;
}
