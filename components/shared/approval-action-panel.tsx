"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decideApprovalAction } from "@/actions/approval-actions";

/**
 * Approve/Reject widget for a single pending approval step — mountable both
 * in the central /approvals inbox and inline on any module's own detail
 * page (e.g. a future Leave request detail view), since it only needs the
 * request/step identifiers, not the full request object.
 */
export function ApprovalActionPanel({
  approvalRequestId,
  stepOrder,
  onDecided,
}: {
  approvalRequestId: string;
  stepOrder: number;
  onDecided?: () => void;
}) {
  const [pendingDecision, setPendingDecision] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!pendingDecision) return;
    setSubmitting(true);
    const result = await decideApprovalAction({
      approvalRequestId,
      stepOrder,
      decision: pendingDecision,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(pendingDecision === "APPROVED" ? "Request approved." : "Request rejected.");
    setPendingDecision(null);
    setNotes("");
    onDecided?.();
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setPendingDecision("APPROVED")}>
          <Check className="size-3.5" aria-hidden /> Approve
        </Button>
        <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setPendingDecision("REJECTED")}>
          <X className="size-3.5" aria-hidden /> Reject
        </Button>
      </div>

      {pendingDecision ? (
        <Dialog open onOpenChange={(open) => !open && setPendingDecision(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {pendingDecision === "APPROVED" ? "Approve this request?" : "Reject this request?"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              <Textarea
                placeholder={
                  pendingDecision === "REJECTED"
                    ? "Reason for rejecting (optional)"
                    : "Notes (optional)"
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingDecision(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant={pendingDecision === "REJECTED" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting ? "Saving…" : pendingDecision === "APPROVED" ? "Approve" : "Reject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
