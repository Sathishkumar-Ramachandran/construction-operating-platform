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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { createCertificationAction, verifyCertificationAction } from "@/actions/hr-document-actions";
import { deriveExpiryState } from "@/lib/services/expiry-service";
import { useMasterDataOptions } from "@/components/hr/use-master-data-options";
import type { listCertifications } from "@/lib/services/certification-service";

type Certification = Awaited<ReturnType<typeof listCertifications>>[number];

export function CertificationsPanel({
  employeeId,
  certifications,
  canManage,
}: {
  employeeId: string;
  certifications: Certification[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleVerify(id: string) {
    const result = await verifyCertificationAction(id);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Certification verified.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Licences & certifications</h4>
        {canManage ? (
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            Add certification
          </Button>
        ) : null}
      </div>

      {certifications.length === 0 ? (
        <EmptyState title="No certifications on file" description="Licences and certifications will appear here once added." />
      ) : (
        <ul className="space-y-2">
          {certifications.map((cert) => {
            const derived = cert.expiryDate
              ? deriveExpiryState(cert.expiryDate, cert.status as never)
              : cert.status;
            return (
              <li key={cert.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{cert.type.name}</span>
                  <span className="text-muted-foreground">{cert.licenceNumber}</span>
                  <Badge variant="outline">{derived}</Badge>
                  {canManage && !cert.verifiedAt ? (
                    <Button size="sm" variant="outline" className="ml-auto" onClick={() => handleVerify(cert.id)}>
                      Verify
                    </Button>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {cert.expiryDate ? `Expires ${new Date(cert.expiryDate).toLocaleDateString()}` : "No expiry"} · {cert.issuingAuthority}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {createOpen ? (
        <CreateCertificationDialog
          employeeId={employeeId}
          onOpenChange={setCreateOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function CreateCertificationDialog({
  employeeId,
  onOpenChange,
  onCreated,
}: {
  employeeId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { data } = useMasterDataOptions("certification-types");

  const [typeId, setTypeId] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [issuingAuthority, setIssuingAuthority] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [expiryDate, setExpiryDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!typeId || !licenceNumber || !issuingAuthority) {
      toast.error("Fill in all required fields.");
      return;
    }
    setSubmitting(true);
    const result = await createCertificationAction({
      employeeId,
      typeId,
      licenceNumber,
      issuingAuthority,
      issueDate,
      expiryDate: expiryDate || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Certification added.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add certification</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={typeId} onValueChange={(v) => setTypeId(v ?? "")}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select certification type" />
              </SelectTrigger>
              <SelectContent>
                {(data ?? []).map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Licence number</Label>
            <Input value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} />
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
            {submitting ? "Saving…" : "Add certification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
