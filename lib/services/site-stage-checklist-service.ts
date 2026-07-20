import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { SITE_STAGE_CHECKLISTS, type SiteStage } from "@/lib/projects/constants";
import { getActorEmployeeId } from "@/lib/services/employee-service";
import { isActivelyAssignedToSite } from "@/lib/services/employee-allocation-service";
import { hasRole } from "@/lib/services/authorization-service";
import { UserRole } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";

export type ChecklistItemState = { index: number; label: string; isChecked: boolean };

/** Duplicated from site-stage-service.ts's assertCanAdvanceSiteStage (not
 * imported, to avoid a circular dependency — site-stage-service imports
 * isChecklistComplete from this file to gate advancement). Same
 * relationship-scoped rule: Manager/Admin/Super Admin always may touch a
 * site's checklist; anyone else needs an active assignment to it. */
async function assertCanTouchSite(actor: AuthenticatedUser, siteId: string): Promise<void> {
  const isAdmin = await hasRole(actor, [UserRole.SUPER_ADMIN, UserRole.ADMIN]);
  if (isAdmin) return;
  if (actor.role === UserRole.MANAGER) return;

  const employeeId = await getActorEmployeeId(actor.id);
  if (!employeeId || !(await isActivelyAssignedToSite(employeeId, siteId))) {
    throw new AppError(ErrorCode.SITE_STAGE_NOT_AUTHORIZED);
  }
}

export async function getChecklistForSite(siteId: string, stage: SiteStage): Promise<ChecklistItemState[]> {
  const labels = SITE_STAGE_CHECKLISTS[stage] ?? [];
  if (labels.length === 0) return [];
  const rows = await db.siteStageChecklistItem.findMany({ where: { siteId, stage } });
  const byIndex = new Map(rows.map((row) => [row.itemIndex, row]));
  return labels.map((label, index) => ({
    index,
    label,
    isChecked: byIndex.get(index)?.isChecked ?? false,
  }));
}

export async function isChecklistComplete(siteId: string, stage: SiteStage): Promise<boolean> {
  const labels = SITE_STAGE_CHECKLISTS[stage];
  if (!labels || labels.length === 0) return true;
  const checklist = await getChecklistForSite(siteId, stage);
  return checklist.every((item) => item.isChecked);
}

export async function setChecklistItem(
  actor: AuthenticatedUser,
  input: { siteId: string; stage: SiteStage; itemIndex: number; isChecked: boolean }
): Promise<ChecklistItemState[]> {
  const site = await db.site.findUnique({ where: { id: input.siteId } });
  if (!site) throw new AppError(ErrorCode.SITE_NOT_FOUND);

  // Only the site's current stage checklist is editable — once the site
  // advances, its past-stage rows stay as a historical record but are frozen.
  if (site.currentStage !== input.stage) {
    throw new AppError(ErrorCode.SITE_STAGE_CHECKLIST_LOCKED);
  }

  const labels = SITE_STAGE_CHECKLISTS[input.stage] ?? [];
  if (input.itemIndex < 0 || input.itemIndex >= labels.length) {
    throw new AppError(ErrorCode.VALIDATION_ERROR);
  }

  await assertCanTouchSite(actor, site.id);

  await db.siteStageChecklistItem.upsert({
    where: { siteId_stage_itemIndex: { siteId: site.id, stage: input.stage, itemIndex: input.itemIndex } },
    create: {
      siteId: site.id,
      stage: input.stage,
      itemIndex: input.itemIndex,
      isChecked: input.isChecked,
      checkedBy: input.isChecked ? actor.id : null,
      checkedAt: input.isChecked ? new Date() : null,
    },
    update: {
      isChecked: input.isChecked,
      checkedBy: input.isChecked ? actor.id : null,
      checkedAt: input.isChecked ? new Date() : null,
    },
  });

  return getChecklistForSite(site.id, input.stage);
}
