import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/authorization/roles";
import { ErrorCode } from "@/lib/errors";
import { ProjectStatus, SITE_STAGE_ORDER, SITE_STAGE_CHECKLISTS, type SiteStage } from "@/lib/projects/constants";
import { createEmployee } from "@/lib/services/employee-service";
import { createAssignment, listAssignmentsForProject } from "@/lib/services/employee-allocation-service";
import { advanceSiteStage } from "@/lib/services/site-stage-service";
import { setChecklistItem } from "@/lib/services/site-stage-checklist-service";
import { createProject, activateProject, closeProject } from "@/lib/services/project-service";
import {
  createResourceRequest,
  cancelResourceRequest,
} from "@/lib/services/project-resource-request-service";
import { decideApprovalStep } from "@/lib/services/approval-service";
import { createActor, cleanupUserIds } from "@/tests/helpers/actors";
import {
  buildCreateEmployeeInput,
  createdEmployeeIds,
  createdProjectIds,
  createTestProject,
  createTestSite,
  createTestMaterial,
  getTestWarehouseId,
  cleanupHrFixtures,
} from "@/tests/helpers/hr-fixtures";
import type { AuthenticatedUser } from "@/types/auth";

const createdUserIds: string[] = [];

async function trackedActor(role: UserRole, label: string): Promise<AuthenticatedUser> {
  const actor = await createActor(role, label);
  createdUserIds.push(actor.id);
  return actor;
}

async function createLinkedEmployee(
  actorRole: UserRole,
  label: string,
  overrides: Parameters<typeof buildCreateEmployeeInput>[0] = {}
) {
  const actor = await trackedActor(actorRole, label);
  const employee = await createEmployee(actor, await buildCreateEmployeeInput(overrides));
  createdEmployeeIds.push(employee.id);
  await db.employee.update({ where: { id: employee.id }, data: { userId: actor.id } });
  return { actor, employee };
}

