import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";

const MAX_HIERARCHY_DEPTH = 100;

/**
 * Walks the employee reporting-manager ancestor chain from `startId`,
 * bounded to MAX_HIERARCHY_DEPTH so a data-integrity issue can never spin
 * into an infinite loop.
 */
/** Walks the ancestor (reporting-manager) chain from `startId` upward and
 * returns whether `ancestorCandidateId` is encountered anywhere in it. */
async function ancestorChainIncludes(
  startId: string,
  ancestorCandidateId: string
): Promise<boolean> {
  let currentId: string | null = startId;
  for (let depth = 0; depth < MAX_HIERARCHY_DEPTH && currentId; depth++) {
    if (currentId === ancestorCandidateId) return true;
    const current: { reportingManagerId: string | null } | null =
      await db.employee.findUnique({
        where: { id: currentId },
        select: { reportingManagerId: true },
      });
    currentId = current?.reportingManagerId ?? null;
  }
  return false;
}

/**
 * Throws if setting `employeeId`'s reporting manager to `candidateManagerId`
 * would create a cycle (including the trivial self-report case) — walks the
 * candidate's own ancestor chain looking for `employeeId`.
 */
export async function assertNoReportingCycle(
  employeeId: string,
  candidateManagerId: string | null
): Promise<void> {
  if (!candidateManagerId) return;
  if (candidateManagerId === employeeId) {
    throw new AppError(ErrorCode.EMPLOYEE_REPORTING_CYCLE);
  }
  const createsCycle = await ancestorChainIncludes(candidateManagerId, employeeId);
  if (createsCycle) {
    throw new AppError(ErrorCode.EMPLOYEE_REPORTING_CYCLE);
  }
}

async function departmentAncestorChainIncludes(
  startId: string,
  ancestorCandidateId: string
): Promise<boolean> {
  let currentId: string | null = startId;
  for (let depth = 0; depth < MAX_HIERARCHY_DEPTH && currentId; depth++) {
    if (currentId === ancestorCandidateId) return true;
    const current: { parentDepartmentId: string | null } | null =
      await db.department.findUnique({
        where: { id: currentId },
        select: { parentDepartmentId: true },
      });
    currentId = current?.parentDepartmentId ?? null;
  }
  return false;
}

export async function assertNoDepartmentCycle(
  departmentId: string,
  candidateParentId: string | null
): Promise<void> {
  if (!candidateParentId) return;
  if (candidateParentId === departmentId) {
    throw new AppError(ErrorCode.DEPARTMENT_CIRCULAR_HIERARCHY);
  }
  const createsCycle = await departmentAncestorChainIncludes(
    candidateParentId,
    departmentId
  );
  if (createsCycle) {
    throw new AppError(ErrorCode.DEPARTMENT_CIRCULAR_HIERARCHY);
  }
}

/** Direct reports of an employee (one level), safe fields only. */
export async function getDirectReports(employeeId: string) {
  return db.employee.findMany({
    where: { reportingManagerId: employeeId },
    select: {
      id: true,
      employeeNumber: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      employmentStatus: true,
      designation: { select: { name: true } },
    },
    orderBy: { firstName: "asc" },
  });
}

/** Whether `managerId` is an ancestor (at any depth) of `employeeId`. */
export async function isInReportingChain(
  employeeId: string,
  managerId: string
): Promise<boolean> {
  return ancestorChainIncludes(employeeId, managerId);
}
