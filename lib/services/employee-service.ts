import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { UserRole } from "@/lib/authorization/roles";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { allocateNextEmployeeNumber } from "@/lib/services/employee-number-service";
import { assertNoReportingCycle, isInReportingChain } from "@/lib/services/org-hierarchy-service";
import { encryptField, decryptField, lastCharacters } from "@/lib/security/encryption";
import { EmploymentStatus } from "@/lib/hr/constants";
export { employeeDisplayName } from "@/lib/hr/employee-display";
import type {
  CreateEmployeeInput,
  UpdateEmployeeInput,
  ListEmployeesQuery,
} from "@/lib/validation/employees";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export type EmployeeAccessLevel = "NONE" | "DIRECTORY" | "MANAGER" | "SENSITIVE";

const DIRECTORY_SELECT = {
  id: true,
  employeeNumber: true,
  firstName: true,
  middleName: true,
  lastName: true,
  preferredName: true,
  employmentStatus: true,
  joiningDate: true,
  department: { select: { id: true, name: true } },
  designation: { select: { id: true, name: true } },
  reportingManager: { select: { id: true, firstName: true, lastName: true } },
  userId: true,
} satisfies Prisma.EmployeeSelect;

const MANAGER_EXTRA_SELECT = {
  workEmail: true,
  mobileNumber: true,
  alternateMobileNumber: true,
  grade: { select: { id: true, name: true } },
  employmentType: { select: { id: true, name: true } },
  defaultShift: { select: { id: true, name: true } },
} satisfies Prisma.EmployeeSelect;

const SENSITIVE_EXTRA_SELECT = {
  personalEmail: true,
  dateOfBirth: true,
  gender: true,
  nationalityCode: true,
  maritalStatus: true,
  nationalIdLast4: true,
  passportLast4: true,
  confirmationDate: true,
  terminationDate: true,
  lastWorkingDate: true,
  createdAt: true,
  updatedAt: true,
  version: true,
} satisfies Prisma.EmployeeSelect;

/** Determines what the actor may see about a given employee. Resolved on
 * the server for every read — never trust a client-supplied access level. */
export async function resolveEmployeeAccess(
  actor: AuthenticatedUser,
  targetEmployeeId: string,
  actorEmployeeId: string | null
): Promise<EmployeeAccessLevel> {
  if (actor.role === UserRole.SUPER_ADMIN) return "SENSITIVE";

  const isSelf = actorEmployeeId === targetEmployeeId;
  const hasSensitive = await hasPermission(
    actor,
    PERMISSIONS.HR_EMPLOYEE_VIEW_SENSITIVE.code
  );
  if (isSelf || hasSensitive) return "SENSITIVE";

  const hasGeneralView = await hasPermission(actor, PERMISSIONS.HR_EMPLOYEE_VIEW.code);
  if (!hasGeneralView) return "NONE";

  if (actor.role === UserRole.MANAGER) {
    if (!actorEmployeeId) return "NONE";
    const managesTarget = await isInReportingChain(targetEmployeeId, actorEmployeeId);
    return managesTarget ? "MANAGER" : "NONE";
  }

  return "MANAGER";
}

function selectForAccess(access: EmployeeAccessLevel): Prisma.EmployeeSelect {
  if (access === "SENSITIVE") {
    return { ...DIRECTORY_SELECT, ...MANAGER_EXTRA_SELECT, ...SENSITIVE_EXTRA_SELECT };
  }
  if (access === "MANAGER") {
    return { ...DIRECTORY_SELECT, ...MANAGER_EXTRA_SELECT };
  }
  return DIRECTORY_SELECT;
}

/** Resolves the caller's own linked employee id, if any. */
export async function getActorEmployeeId(userId: string): Promise<string | null> {
  const employee = await db.employee.findUnique({
    where: { userId },
    select: { id: true },
  });
  return employee?.id ?? null;
}

