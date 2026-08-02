"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { changeLeadStatusAction, convertLeadToProjectAction } from "@/actions/lead-actions";
import { LEAD_STATUS_TRANSITIONS, LEAD_STATUS_LABELS, type LeadStatus } from "@/lib/crm/constants";

export function LeadStatusActions({
  leadId,
  status,
  canConvert,
}: {
  leadId: string;
  status: LeadStatus;
  canConvert: boolean;
}) {
  const router = useRouter();
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const nextStatuses = LEAD_STATUS_TRANSITIONS[status].filter((s) => s !== "LOST" && s !== "CONVERTED");
  const canMarkLost = LEAD_STATUS_TRANSITIONS[status].includes("LOST" as LeadStatus);

  async function advanceTo(next: LeadStatus) {
    setSubmitting(true);
    const result = await changeLeadStatusAction(leadId, { status: next });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Lead moved to ${LEAD_STATUS_LABELS[next]}.`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {nextStatuses.map((next) => (
        <Button key={next} size="sm" disabled={submitting} onClick={() => advanceTo(next)}>
          Mark {LEAD_STATUS_LABELS[next]}
        </Button>
      ))}
      {canMarkLost ? (
        <Button size="sm" variant="outline" disabled={submitting} onClick={() => setLostDialogOpen(true)}>
          Mark Lost
        </Button>
      ) : null}
      {status === "WON" && canConvert ? (
        <Button size="sm" onClick={() => setConvertDialogOpen(true)}>
          Convert to Project
        </Button>
      ) : null}

      {lostDialogOpen ? (
        <MarkLostDialog
          leadId={leadId}
          onOpenChange={setLostDialogOpen}
          onDone={() => router.refresh()}
        />
      ) : null}
      {convertDialogOpen ? (
        <ConvertToProjectDialog leadId={leadId} onOpenChange={setConvertDialogOpen} />
      ) : null}
    </div>
  );
}

function MarkLostDialog({
  leadId,
  onOpenChange,
  onDone,
}: {
  leadId: string;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}) {
  const [lostReason, setLostReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    const result = await changeLeadStatusAction(leadId, { status: "LOST", lostReason });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Lead marked lost.");
    onOpenChange(false);
    onDone();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark lead as lost</DialogTitle>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Reason</Label>
          <Textarea value={lostReason} onChange={(e) => setLostReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Saving…" : "Mark Lost"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConvertToProjectDialog({ leadId, onOpenChange }: { leadId: string; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [startDate, setStartDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!code || !name) {
      toast.error("Project code and name are required.");
      return;
    }
    setSubmitting(true);
    const result = await convertLeadToProjectAction(leadId, { code: code.toUpperCase(), name, address, startDate });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Converted to project.");
    onOpenChange(false);
    router.push(`/projects/${(result.data as { id: string }).id}`);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert lead to project</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Project code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. PRJ-2026-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Converting…" : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
