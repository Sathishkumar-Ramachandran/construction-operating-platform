/**
 * Domain "enums" for the Project Management module, following the same
 * TS-const pattern used by lib/hr/constants.ts / lib/authorization/roles.ts —
 * values are enforced at the TypeScript layer, columns stay plain strings in
 * the DB (see prisma/schema.prisma).
 */

export const ProjectStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  CLOSED: "CLOSED",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  CLOSED: "Closed",
};

/** Allowed project-status transitions — enforced centrally, never ad hoc.
 * DRAFT can go straight to CLOSED (cancel-before-start); CLOSED is terminal,
 * matching the platform's no-hard-delete convention (mirrors
 * EMPLOYMENT_STATUS_TRANSITIONS). */
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: [ProjectStatus.ACTIVE, ProjectStatus.CLOSED],
  ACTIVE: [ProjectStatus.CLOSED],
  CLOSED: [],
};

export function isProjectStatusTransitionAllowed(
  from: ProjectStatus,
  to: ProjectStatus
): boolean {
  return PROJECT_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** The 8-stage per-site construction/repainting execution workflow.
 * Sequential — no skipping ahead. Entry into HANDOVER_DOCUMENTATION
 * requires Admin approval via the Approval Engine; the first 7 are
 * self-advanced by whoever is assigned to the site. */
export const SiteStage = {
  PRE_START_PLANNING: "PRE_START_PLANNING",
  SITE_SETUP_PROTECTION: "SITE_SETUP_PROTECTION",
  SURFACE_PREPARATION: "SURFACE_PREPARATION",
  REPAIR_WORKS: "REPAIR_WORKS",
  PAINTING_SYSTEM_APPLICATION: "PAINTING_SYSTEM_APPLICATION",
  INSPECTION_TOUCH_UP: "INSPECTION_TOUCH_UP",
  CLEANING_DISMANTLING: "CLEANING_DISMANTLING",
  HANDOVER_DOCUMENTATION: "HANDOVER_DOCUMENTATION",
} as const;
export type SiteStage = (typeof SiteStage)[keyof typeof SiteStage];

export const SITE_STAGE_ORDER: SiteStage[] = [
  SiteStage.PRE_START_PLANNING,
  SiteStage.SITE_SETUP_PROTECTION,
  SiteStage.SURFACE_PREPARATION,
  SiteStage.REPAIR_WORKS,
  SiteStage.PAINTING_SYSTEM_APPLICATION,
  SiteStage.INSPECTION_TOUCH_UP,
  SiteStage.CLEANING_DISMANTLING,
  SiteStage.HANDOVER_DOCUMENTATION,
];

export const SITE_STAGE_LABELS: Record<SiteStage, string> = {
  PRE_START_PLANNING: "Pre-Start / Planning",
  SITE_SETUP_PROTECTION: "Site Setup & Protection",
  SURFACE_PREPARATION: "Surface Preparation",
  REPAIR_WORKS: "Repair Works",
  PAINTING_SYSTEM_APPLICATION: "Painting System Application",
  INSPECTION_TOUCH_UP: "Inspection & Touch-Up",
  CLEANING_DISMANTLING: "Cleaning & Dismantling",
  HANDOVER_DOCUMENTATION: "Handover & Documentation",
};

/** The concrete SOP checklist for each stage, sourced from Excell's
 * repainting/repair playbook. Purely additive to the stage machine above —
 * advanceSiteStage requires every item for the *current* stage to be
 * checked before it will advance (see site-stage-checklist-service.ts). A
 * stage with an empty list has nothing to gate on. */
export const SITE_STAGE_CHECKLISTS: Record<SiteStage, string[]> = {
  PRE_START_PLANNING: [
    "Site inspection & condition survey",
    "Take photos (before condition)",
    "Prepare method statement & schedule",
    "Submit materials (paint, repair materials) for approval",
    "Risk assessment (RA) + Safe Work Procedure (SWP)",
    "Apply permits (work at height, road closure if needed)",
  ],
  SITE_SETUP_PROTECTION: [
    "Install safety barricade / warning sign",
    "Cover floor, walls, windows, lift lobby",
    "Setup scaffold / gondola / boom lift",
    "Toolbox meeting for workers",
  ],
  SURFACE_PREPARATION: [
    "Hack loose plaster / hollow areas",
    "Crack repair (V-cut + filler)",
    "Remove peeling paint (scraping / grinding)",
    "Pressure wash / clean surface",
    "Apply anti-fungal wash (if needed)",
  ],
  REPAIR_WORKS: [
    "Plastering / patch repair",
    "Spalling concrete repair (rebar treatment if needed)",
    "Skim coat / leveling",
    "Seal joints (sealant works)",
  ],
  PAINTING_SYSTEM_APPLICATION: [
    "Apply 1 coat primer / sealer",
    "Apply 2 coats finishing paint",
    "External: weatherproof / elastomeric coating",
    "Internal: emulsion / low VOC paint",
    "Confirm approved brand used (e.g. Jotun or Nippon Paint)",
  ],
  INSPECTION_TOUCH_UP: [
    "Check uneven color / patchiness",
    "Rectify defects",
    "Joint inspection with consultant / TC officer",
  ],
  CLEANING_DISMANTLING: [
    "Remove protection sheets",
    "Dismantle scaffold / equipment",
    "Clean all affected areas",
    "Dispose debris properly",
  ],
  HANDOVER_DOCUMENTATION: [
    "Final inspection & approval",
    "Submit completion report",
    "Submit warranty (usually 1-3 years)",
    "Submit before & after photos",
    "Handover to client (TC / MCST / Owner)",
  ],
};

/** Optional callout shown alongside a stage's checklist — a notable
 * domain tip, not a checklist item itself. */
export const SITE_STAGE_TIPS: Partial<Record<SiteStage, string>> = {
  PRE_START_PLANNING: "For Town Council / HDB, approvals are very important before start.",
  SURFACE_PREPARATION: "70% of the final quality depends on this stage.",
  PAINTING_SYSTEM_APPLICATION: "Follow the approved brand.",
};

/** The last stage that can be self-advanced without Admin approval — the
 * transition out of this stage (into HANDOVER_DOCUMENTATION) is the one
 * real checkpoint, gated by the Approval Engine's PROJECT_STAGE_GATE module. */
export const LAST_SELF_ADVANCE_STAGE: SiteStage = SiteStage.CLEANING_DISMANTLING;

export function nextSiteStage(current: SiteStage): SiteStage | null {
  const idx = SITE_STAGE_ORDER.indexOf(current);
  if (idx === -1 || idx === SITE_STAGE_ORDER.length - 1) return null;
  return SITE_STAGE_ORDER[idx + 1];
}

export function isFinalSiteStage(stage: SiteStage): boolean {
  return stage === SITE_STAGE_ORDER[SITE_STAGE_ORDER.length - 1];
}

export const SiteStageHistoryTrigger = {
  SELF_ADVANCE: "SELF_ADVANCE",
  HANDOVER_SUBMITTED: "HANDOVER_SUBMITTED",
  HANDOVER_APPROVED: "HANDOVER_APPROVED",
  HANDOVER_REJECTED: "HANDOVER_REJECTED",
} as const;
export type SiteStageHistoryTrigger =
  (typeof SiteStageHistoryTrigger)[keyof typeof SiteStageHistoryTrigger];

export const ResourceRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type ResourceRequestStatus =
  (typeof ResourceRequestStatus)[keyof typeof ResourceRequestStatus];

export const RESOURCE_REQUEST_STATUS_LABELS: Record<ResourceRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  DONE: "DONE",
  CANCELLED: "CANCELLED",
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
  CANCELLED: "Cancelled",
};