export async function getEmployeeById(actor: AuthenticatedUser, id: string) {
  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const access = await resolveEmployeeAccess(actor, id, actorEmployeeId);
  if (access === "NONE") throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const employee = await db.employee.findUnique({
    where: { id },
    select: selectForAccess(access),
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  return { employee, access };
}

export async function listEmployees(
  actor: AuthenticatedUser,
  query: ListEmployeesQuery
) {
  const actorEmployeeId = await getActorEmployeeId(actor.id);

  const where: Prisma.EmployeeWhereInput = {
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { preferredName: { contains: query.search, mode: "insensitive" } },
            { employeeNumber: { contains: query.search, mode: "insensitive" } },
            { workEmail: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(query.departmentId ? { departmentId: query.departmentId } : {}),
    ...(query.designationId ? { designationId: query.designationId } : {}),
    ...(query.employmentStatus ? { employmentStatus: query.employmentStatus } : {}),
  };

  if (actor.role === UserRole.MANAGER && actorEmployeeId) {
    // Scoped to the manager's reporting chain: direct + indirect reports.
    const reportIds = await getAllReportIds(actorEmployeeId);
    where.id = { in: reportIds };
  }

  const [total, employees] = await Promise.all([
    db.employee.count({ where }),
    db.employee.findMany({
      where,
      select: DIRECTORY_SELECT,
      orderBy: { firstName: "asc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return { employees, total, page: query.page, pageSize: query.pageSize };
}

async function getAllReportIds(managerId: string): Promise<string[]> {
  const ids: string[] = [];
  let frontier = [managerId];
  for (let depth = 0; depth < 20 && frontier.length > 0; depth++) {
    const directReports = await db.employee.findMany({
      where: { reportingManagerId: { in: frontier } },
      select: { id: true },
    });
    const nextIds = directReports.map((r) => r.id);
    ids.push(...nextIds);
    frontier = nextIds;
  }
  return ids;
}

function toDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createEmployee(
  actor: AuthenticatedUser,
  input: CreateEmployeeInput,
  meta: ActorMeta = {}
) {
  const workEmail = input.workEmail ? input.workEmail.trim().toLowerCase() : null;
  if (workEmail) {
    const existing = await db.employee.findUnique({
      where: { workEmail },
      select: { id: true },
    });
    if (existing) throw new AppError(ErrorCode.EMPLOYEE_WORK_EMAIL_ALREADY_EXISTS);
  }

  if (input.reportingManagerId) {
    const manager = await db.employee.findUnique({
      where: { id: input.reportingManagerId },
      select: { id: true },
    });
    if (!manager) throw new AppError(ErrorCode.VALIDATION_ERROR, "Reporting manager not found.");
  }

  const nationalId = input.nationalId?.trim() || null;
  const passportNumber = input.passportNumber?.trim() || null;

  const employee = await db.$transaction(async (tx) => {
    const employeeNumber = await allocateNextEmployeeNumber(tx);

    const created = await tx.employee.create({
      data: {
        employeeNumber,
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        preferredName: input.preferredName?.trim() || null,
        dateOfBirth: toDate(input.dateOfBirth),
        gender: input.gender || null,
        nationalityCode: input.nationalityCode || null,
        maritalStatus: input.maritalStatus || null,
        nationalIdCiphertext: nationalId ? encryptField(nationalId) : null,
        nationalIdLast4: nationalId ? lastCharacters(nationalId) : null,
        passportCiphertext: passportNumber ? encryptField(passportNumber) : null,
        passportLast4: passportNumber ? lastCharacters(passportNumber) : null,
        personalEmail: input.personalEmail || null,
        workEmail,
        mobileNumber: input.mobileNumber || null,
        alternateMobileNumber: input.alternateMobileNumber || null,
        joiningDate: toDate(input.joiningDate) ?? new Date(),
        employmentStatus: EmploymentStatus.DRAFT,
        departmentId: input.departmentId,
        designationId: input.designationId,
        gradeId: input.gradeId || null,
        employmentTypeId: input.employmentTypeId,
        reportingManagerId: input.reportingManagerId || null,
        defaultShiftTypeId: input.defaultShiftTypeId || null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
      select: DIRECTORY_SELECT,
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.EMPLOYEE_CREATED,
      entityType: "Employee",
      entityId: created.id,
      afterData: { employeeNumber: created.employeeNumber },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return employee;
}

export async function updateEmployee(
  actor: AuthenticatedUser,
  input: UpdateEmployeeInput,
  meta: ActorMeta = {}
) {
  const existing = await db.employee.findUnique({
    where: { id: input.id },
    select: { id: true, version: true, workEmail: true, reportingManagerId: true },
  });
  if (!existing) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const workEmail = input.workEmail ? input.workEmail.trim().toLowerCase() : null;
  if (workEmail && workEmail !== existing.workEmail) {
    const conflict = await db.employee.findUnique({
      where: { workEmail },
      select: { id: true },
    });
    if (conflict) throw new AppError(ErrorCode.EMPLOYEE_WORK_EMAIL_ALREADY_EXISTS);
  }

  if (
    input.reportingManagerId &&
    input.reportingManagerId !== existing.reportingManagerId
  ) {
    await assertNoReportingCycle(input.id, input.reportingManagerId);
  }

  // Editors without sensitive-field access (e.g. ADMIN editing employment
  // info but lacking HR.EMPLOYEE.VIEW_SENSITIVE) never had these fields in
  // their form to begin with — never let a blank/omitted client value wipe
  // out personal data they simply couldn't see.
  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const access = await resolveEmployeeAccess(actor, input.id, actorEmployeeId);
  const canEditSensitive = access === "SENSITIVE";

  const nationalId = input.nationalId?.trim() || null;
  const passportNumber = input.passportNumber?.trim() || null;

  const updated = await db.$transaction(async (tx) => {
    const result = await tx.employee.updateMany({
      where: { id: input.id, version: input.version },
      data: {
        firstName: input.firstName.trim(),
        middleName: input.middleName?.trim() || null,
        lastName: input.lastName?.trim() || null,
        preferredName: input.preferredName?.trim() || null,
        ...(canEditSensitive
          ? {
              dateOfBirth: toDate(input.dateOfBirth),
              gender: input.gender || null,
              nationalityCode: input.nationalityCode || null,
              maritalStatus: input.maritalStatus || null,
              personalEmail: input.personalEmail || null,
            }
          : {}),
        ...(canEditSensitive && nationalId
          ? { nationalIdCiphertext: encryptField(nationalId), nationalIdLast4: lastCharacters(nationalId) }
          : {}),
        ...(canEditSensitive && passportNumber
          ? { passportCiphertext: encryptField(passportNumber), passportLast4: lastCharacters(passportNumber) }
          : {}),
        workEmail,
        mobileNumber: input.mobileNumber || null,
        alternateMobileNumber: input.alternateMobileNumber || null,
        joiningDate: toDate(input.joiningDate) ?? undefined,
        departmentId: input.departmentId,
        designationId: input.designationId,
        gradeId: input.gradeId || null,
        employmentTypeId: input.employmentTypeId,
        reportingManagerId: input.reportingManagerId || null,
        defaultShiftTypeId: input.defaultShiftTypeId || null,
        updatedBy: actor.id,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) {
      throw new AppError(
        ErrorCode.CONFLICT_ERROR,
        "This employee record was changed by someone else. Refresh and try again."
      );
    }

    const employee = await tx.employee.findUniqueOrThrow({
      where: { id: input.id },
      select: DIRECTORY_SELECT,
    });

    if (
      input.reportingManagerId &&
      input.reportingManagerId !== existing.reportingManagerId
    ) {
      await recordAuditLog(tx, {
        userId: actor.id,
        action: AuditAction.EMPLOYEE_REPORTING_MANAGER_CHANGED,
        entityType: "Employee",
        entityId: employee.id,
        beforeData: { reportingManagerId: existing.reportingManagerId },
        afterData: { reportingManagerId: input.reportingManagerId },
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.EMPLOYEE_UPDATED,
      entityType: "Employee",
      entityId: employee.id,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return employee;
  });

  return updated;
}

export type RevealableField = "nationalId" | "passport";

/**
 * Decrypts and returns a single sensitive field, gated on
 * HR.EMPLOYEE.VIEW_SENSITIVE (or the employee viewing their own record).
 * Every call is audited; the decrypted value itself is never written to
 * the audit log.
 */
export async function revealSensitiveField(
  actor: AuthenticatedUser,
  employeeId: string,
  field: RevealableField,
  meta: ActorMeta = {}
): Promise<string> {
  const actorEmployeeId = await getActorEmployeeId(actor.id);
  const access = await resolveEmployeeAccess(actor, employeeId, actorEmployeeId);
  if (access !== "SENSITIVE") {
    throw new AppError(ErrorCode.AUTH_PERMISSION_DENIED);
  }

  const employee = await db.employee.findUnique({
    where: { id: employeeId },
    select: { nationalIdCiphertext: true, passportCiphertext: true },
  });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const ciphertext =
    field === "nationalId" ? employee.nationalIdCiphertext : employee.passportCiphertext;
  if (!ciphertext) return "";

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.EMPLOYEE_SENSITIVE_FIELD_VIEWED,
    entityType: "Employee",
    entityId: employeeId,
    metadata: { field },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return decryptField(ciphertext);
}

export function maskedBankAccount(accountNumberLast4: string) {
  return `${"•".repeat(8)}${accountNumberLast4}`;
}
