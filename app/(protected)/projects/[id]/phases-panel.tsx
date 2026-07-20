"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronDown, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApprovalStatusBadge } from "@/components/shared/approval-status-badge";
import { advanceSiteStageAction, setSiteStageChecklistItemAction } from "@/actions/site-stage-actions";
import {
  SITE_STAGE_ORDER,
  SITE_STAGE_LABELS,
  SITE_STAGE_TIPS,
  LAST_SELF_ADVANCE_STAGE,
  isFinalSiteStage,
  nextSiteStage,
  type ProjectStatus,
  type SiteStage,
} from "@/lib/projects/constants";
import { UserRole } from "@/lib/authorization/roles";
import { cn } from "@/lib/utils";
import type {
  AssignmentView,
  ChecklistItemView,
  SiteApprovalMap,
  SiteChecklistMap,
  SiteView,
} from "@/app/(protected)/projects/[id]/types";

/** UI affordance only — the server re-validates via assertCanAdvanceSiteStage
 * on submit, which is the real security boundary. Mirrors that function's
 * logic: Manager/Admin/Super Admin always may; anyone else needs an ACTIVE
 * assignment to this exact site. */
function canAdvanceSite(
  site: SiteView,
  actorRole: UserRole,
  actorEmployeeId: string | null,
  assignments: AssignmentView[]
) {
  if (actorRole === UserRole.SUPER_ADMIN || actorRole === UserRole.ADMIN || actorRole === UserRole.MANAGER) {
    return true;
  }
  if (!actorEmployeeId) return false;
  return assignments.some(
    (assignment) =>
      assignment.site?.id === site.id && assignment.employee.id === actorEmployeeId && assignment.status === "ACTIVE"
  );
}

