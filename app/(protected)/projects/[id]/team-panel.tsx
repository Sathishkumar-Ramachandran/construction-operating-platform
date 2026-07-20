"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import { EmployeePicker } from "@/components/hr/employee-picker";
import { CorrectAttendanceDialog } from "@/components/hr/correct-attendance-dialog";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { createAssignmentAction, endAssignmentAction } from "@/actions/allocation-actions";
import { cn } from "@/lib/utils";
import type { AssignmentView, SiteView } from "@/app/(protected)/projects/[id]/types";

type ProjectRoleOption = { id: string; code: string; name: string; isActive: boolean };

const ASSIGNMENT_STATUS_STYLES: Record<string, string> = {
  PLANNED: "border-border text-muted-foreground",
  ACTIVE: "border-primary/30 bg-primary/10 text-primary",
  COMPLETED: "border-border text-muted-foreground",
  CANCELLED: "border-destructive/30 bg-destructive/10 text-destructive",
  SUSPENDED:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400",
};

function AssignmentStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", ASSIGNMENT_STATUS_STYLES[status] ?? "border-border text-muted-foreground")}
    >
      {status}
    </Badge>
  );
}

export function TeamPanel({
  projectId,
  sites,
  assignments,
  canManageTeam,
}: {
  projectId: string;
  sites: SiteView[];
  assignments: AssignmentView[];
  canManageTeam: boolean;
}) {
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [attendanceTarget, setAttendanceTarget] = useState<AssignmentView | null>(null);

  async function handleEnd(assignmentId: string) {
    const result = await endAssignmentAction({
      assignmentId,
      endDate: new Date().toISOString().slice(0, 10),
    });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Assignment ended.");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Team</h4>
        {canManageTeam ? (
          <Button size="sm" onClick={() => setAssignOpen(true)}>
            Assign employee
          </Button>
        ) : null}
      </div>

      {assignments.length === 0 ? (
        <EmptyState title="No team members assigned" description="Assign employees to this project to see them here." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Employee</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Site</th>
                <th className="px-3 py-2 font-medium">Allocation</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Dates</th>
                {canManageTeam ? <th className="px-3 py-2 font-medium">Attendance</th> : null}
                {canManageTeam ? <th className="px-3 py-2 font-medium" /> : null}
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium text-foreground">
                    {employeeDisplayName(assignment.employee)}
                    {assignment.isPrimary ? <Badge className="ml-1.5">Primary</Badge> : null}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{assignment.projectRole?.name ?? "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{assignment.site?.name ?? "Unassigned"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{assignment.allocationPercentage}%</td>
                  <td className="px-3 py-2">
                    <AssignmentStatusBadge status={assignment.status} />
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                    {new Date(assignment.startDate).toLocaleDateString()}
                    {assignment.endDate ? ` – ${new Date(assignment.endDate).toLocaleDateString()}` : " – ongoing"}
                  </td>
                  {canManageTeam ? (
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => setAttendanceTarget(assignment)}>
                        Mark attendance
                      </Button>
                    </td>
                  ) : null}
                  {canManageTeam ? (
                    <td className="px-3 py-2 text-right">
                      {assignment.status === "ACTIVE" || assignment.status === "PLANNED" ? (
                        <Button size="sm" variant="outline" onClick={() => handleEnd(assignment.id)}>
                          End
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

      {assignOpen ? (
        <AssignEmployeeDialog
          projectId={projectId}
          sites={sites}
          onOpenChange={setAssignOpen}
          onCreated={() => router.refresh()}
        />
      ) : null}

      {attendanceTarget ? (
        <CorrectAttendanceDialog
          employeeId={attendanceTarget.employee.id}
          employeeName={employeeDisplayName(attendanceTarget.employee)}
          date={new Date().toISOString().slice(0, 10)}
          onOpenChange={() => setAttendanceTarget(null)}
          onCorrected={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}

function AssignEmployeeDialog({
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
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [projectRoleId, setProjectRoleId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState("100");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: projectRoles = [] } = useQuery<ProjectRoleOption[]>({
    queryKey: ["hr-settings", "project-roles"],
    queryFn: async () => {
      const res = await fetch("/api/hr-settings/project-roles");
      if (!res.ok) throw new Error("Failed to load project roles.");
      const { items } = await res.json();
      return items;
    },
    staleTime: 60_000,
  });
  const activeProjectRoles = projectRoles.filter((role) => role.isActive !== false);

  async function handleSubmit() {
    if (!employeeId) {
      toast.error("Select an employee.");
      return;
    }
    setSubmitting(true);
    const result = await createAssignmentAction({
      employeeId,
      projectId,
      siteId: siteId || undefined,
      projectRoleId: projectRoleId || undefined,
      allocationPercentage: Number(allocationPercentage),
      startDate,
      endDate: endDate || undefined,
      isPrimary,
      notes,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Employee assigned.");
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign employee</DialogTitle>
          <DialogDescription>Add a team member to this project, optionally scoped to a site.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Employee</Label>
            <EmployeePicker value={employeeId} onChange={setEmployeeId} placeholder="Search employees…" />
          </div>
          <div className="space-y-1.5">
            <Label>Project role (optional)</Label>
            <Select
              value={projectRoleId}
              onValueChange={(v) => setProjectRoleId(v ?? "")}
              items={activeProjectRoles.map((role) => ({ value: role.id, label: role.name }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No role" />
              </SelectTrigger>
              <SelectContent>
                {activeProjectRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectValue placeholder="No site (project-level)" />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Allocation %</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={allocationPercentage}
                onChange={(e) => setAllocationPercentage(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>End date (optional)</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={isPrimary} onCheckedChange={(v) => setIsPrimary(v === true)} />
            Primary assignment
          </label>
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
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
