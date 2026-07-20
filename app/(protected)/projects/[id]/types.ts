import type { ProjectStatus, SiteStage } from "@/lib/projects/constants";

/** Plain, RSC-serializable view types for the project workspace — Prisma
 * Decimal fields are converted to `number` and Dates to ISO strings in
 * app/(protected)/projects/[id]/page.tsx before being passed to client
 * components. */

export type SiteView = {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  currentStage: SiteStage;
  currentStageStartedAt: string;
  handoverApprovalRequestId: string | null;
};

export type ProjectView = {
  id: string;
  code: string;
  name: string;
  clientName: string | null;
  description: string | null;
  address: string | null;
  estimatedBudget: number | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  sites: SiteView[];
};

export type AssignmentView = {
  id: string;
  employee: { id: string; firstName: string; lastName: string | null; preferredName: string | null };
  site: { id: string; code: string; name: string } | null;
  projectRole: { id: string; code: string; name: string } | null;
  allocationPercentage: number;
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  status: string;
  notes: string | null;
};

export type ResourceRequestView = {
  id: string;
  site: { id: string; code: string; name: string } | null;
  itemDescription: string;
  quantity: number;
  unit: string;
  neededByDate: string | null;
  notes: string | null;
  status: string;
  requestedByUserId: string;
  createdAt: string;
};

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assignee: { id: string; firstName: string; lastName: string | null; preferredName: string | null };
  site: { id: string; code: string; name: string } | null;
  dueDate: string | null;
  createdAt: string;
};

export type SiteApprovalInfo = {
  id: string;
  status: string;
  reason: string | null;
  decisionNotes: string | null;
} | null;

export type SiteApprovalMap = Record<string, SiteApprovalInfo>;

export type ChecklistItemView = {
  index: number;
  label: string;
  isChecked: boolean;
};

/** Checklist for each site's *current* stage only — past/future stages
 * aren't fetched since the stepper only ever lets the current row expand. */
export type SiteChecklistMap = Record<string, ChecklistItemView[]>;