function yesterdayIso(): string {
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

async function completeChecklist(actor: AuthenticatedUser, siteId: string, stage: SiteStage) {
  const items = SITE_STAGE_CHECKLISTS[stage] ?? [];
  for (let itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
    await setChecklistItem(actor, { siteId, stage, itemIndex, isChecked: true });
  }
}

async function assignActiveToSite(
  allocator: AuthenticatedUser,
  employeeId: string,
  projectId: string,
  siteId: string
) {
  return createAssignment(allocator, {
    employeeId,
    projectId,
    siteId,
    allocationPercentage: 100,
    startDate: yesterdayIso(),
    isPrimary: true,
  });
}

describe("project-management (integration)", () => {
  afterAll(async () => {
    await cleanupHrFixtures();
    await cleanupUserIds(createdUserIds);
  });

  it("self-advances a site through all 7 pre-handover stages for an assigned employee", async () => {
    const project = await createTestProject("pm-happy-path");
    const site = await createTestSite(project.id);
    const { actor, employee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "pm-worker-1");
    const allocator = await trackedActor(UserRole.ADMIN, "pm-allocator-1");
    await assignActiveToSite(allocator, employee.id, project.id, site.id);

    let current = site;
    for (let i = 0; i < SITE_STAGE_ORDER.length - 2; i += 1) {
      await completeChecklist(actor, site.id, SITE_STAGE_ORDER[i]);
      current = await advanceSiteStage(actor, { siteId: site.id });
      expect(current.currentStage).toBe(SITE_STAGE_ORDER[i + 1]);
    }
    expect(current.currentStage).toBe("CLEANING_DISMANTLING");
  });

  it("rejects a stage advance from an employee not assigned to that site", async () => {
    const project = await createTestProject("pm-unassigned");
    const site = await createTestSite(project.id);
    const { actor } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "pm-worker-2");

    await expect(advanceSiteStage(actor, { siteId: site.id })).rejects.toMatchObject({
      code: ErrorCode.SITE_STAGE_NOT_AUTHORIZED,
    });
  });

  it("rejects advancing an already-complete site", async () => {
    const project = await createTestProject("pm-already-complete");
    const site = await createTestSite(project.id, { currentStage: "HANDOVER_DOCUMENTATION" });
    const adminActor = await trackedActor(UserRole.ADMIN, "pm-admin-1");

    await expect(advanceSiteStage(adminActor, { siteId: site.id })).rejects.toMatchObject({
      code: ErrorCode.SITE_STAGE_ALREADY_COMPLETE,
    });
  });

  it("blocks every stage transition while the project is not ACTIVE", async () => {
    const draftCreator = await trackedActor(UserRole.ADMIN, "pm-draft-creator");
    const draftProject = await createProject(draftCreator, {
      code: `VITEST-DRAFT-${Math.random().toString(36).slice(2, 8)}`,
      name: "Draft project",
    });
    createdProjectIds.push(draftProject.id);
    const site = await createTestSite(draftProject.id);
    const adminActor = await trackedActor(UserRole.ADMIN, "pm-admin-2");

    await expect(advanceSiteStage(adminActor, { siteId: site.id })).rejects.toMatchObject({
      code: ErrorCode.PROJECT_NOT_ACTIVE,
    });
  });

  it("routes the 7->8 handover transition through Admin approval, and resubmits after rejection", async () => {
    const project = await createTestProject("pm-handover");
    const site = await createTestSite(project.id, { currentStage: "CLEANING_DISMANTLING" });
    const { actor, employee } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "pm-worker-3");
    const allocator = await trackedActor(UserRole.ADMIN, "pm-allocator-2");
    await assignActiveToSite(allocator, employee.id, project.id, site.id);
    await completeChecklist(actor, site.id, "CLEANING_DISMANTLING");

    const submitted = await advanceSiteStage(actor, { siteId: site.id, notes: "Ready for handover" });
    expect(submitted.currentStage).toBe("CLEANING_DISMANTLING");
    expect(submitted.handoverApprovalRequestId).not.toBeNull();

    // Duplicate submission while pending is rejected.
    await expect(advanceSiteStage(actor, { siteId: site.id })).rejects.toMatchObject({
      code: ErrorCode.SITE_STAGE_HANDOVER_ALREADY_PENDING,
    });

    // Reject first: stage stays put, resubmission is allowed afterwards.
    const adminActor1 = await trackedActor(UserRole.ADMIN, "pm-admin-3");
    await decideApprovalStep(adminActor1, {
      approvalRequestId: submitted.handoverApprovalRequestId!,
      stepOrder: 1,
      decision: "REJECTED",
    });
    const afterRejection = await db.site.findUniqueOrThrow({ where: { id: site.id } });
    expect(afterRejection.currentStage).toBe("CLEANING_DISMANTLING");

    const resubmitted = await advanceSiteStage(actor, { siteId: site.id });
    expect(resubmitted.handoverApprovalRequestId).not.toBe(submitted.handoverApprovalRequestId);

    const adminActor2 = await trackedActor(UserRole.ADMIN, "pm-admin-4");
    await decideApprovalStep(adminActor2, {
      approvalRequestId: resubmitted.handoverApprovalRequestId!,
      stepOrder: 1,
      decision: "APPROVED",
    });
    const afterApproval = await db.site.findUniqueOrThrow({ where: { id: site.id } });
    expect(afterApproval.currentStage).toBe("HANDOVER_DOCUMENTATION");
  });

  it("resource requests route to Admin approval and support cancel by requester or manager", async () => {
    const project = await createTestProject("pm-resource");
    const { actor: managerActor, employee: managerEmployee } = await createLinkedEmployee(UserRole.MANAGER, "pm-manager-1");
    const allocator = await trackedActor(UserRole.ADMIN, "pm-allocator-resource");
    await createAssignment(allocator, {
      employeeId: managerEmployee.id,
      projectId: project.id,
      allocationPercentage: 100,
      startDate: yesterdayIso(),
      isPrimary: true,
    });

    const primer = await createTestMaterial();
    const request = await createResourceRequest(managerActor, {
      projectId: project.id,
      materialId: primer.id,
      quantity: 20,
    });
    expect(request.status).toBe("PENDING");
    expect(request.approvalRequestId).not.toBeNull();

    const steps = await db.approvalStep.findMany({ where: { approvalRequestId: request.approvalRequestId! } });
    expect(steps).toHaveLength(1);
    expect(steps[0].approverRole).toBe(UserRole.ADMIN);

    const adminActor1 = await trackedActor(UserRole.ADMIN, "pm-admin-5");
    await decideApprovalStep(adminActor1, {
      approvalRequestId: request.approvalRequestId!,
      stepOrder: 1,
      decision: "APPROVED",
    });
    const approved = await db.projectResourceRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(approved.status).toBe("APPROVED");

    // Approval issues stock — starting balance 1000, minus the 20 requested.
    const testWarehouseId = await getTestWarehouseId();
    const stockAfterApproval = await db.stockLevel.findUniqueOrThrow({
      where: { materialId_warehouseId: { materialId: primer.id, warehouseId: testWarehouseId } },
    });
    expect(stockAfterApproval.quantityOnHand.toNumber()).toBe(980);

    // A second, still-pending request: reject it instead.
    const planks = await createTestMaterial({ unit: "pcs" });
    const secondRequest = await createResourceRequest(managerActor, {
      projectId: project.id,
      materialId: planks.id,
      quantity: 10,
    });
    const adminActor2 = await trackedActor(UserRole.ADMIN, "pm-admin-6");
    await decideApprovalStep(adminActor2, {
      approvalRequestId: secondRequest.approvalRequestId!,
      stepOrder: 1,
      decision: "REJECTED",
    });
    const rejected = await db.projectResourceRequest.findUniqueOrThrow({ where: { id: secondRequest.id } });
    expect(rejected.status).toBe("REJECTED");
    // Rejection never issues stock.
    const stockAfterRejection = await db.stockLevel.findUniqueOrThrow({
      where: { materialId_warehouseId: { materialId: planks.id, warehouseId: testWarehouseId } },
    });
    expect(stockAfterRejection.quantityOnHand.toNumber()).toBe(1000);

    // A third, pending request: the requester can cancel it themselves.
    const tape = await createTestMaterial({ unit: "rolls" });
    const thirdRequest = await createResourceRequest(managerActor, {
      projectId: project.id,
      materialId: tape.id,
      quantity: 50,
    });
    const cancelled = await cancelResourceRequest(managerActor, thirdRequest.id);
    expect(cancelled.status).toBe("CANCELLED");

    // A fourth, pending request: an unrelated actor without the permission cannot cancel.
    const solvent = await createTestMaterial();
    const fourthRequest = await createResourceRequest(managerActor, {
      projectId: project.id,
      materialId: solvent.id,
      quantity: 5,
    });
    const { actor: outsiderActor } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "pm-outsider-1");
    await expect(cancelResourceRequest(outsiderActor, fourthRequest.id)).rejects.toMatchObject({
      code: ErrorCode.AUTH_PERMISSION_DENIED,
    });
  });

  it("lists assignments scoped to a project", async () => {
    const project = await createTestProject("pm-team-scope");
    const otherProject = await createTestProject("pm-team-scope-other");
    const site = await createTestSite(project.id);
    const otherSite = await createTestSite(otherProject.id);
    const { employee: inScope } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "pm-scope-in");
    const { employee: outOfScope } = await createLinkedEmployee(UserRole.TEAM_MEMBER, "pm-scope-out");
    const allocator = await trackedActor(UserRole.ADMIN, "pm-allocator-3");

    await assignActiveToSite(allocator, inScope.id, project.id, site.id);
    await assignActiveToSite(allocator, outOfScope.id, otherProject.id, otherSite.id);

    const assignments = await listAssignmentsForProject(project.id);
    expect(assignments).toHaveLength(1);
    expect(assignments[0].employee.id).toBe(inScope.id);
  });

  it("project lifecycle: DRAFT -> ACTIVE -> CLOSED, rejecting invalid transitions", async () => {
    const adminActor = await trackedActor(UserRole.ADMIN, "pm-lifecycle-admin");

    const project = await createProject(adminActor, {
      code: `VITEST-LC-${Math.random().toString(36).slice(2, 8)}`,
      name: "Lifecycle project",
    });
    createdProjectIds.push(project.id);
    expect(project.status).toBe(ProjectStatus.DRAFT);

    const activated = await activateProject(adminActor, project.id);
    expect(activated.status).toBe(ProjectStatus.ACTIVE);

    const closed = await closeProject(adminActor, project.id, { id: project.id });
    expect(closed.status).toBe(ProjectStatus.CLOSED);
    expect(closed.closedAt).not.toBeNull();

    await expect(activateProject(adminActor, project.id)).rejects.toMatchObject({
      code: ErrorCode.PROJECT_INVALID_STATUS_TRANSITION,
    });
  });
});
