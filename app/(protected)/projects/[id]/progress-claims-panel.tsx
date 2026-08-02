"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ReceiptText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import {
  createProgressClaimAction,
  submitProgressClaimForCertificationAction,
  markProgressClaimPaidAction,
} from "@/actions/progress-claim-actions";
import {
  PROGRESS_CLAIM_STATUS_LABELS,
  DEFAULT_RETENTION_PERCENTAGE,
  type ProgressClaimStatus,
} from "@/lib/projects/constants";
import { cn } from "@/lib/utils";
import type { ProgressClaimView } from "@/app/(protected)/projects/[id]/types";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "border-border text-muted-foreground",
  PENDING_APPROVAL: "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400",
  CERTIFIED: "border-primary/30 bg-primary/10 text-primary",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
  PAID: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
};

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function ProgressClaimsPanel({
  projectId,
  claims,
  canManageClaims,
}: {
  projectId: string;
  claims: ProgressClaimView[];
  canManageClaims: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleSubmit(id: string) {
    const result = await submitProgressClaimForCertificationAction(id, projectId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Submitted for certification.");
    router.refresh();
  }

  async function handleMarkPaid(id: string) {
    const result = await markProgressClaimPaidAction(id, projectId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Marked as paid.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Progress claims</h4>
        {canManageClaims ? (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" aria-hidden /> New claim
          </Button>
        ) : null}
      </div>

      {claims.length === 0 ? (
        <EmptyState icon={ReceiptText} title="No progress claims yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim #</TableHead>
              <TableHead>Period to</TableHead>
              <TableHead className="text-right">Claimed</TableHead>
              <TableHead className="text-right">Certified</TableHead>
              <TableHead className="text-right">Retention</TableHead>
              <TableHead>Status</TableHead>
              {canManageClaims ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {claims.map((claim) => (
              <TableRow key={claim.id}>
                <TableCell className="font-medium">#{claim.claimNumber}</TableCell>
                <TableCell>{new Date(claim.claimPeriodTo).toLocaleDateString("en-SG")}</TableCell>
                <TableCell className="text-right">{money(claim.claimedAmount)}</TableCell>
                <TableCell className="text-right">{claim.certifiedAmount != null ? money(claim.certifiedAmount) : "—"}</TableCell>
                <TableCell className="text-right">{claim.retentionHeld != null ? money(claim.retentionHeld) : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[claim.status])}>
                    {PROGRESS_CLAIM_STATUS_LABELS[claim.status as ProgressClaimStatus] ?? claim.status}
                  </Badge>
                </TableCell>
                {canManageClaims ? (
                  <TableCell className="text-right">
                    {claim.status === "DRAFT" ? (
                      <Button size="sm" variant="outline" onClick={() => handleSubmit(claim.id)}>
                        Submit
                      </Button>
                    ) : null}
                    {claim.status === "CERTIFIED" ? (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(claim.id)}>
                        Mark paid
                      </Button>
                    ) : null}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {createOpen ? <CreateProgressClaimDialog projectId={projectId} onOpenChange={setCreateOpen} /> : null}
    </div>
  );
}

function CreateProgressClaimDialog({
  projectId,
  onOpenChange,
}: {
  projectId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [claimPeriodTo, setClaimPeriodTo] = useState("");
  const [claimedAmount, setClaimedAmount] = useState("");
  const [retentionPercentage, setRetentionPercentage] = useState(String(DEFAULT_RETENTION_PERCENTAGE));
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!claimPeriodTo || !claimedAmount) {
      toast.error("Claim period and amount are required.");
      return;
    }
    setSubmitting(true);
    const result = await createProgressClaimAction({
      projectId,
      claimPeriodTo,
      claimedAmount: Number(claimedAmount),
      retentionPercentage: Number(retentionPercentage),
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Progress claim created.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New progress claim</DialogTitle>
          <DialogDescription>Interim claim for work completed to date. Certification happens via Approvals.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Claim period to</Label>
            <Input type="date" value={claimPeriodTo} onChange={(e) => setClaimPeriodTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Claimed amount</Label>
            <Input type="number" min={0} step="0.01" value={claimedAmount} onChange={(e) => setClaimedAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Retention %</Label>
            <Input type="number" min={0} max={100} step="0.1" value={retentionPercentage} onChange={(e) => setRetentionPercentage(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
