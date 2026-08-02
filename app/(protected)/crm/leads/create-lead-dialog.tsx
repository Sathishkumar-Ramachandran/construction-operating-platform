"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createLeadAction } from "@/actions/lead-actions";
import { LEAD_SOURCE_LABELS, LEAD_ACQUISITION_PATH_LABELS } from "@/lib/crm/constants";

type OwnerOption = { id: string; name: string };

export function CreateLeadDialog({ owners, defaultOwnerId }: { owners: OwnerOption[]; defaultOwnerId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clientName, setClientName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [source, setSource] = useState<string>("");
  const [acquisitionPath, setAcquisitionPath] = useState<"TENDER" | "NORMAL">("NORMAL");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [ownerUserId, setOwnerUserId] = useState(defaultOwnerId);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!clientName) {
      toast.error("Client name is required.");
      return;
    }
    setSubmitting(true);
    const result = await createLeadAction({
      clientName,
      contactPersonName,
      contactPhone,
      contactEmail,
      source: source || undefined,
      acquisitionPath,
      estimatedValue: estimatedValue || undefined,
      ownerUserId,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Lead created.");
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <Button className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> New lead
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New lead</DialogTitle>
          </DialogHeader>
          <div className="max-h-[65vh] space-y-4 overflow-y-auto py-2">
            <div className="space-y-1.5">
              <Label>Client name</Label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Contact person</Label>
                <Input value={contactPersonName} onChange={(e) => setContactPersonName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact phone</Label>
                <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contact email</Label>
              <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={source} onValueChange={(value) => setSource(value ?? "")}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Acquisition path</Label>
                <Select value={acquisitionPath} onValueChange={(value) => setAcquisitionPath((value ?? "NORMAL") as "TENDER" | "NORMAL")}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEAD_ACQUISITION_PATH_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Estimated value ($)</Label>
                <Input type="number" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Select value={ownerUserId} onValueChange={(value) => setOwnerUserId(value ?? defaultOwnerId)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {owners.map((owner) => (
                      <SelectItem key={owner.id} value={owner.id}>{owner.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
