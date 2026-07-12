import { db } from "@/lib/db";
import { RUN_ID } from "@/tests/helpers/actors";
import type { CreateEmployeeInput } from "@/lib/validation/employees";

export const createdDepartmentIds: string[] = [];
export const createdDesignationIds: string[] = [];
export const createdEmploymentTypeIds: string[] = [];
export const createdEmployeeIds: string[] = [];
export const createdProjectIds: string[] = [];

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

export async function createTestProject(name: string) {
  const suffix = Math.random().toString(36).slice(2, 8);
  const project = await db.project.create({
    data: { code: `VITEST-PRJ-${suffix}`, name: `${name} ${suffix}`, status: "ACTIVE" },
  });
  createdProjectIds.push(project.id);
  return project;
}

export async function cleanupHrFixtures() {
  if (createdProjectIds.length > 0) {
    await db.employeeProjectAssignment.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await db.site.deleteMany({ where: { projectId: { in: createdProjectIds } } });
    await db.project.deleteMany({ where: { id: { in: createdProjectIds } } });
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
}