export function PhasesPanel({
  projectStatus,
  sites,
  siteApprovals,
  siteChecklists,
  assignments,
  actorRole,
  actorEmployeeId,
  restricted,
}: {
  projectStatus: ProjectStatus;
  sites: SiteView[];
  siteApprovals: SiteApprovalMap;
  siteChecklists: SiteChecklistMap;
  assignments: AssignmentView[];
  actorRole: UserRole;
  actorEmployeeId: string | null;
  restricted: boolean;
}) {
  const router = useRouter();

  // Team Members only ever see the site(s) they're actively assigned to —
  // presentational scoping; the real boundary is assertActorCanAccessProject
  // (project-level, page.tsx) and assertCanAdvanceSiteStage (site-level).
  const visibleSites = restricted
    ? sites.filter((site) =>
        assignments.some(
          (a) => a.site?.id === site.id && a.employee.id === actorEmployeeId && a.status === "ACTIVE"
        )
      )
    : sites;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-foreground">Phases</h4>

      {visibleSites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          {restricted
            ? "You're not assigned to a site on this project yet."
            : "No sites yet — add one from the Project Information tab to start tracking phases."}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleSites.map((site) => {
            const approval = siteApprovals[site.id] ?? null;
            const hasPendingApproval = approval?.status === "PENDING";
            const final = isFinalSiteStage(site.currentStage);
            const canAdvance =
              projectStatus === "ACTIVE" &&
              !hasPendingApproval &&
              !final &&
              canAdvanceSite(site, actorRole, actorEmployeeId, assignments);

            return (
              <div key={site.id} className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{site.name}</p>
                    <p className="text-xs text-muted-foreground">{site.code}</p>
                  </div>
                  {final ? <Badge variant="outline">Complete</Badge> : null}
                </div>

                <StageStepper
                  siteId={site.id}
                  currentStage={site.currentStage}
                  checklist={siteChecklists[site.id] ?? []}
                  canAdvance={canAdvance}
                  onAdvanced={() => router.refresh()}
                />

                {hasPendingApproval ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <ApprovalStatusBadge status="PENDING" />
                    <span className="text-muted-foreground">
                      Awaiting Admin approval — decide it from the Approvals inbox.
                    </span>
                    <Link href="/approvals" className="text-primary hover:underline">
                      Go to Approvals
                    </Link>
                  </div>
                ) : approval?.status === "REJECTED" ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <ApprovalStatusBadge status="REJECTED" />
                      <span className="text-muted-foreground">
                        Handover request was rejected. It can be resubmitted.
                      </span>
                    </div>
                    {approval.decisionNotes ? (
                      <p className="mt-1 text-muted-foreground">Reason: {approval.decisionNotes}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Vertical, mobile-first, click-to-expand stage stepper. Only the current
 * stage is interactive — expanding it reveals the advance action inline (no
 * modal). Past stages are done (checkmark, inert); future stages are locked
 * (lock icon, inert) — the concrete answer to "only the first should be
 * open." advanceSiteStageAction/assertCanAdvanceSiteStage are the real
 * security boundary; this component is presentation only. */
function StageStepper({
  siteId,
  currentStage,
  checklist,
  canAdvance,
  onAdvanced,
}: {
  siteId: string;
  currentStage: SiteStage;
  checklist: ChecklistItemView[];
  canAdvance: boolean;
  onAdvanced: () => void;
}) {
  const currentIndex = SITE_STAGE_ORDER.indexOf(currentStage);
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState(checklist);
  const [togglingIndex, setTogglingIndex] = useState<number | null>(null);

  const next = nextSiteStage(currentStage);
  const isHandoverSubmission = currentStage === LAST_SELF_ADVANCE_STAGE;
  const tip = SITE_STAGE_TIPS[currentStage];
  const checklistComplete = items.every((item) => item.isChecked);

  async function handleToggleItem(itemIndex: number, isChecked: boolean) {
    const previous = items;
    setItems((cur) => cur.map((item) => (item.index === itemIndex ? { ...item, isChecked } : item)));
    setTogglingIndex(itemIndex);
    const result = await setSiteStageChecklistItemAction({ siteId, stage: currentStage, itemIndex, isChecked });
    setTogglingIndex(null);
    if (!result.ok) {
      setItems(previous);
      toast.error(result.message);
    }
  }

  async function handleAdvance() {
    setSubmitting(true);
    const result = await advanceSiteStageAction({ siteId, notes });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(isHandoverSubmission ? "Submitted for handover approval." : "Stage advanced.");
    setExpanded(false);
    setNotes("");
    onAdvanced();
  }

  return (
    <ol className="space-y-1.5">
      {SITE_STAGE_ORDER.map((stage, index) => {
        const isDone = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isLocked = index > currentIndex;
        const isExpandable = isCurrent && canAdvance && !!next;

        return (
          <li key={stage} className="overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              disabled={!isExpandable}
              onClick={() => isExpandable && setExpanded((v) => !v)}
              className={cn(
                "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-medium transition-colors",
                isCurrent ? "bg-primary/10 text-primary" : isDone ? "bg-gold/10 text-gold-foreground dark:text-gold" : "text-muted-foreground",
                isExpandable ? "cursor-pointer hover:bg-primary/15" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border text-xs",
                  isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : isDone
                      ? "border-gold/50 bg-gold text-white"
                      : "border-border text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-3" aria-hidden /> : isLocked ? <Lock className="size-3" aria-hidden /> : <span className="tabular-nums">{index + 1}</span>}
              </span>
              <span className="flex-1">{SITE_STAGE_LABELS[stage]}</span>
              {isExpandable ? (
                <ChevronDown className={cn("size-4 shrink-0 transition-transform", expanded && "rotate-180")} aria-hidden />
              ) : null}
            </button>

            {isExpandable && expanded ? (
              <div className="space-y-3 border-t border-border bg-muted/20 p-3">
                {tip ? <p className="text-xs text-muted-foreground">{tip}</p> : null}
                {items.length > 0 ? (
                  <div className="space-y-1.5">
                    <Label>Checklist</Label>
                    <ul className="space-y-1.5">
                      {items.map((item) => (
                        <li key={item.index}>
                          <label className="flex items-start gap-2 text-sm">
                            <Checkbox
                              className="mt-0.5"
                              checked={item.isChecked}
                              disabled={togglingIndex === item.index}
                              onCheckedChange={(v) => handleToggleItem(item.index, v === true)}
                            />
                            <span className={cn(item.isChecked && "text-muted-foreground line-through")}>
                              {item.label}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {!checklistComplete ? (
                      <p className="text-xs text-muted-foreground">
                        Check off every item to unlock advancing this stage.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </div>
                <Button size="sm" onClick={handleAdvance} disabled={submitting || !checklistComplete}>
                  {submitting
                    ? "Submitting…"
                    : isHandoverSubmission
                      ? "Submit for Handover Approval"
                      : `Mark ${SITE_STAGE_LABELS[next!]} complete`}
                </Button>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

