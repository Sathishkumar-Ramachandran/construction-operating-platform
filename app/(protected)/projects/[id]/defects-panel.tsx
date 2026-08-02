"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createDefectItemAction, changeDefectItemStatusAction } from "@/actions/defect-item-actions";
import {
  DEFECT_ITEM_STATUS_LABELS,
  DEFECT_ITEM_STATUS_TRANSITIONS,
  type DefectItemStatus,
} from "@/lib/projects/constants";
import { cn } from "@/lib/utils";
import type { DefectItemView, SiteView } from "@/app/(protected)/projects/[id]/types";

const STATUS_STYLES: Record<string, string> = {
  OPEN: "border-destructive/30 bg-destructive/10 text-destructive",
  IN_PROGRESS: "border-primary/30 bg-primary/10 text-primary",
  RECTIFIED: "border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-400",
  DISPUTED: "border-destructive/30 bg-destructive/10 text-destructive",
  CLOSED: "border-gold/40 bg-gold/10 text-gold-foreground dark:text-gold",
};

export function DefectsPanel({
  projectId,
  sites,
  defects,
  canManageDefects,
}: {
  projectId: string;
  sites: SiteView[];
  defects: DefectItemView[];
  canManageDefects: boolean;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleStatusChange(id: string, status: string) {
    const result = await changeDefectItemStatusAction(id, projectId, { status });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Defect updated.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Defects (DLP)</h4>
        {canManageDefects ? (
          <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-3.5" aria-hidden /> Log defect
          </Button>
        ) : null}
      </div>

      {defects.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="No defects logged" description="Defects reported during the Defects Liability Period will appear here." />
      ) : (
        <div className="space-y-3">
          {defects.map((defect) => {
            const options = DEFECT_ITEM_STATUS_TRANSITIONS[defect.status as DefectItemStatus] ?? [];
            return (
              <div key={defect.id} className="space-y-2 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{defect.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {defect.site ? `${defect.site.name} · ` : ""}
                      Reported {new Date(defect.reportedAt).toLocaleDateString("en-SG")}
                      {defect.dueDate ? ` · Due ${new Date(defect.dueDate).toLocaleDateString("en-SG")}` : ""}
                    </p>
                  </div>
                  <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[defect.status])}>
                    {DEFECT_ITEM_STATUS_LABELS[defect.status as DefectItemStatus] ?? defect.status}
                  </Badge>
                </div>
                {canManageDefects && options.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {options.map((opt) => (
                      <Button key={opt} size="sm" variant="outline" onClick={() => handleStatusChange(defect.id, opt)}>
                        Mark {DEFECT_ITEM_STATUS_LABELS[opt]}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {createOpen ? <CreateDefectDialog projectId={projectId} sites={sites} onOpenChange={setCreateOpen} /> : null}
    </div>
  );
}

function CreateDefectDialog({
  projectId,
  sites,
  onOpenChange,
}: {
  projectId: string;
  sites: SiteView[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [siteId, setSiteId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!description) {
      toast.error("Description is required.");
      return;
    }
    setSubmitting(true);
    const result = await createDefectItemAction({
      projectId,
      siteId: siteId || undefined,
      description,
      dueDate: dueDate || undefined,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Defect logged.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log defect</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {sites.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Site (optional)</Label>
              <Select
                value={siteId}
                onValueChange={(v) => setSiteId(v ?? "")}
                items={sites.map((site) => ({ value: site.id, label: site.name }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="No specific site" /></SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>{site.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Due date (optional)</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Logging…" : "Log defect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
