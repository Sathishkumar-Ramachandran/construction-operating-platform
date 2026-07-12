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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { addBankAccountAction } from "@/actions/employee-personal-actions";
import type { listBankAccountsMasked } from "@/lib/services/employee-personal-service";

type BankAccount = Awaited<ReturnType<typeof listBankAccountsMasked>>[number];

export function BankAccountsPanel({
  employeeId,
  accounts,
}: {
  employeeId: string;
  accounts: BankAccount[];
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Bank accounts</h4>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          Add account
        </Button>
      </div>

      {accounts.length === 0 ? (
        <EmptyState title="No bank accounts on file" description="Bank details are encrypted at rest and shown masked." />
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.id} className="rounded-xl border border-border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{account.bankName}</span>
                <span className="font-mono text-muted-foreground">{account.maskedAccountNumber}</span>
                {account.isPrimary ? <Badge>Primary</Badge> : null}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{account.accountHolderName}</p>
            </li>
          ))}
        </ul>
      )}

      {addOpen ? (
        <AddBankAccountDialog
          employeeId={employeeId}
          onOpenChange={setAddOpen}
          onAdded={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function AddBankAccountDialog({
  employeeId,
  onOpenChange,
  onAdded,
}: {
  employeeId: string;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}) {
  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!bankName || !accountHolderName || accountNumber.length < 4) {
      toast.error("Fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const result = await addBankAccountAction({
      employeeId,
      bankName,
      accountHolderName,
      accountNumber,
      isPrimary: true,
      effectiveFrom,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Bank account added.");
    onOpenChange(false);
    onAdded();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add bank account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Bank name</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Account holder name</Label>
            <Input value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Account number</Label>
            <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Effective from</Label>
            <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
