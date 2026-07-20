"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ApprovalStatusBadge } from "@/components/shared/approval-status-badge";
import { createResourceRequestAction, cancelResourceRequestAction } from "@/actions/resource-request-actions";
import type { ResourceRequestView, SiteView } from "@/app/(protected)/projects/[id]/types";

export function ResourceRequestsPanel({
  projectId,
  sites,
  resourceRequests,
  canRequestResources,
}: {
  projectId: string;
  sites: SiteView[];
  resourceRequests: ResourceRequestView[];
  actorUserId: string;
  canRequestResources: boolean;
}) {
  const router = useRouter();
  const [requestOpen, setRequestOpen] = useState(false);

  async function handleCancel(id: string) {
    const result = await cancelResourceRequestAction({ id });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Request cancelled.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Inventory requests</h4>
        {canRequestResources ? (
          <Button size="sm" onClick={() => setRequestOpen(true)}>
            Request equipment/material
          </Button>
        ) : null}
      </div>

      {resourceRequests.length === 0 ? (
        <EmptyState
          title="No requests yet"
          description="Equipment and material requests for this project will appear here."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Quantity</th>
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Needed by</th>
                <th className="px-3 py-2 font-medium">Status</th>
                {canRequestResources ? <th className="px-3 py-2 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {resourceRequests.map((request) => (
                <tr key={request.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">{request.itemDescription}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {request.quantity} {request.unit}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{request.site?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {request.neededByDate ? new Date(request.neededByDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <ApprovalStatusBadge status={request.status} />
                  </td>
                  {canRequestResources ? (
                    <td className="px-3 py-2 text-right">
                      {request.status === "PENDING" ? (
                        <Button size="sm" variant="outline" onClick={() => handleCancel(request.id)}>
                          Cancel
                        </Button>
                      ) : null}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {requestOpen ? (
        <RequestResourceDialog
          projectId={projectId}
          sites={sites}
          onOpenChange={setRequestOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

type MaterialOption = { id: string; code: string; name: string; unit: string; isActive?: boolean };

function useMaterials() {
  return useQuery<MaterialOption[]>({
    queryKey: ["/api/erp-settings", "materials"],
    queryFn: async () => {
      const res = await fetch("/api/erp-settings/materials");
      if (!res.ok) throw new Error("Failed to load materials.");
      const { items } = await res.json();
      return items;
    },
    staleTime: 60_000,
  });
}

function RequestResourceDialog({
  projectId,
  sites,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  sites: SiteView[];
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const activeMaterials = materials.filter((m) => m.isActive !== false);
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [siteId, setSiteId] = useState("");
  const [neededByDate, setNeededByDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedMaterial = activeMaterials.find((m) => m.id === materialId) ?? null;

  async function handleSubmit() {
    if (!materialId) {
      toast.error("Select a material.");
      return;
    }
    setSubmitting(true);
    const result = await createResourceRequestAction({
      projectId,
      siteId: siteId || undefined,
      materialId,
      quantity: Number(quantity),
      neededByDate: neededByDate || undefined,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Request submitted for approval.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request equipment/material</DialogTitle>
          <DialogDescription>Submitted requests go to Admin for approval.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Material</Label>
            <Select
              value={materialId}
              onValueChange={(v) => setMaterialId(v ?? "")}
              items={activeMaterials.map((m) => ({ value: m.id, label: `${m.name} (${m.unit})` }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={materialsLoading ? "Loading materials…" : "Select a material"} />
              </SelectTrigger>
              <SelectContent>
                {activeMaterials.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!materialsLoading && activeMaterials.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No materials in the ERP catalog yet — ask an Admin to add one under ERP → Materials &amp; Suppliers.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label>Quantity{selectedMaterial ? ` (${selectedMaterial.unit})` : ""}</Label>
            <Input type="number" min={0.01} step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          {sites.length > 0 ? (
            <div className="space-y-1.5">
              <Label>Site (optional)</Label>
              <Select
                value={siteId}
                onValueChange={(v) => setSiteId(v ?? "")}
                items={sites.map((site) => ({ value: site.id, label: site.name }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No specific site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label>Needed by (optional)</Label>
            <Input type="date" value={neededByDate} onChange={(e) => setNeededByDate(e.target.value)} />
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
          <Button type="button" onClick={handleSubmit} disabled={submitting || materialsLoading}>
            {submitting ? "Submitting…" : "Submit request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
