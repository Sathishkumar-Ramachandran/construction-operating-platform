import { db } from "@/lib/db";
import { RUN_ID } from "@/tests/helpers/actors";
import type { CreateEmployeeInput } from "@/lib/validation/employees";

export const createdDepartmentIds: string[] = [];
export const createdDesignationIds: string[] = [];
export const createdEmploymentTypeIds: string[] = [];
export const createdEmployeeIds: string[] = [];
export const createdProjectIds: string[] = [];
export const createdLeaveTypeIds: string[] = [];
export const createdMaterialIds: string[] = [];

let sharedMasterDataPromise: Promise<{
  departmentId: string;
  designationId: string;
  employmentTypeId: string;
}> | null = null;

/** Creates (once, memoized) a minimal, RUN_ID-tagged set of HR master data
 * rows shared across integration tests in this run. */
export async function getSharedMasterData() {
  if (!sharedMasterDataPromise) {
    sharedMasterDataPromise = (async () => {
      const department = await db.department.create({
        data: { code: `VITEST-DEPT-${RUN_ID}`, name: `Vitest Department ${RUN_ID}` },
      });
      createdDepartmentIds.push(department.id);

      const designation = await db.designation.create({
        data: { code: `VITEST-DESIG-${RUN_ID}`, name: `Vitest Designation ${RUN_ID}` },
      });
      createdDesignationIds.push(designation.id);

      const employmentType = await db.employmentType.create({
        data: { code: `VITEST_TYPE_${RUN_ID.replace(/-/g, "_")}`, name: `Vitest Type ${RUN_ID}` },
      });
      createdEmploymentTypeIds.push(employmentType.id);

      return {
        departmentId: department.id,
        designationId: designation.id,
        employmentTypeId: employmentType.id,
      };
    })();
  }
  return sharedMasterDataPromise;
}

export async function buildCreateEmployeeInput(
  overrides: Partial<CreateEmployeeInput> = {}
): Promise<CreateEmployeeInput> {
  const { departmentId, designationId, employmentTypeId } = await getSharedMasterData();
  const suffix = Math.random().toString(36).slice(2, 8);
  return {
    firstName: "Vitest",
    lastName: `Employee-${suffix}`,
    joiningDate: "2026-01-01",
    departmentId,
    designationId,
    employmentTypeId,
    ...overrides,
  };
}

export async function createTestLeaveType(
  overrides: { defaultEntitlementDays?: number; isPaid?: boolean } = {}
) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const leaveType = await db.leaveType.create({
    data: {
      code: `VITEST_LEAVE_${suffix.toUpperCase()}`,
      name: `Vitest Leave ${suffix}`,
      defaultEntitlementDays: overrides.defaultEntitlementDays ?? 14,
      isPaid: overrides.isPaid ?? true,
    },
  });
  createdLeaveTypeIds.push(leaveType.id);
  return leaveType;
}

export async function createTestProject(name: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const project = await db.project.create({
    data: { code: `VITEST-PRJ-${suffix}`, name: `${name} ${suffix}`, status: "ACTIVE" },
  });
  createdProjectIds.push(project.id);
  return project;
}

export async function createTestSite(
  projectId: string,
  overrides: { name?: string; currentStage?: string } = {}
) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return db.site.create({
    data: {
      projectId,
      code: `VITEST-SITE-${suffix}`,
      name: overrides.name ?? `Vitest Site ${suffix}`,
      currentStage: overrides.currentStage ?? "PRE_START_PLANNING",
    },
  });
}

export async function createTestTask(
  projectId: string,
  assignedToEmployeeId: string,
  overrides: { siteId?: string; title?: string; status?: string } = {}
) {
  const suffix = Math.random().toString(36).slice(2, 8);
  return db.task.create({
    data: {
      projectId,
      siteId: overrides.siteId ?? null,
      title: overrides.title ?? `Vitest Task ${suffix}`,
      assignedToEmployeeId,
      status: overrides.status ?? "TODO",
      createdBy: assignedToEmployeeId,
    },
  });
}

export async function createTestMaterial(overrides: { unit?: string; quantityOnHand?: number } = {}) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const material = await db.material.create({
    data: {
      code: `VITEST-MAT-${suffix}`,
      name: `Vitest Material ${suffix}`,
      unit: overrides.unit ?? "litres",
    },
  });
  createdMaterialIds.push(material.id);
  await db.stockLevel.create({
    data: { materialId: material.id, quantityOnHand: overrides.quantityOnHand ?? 1000 },
  });
  return material;
}

export async function cleanupHrFixtures() {
  if (createdProjectIds.length > 0) {
    await db.employeeProjectAssignment.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    // Must run before site.deleteMany below — ProjectResourceRequest.siteId
    // and Task.siteId have no cascade, so a surviving row pointing at a site
    // would block that site's delete otherwise (their projectId FKs do
    // cascade, but only once the Project row itself is deleted, which is
    // ordered last here). Also must run before material cleanup below, for
    // the same reason (ProjectResourceRequest.materialId has no cascade).
    await db.projectResourceRequest.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await db.task.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await db.siteStageHistory.deleteMany({ where: { site: { projectId: { in: createdProjectIds } } } });
    await db.site.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await db.project.deleteMany({ where: { id: { in: createdProjectIds } } });
  }
  if (createdMaterialIds.length > 0) {
    await db.stockTransaction.deleteMany({ where: { materialId: { in: createdMaterialIds } } });
    await db.stockLevel.deleteMany({ where: { materialId: { in: createdMaterialIds } } });
    await db.material.deleteMany({ where: { id: { in: createdMaterialIds } } });
  }
  if (createdEmployeeIds.length > 0) {
    await db.employeeAvailabilityOverride.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
    await db.employeeProjectAssignment.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
    await db.employeeStatusHistory.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
    await db.emergencyContact.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
    await db.employeeBankAccount.deleteMany({ where: { employeeId: { in: createdEmployeeIds } } });
    await db.auditLog.deleteMany({ where: { entityId: { in: createdEmployeeIds } } });
    await db.employee.deleteMany({ where: { id: { in: createdEmployeeIds } } });
  }
  if (createdDesignationIds.length > 0) {
    await db.designation.deleteMany({ where: { id: { in: createdDesignationIds } } });
  }
  if (createdDepartmentIds.length > 0) {
    await db.department.deleteMany({ where: { id: { in: createdDepartmentIds } } });
  }
  if (createdEmploymentTypeIds.length > 0) {
    await db.employmentType.deleteMany({ where: { id: { in: createdEmploymentTypeIds } } });
  }
  // Must run after employee deletion above — LeaveBalance/LeaveRequest rows
  // cascade-delete with their Employee, but hold a Restrict-by-default FK to
  // LeaveType, so any surviving one would block this delete otherwise.
  if (createdLeaveTypeIds.length > 0) {
    await db.leaveType.deleteMany({ where: { id: { in: createdLeaveTypeIds } } });
  }
}
