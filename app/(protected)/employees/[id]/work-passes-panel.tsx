"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { createWorkPassAction, verifyWorkPassAction } from "@/actions/hr-document-actions";
import { WORK_PASS_TYPES } from "@/lib/hr/constants";
import { deriveExpiryState } from "@/lib/services/expiry-service";
import type { listWorkPasses } from "@/lib/services/work-pass-service";

type WorkPass = Awaited<ReturnType<typeof listWorkPasses>>[number];

export function WorkPassesPanel({
  employeeId,
  workPasses,
  canManage,
}: {
  employeeId: string;
  workPasses: WorkPass[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleVerify(id: string) {
    const result = await verifyWorkPassAction(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Work pass verified.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Work passes</h4>
        {canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Add work pass
          </Button>
        ) : null}
      </div>

      {workPasses.length === 0 ? (
        <EmptyState title="No work passes on file" description="Work pass records will appear here once added." />
      ) : (
        <ul className="space-y-2">
          {workPasses.map((pass) => {
            const derived = deriveExpiryState(pass.expiryDate, pass.status as never);
            return (
              <li key={pass.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{pass.passType}</span>
                  <span className="text-muted-foreground">{pass.passNumber}</span>
                  <Badge variant="outline">{derived}</Badge>
                  {canManage && !pass.verifiedAt ? (
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleVerify(pass.id)}>
                      Verify
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Expires {new Date(pass.expiryDate).toLocaleDateString()} · {pass.issuingAuthority}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {createOpen ? (
        <CreateWorkPassDialog
          employeeId={employeeId}
          onOpenChange={setCreateOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function CreateWorkPassDialog({
  employeeId,
  onOpenChange,
  onCreated,
}: {
  employeeId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [passType, setPassType] = useState<string>(WORK_PASS_TYPES[0]);
  const [passNumber, setPassNumber] = useState("");
  const [issuingCountry, setIssuingCountry] = useState("Singapore");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!passNumber || !issuingAuthority || !expiryDate) {
      toast.error("Fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const result = await createWorkPassAction({
      employeeId,
      passType,
      passNumber,
      issuingCountry,
      issuingAuthority,
      issueDate,
      expiryDate,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Work pass added.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add work pass</DialogTitle>
          <DialogDescription>Configurable pass types — statutory eligibility rules aren&apos;t enforced here.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Pass type</Label>
            <Select value={passType} onValueChange={(v) => v && setPassType(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_PASS_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Pass number</Label>
            <Input value={passNumber} onChange={(e) => setPassNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Issuing country</Label>
            <Input value={issuingCountry} onChange={(e) => setIssuingCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Issuing authority</Label>
            <Input value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Issue date</Label>
              <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry date</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Add work pass"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
