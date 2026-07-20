import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { assertNoDepartmentCycle } from "@/lib/services/org-hierarchy-service";
import type {
  DepartmentInput,
  DesignationInput,
  EmploymentGradeInput,
  EmploymentTypeInput,
  ProjectRoleInput,
  DocumentTypeInput,
  CertificationTypeInput,
} from "@/lib/validation/hr-master-data";
import type { ShiftTypeInput, HolidayInput } from "@/lib/validation/attendance";
import type { LeaveTypeInput } from "@/lib/validation/leave";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function normalizeOptional(value?: string | null) {
  return value && value.trim().length > 0 ? value.trim() : null;
}

async function assertCodeAvailable(
  model:
    | "department"
    | "designation"
    | "employmentGrade"
    | "employmentType"
    | "projectRole"
    | "documentType"
    | "certificationType"
    | "shiftType"
    | "leaveType",
  code: string,
  excludeId?: string
) {
  // Prisma's delegate typing differs per model; narrow via a small switch so
  // this stays a single reusable helper without `any`.
  const where = { code, ...(excludeId ? { NOT: { id: excludeId } } : {}) };
  const existing = await (db[model] as { findFirst: (args: unknown) => Promise<{ id: string } | null> }).findFirst({
    where,
    select: { id: true },
  });
  if (existing) throw new AppError(ErrorCode.MASTER_DATA_CODE_ALREADY_EXISTS);
}

// --- Departments ------------------------------------------------------

export async function listDepartments() {
  return db.department.findMany({
    orderBy: { name: "asc" },
    include: {
      parentDepartment: { select: { id: true, name: true } },
      managerEmployee: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { employees: true, childDepartments: true } },
    },
  });
}

export async function createDepartment(
  actor: AuthenticatedUser,
  input: DepartmentInput,
  meta: ActorMeta = {}
) {
  await assertCodeAvailable("department", input.code);
  if (input.parentDepartmentId) {
    // A brand-new department has no id yet, so pass a sentinel that can't
    // match any real row — cycle detection only matters on update.
    await assertNoDepartmentCycle("__new__", input.parentDepartmentId);
  }

  return db.$transaction(async (tx) => {
    const department = await tx.department.create({
      data: {
        code: input.code,
        name: input.name,
        description: normalizeOptional(input.description),
        parentDepartmentId: input.parentDepartmentId ?? null,
        managerEmployeeId: input.managerEmployeeId ?? null,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.DEPARTMENT_CREATED,
      entityType: "Department",
      entityId: department.id,
      afterData: { code: department.code, name: department.name },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return department;
  });
}

export async function updateDepartment(
  actor: AuthenticatedUser,
  input: DepartmentInput & { id: string },
  meta: ActorMeta = {}
) {
  const existing = await db.department.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);

  if (input.code !== existing.code) {
    await assertCodeAvailable("department", input.code, input.id);
  }
  if (input.parentDepartmentId) {
    await assertNoDepartmentCycle(input.id, input.parentDepartmentId);
  }

  return db.$transaction(async (tx) => {
    const department = await tx.department.update({
      where: { id: input.id },
      data: {
        code: input.code,
        name: input.name,
        description: normalizeOptional(input.description),
        parentDepartmentId: input.parentDepartmentId ?? null,
        managerEmployeeId: input.managerEmployeeId ?? null,
        updatedBy: actor.id,
      },
    });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.DEPARTMENT_UPDATED,
      entityType: "Department",
      entityId: department.id,
      beforeData: { name: existing.name, parentDepartmentId: existing.parentDepartmentId },
      afterData: { name: department.name, parentDepartmentId: department.parentDepartmentId },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return department;
  });
}

export async function setDepartmentActive(
  actor: AuthenticatedUser,
  id: string,
  isActive: boolean
) {
  if (!isActive) {
    const employeeCount = await db.employee.count({ where: { departmentId: id } });
    if (employeeCount > 0) throw new AppError(ErrorCode.DEPARTMENT_IN_USE);
  }
  return db.department.update({
    where: { id },
    data: { isActive, updatedBy: actor.id },
  });
}

// --- Designations -------------------------------------------------------

export async function listDesignations() {
  return db.designation.findMany({
    orderBy: { name: "asc" },
    include: {
      department: { select: { id: true, name: true } },
      grade: { select: { id: true, name: true } },
      requiredDocuments: {
        include: { documentType: { select: { id: true, code: true, name: true } } },
      },
    },
  });
}

export async function createDesignation(
  actor: AuthenticatedUser,
  input: DesignationInput
) {
  await assertCodeAvailable("designation", input.code);

  return db.$transaction(async (tx) => {
    const designation = await tx.designation.create({
      data: {
        code: input.code,
        name: input.name,
        description: normalizeOptional(input.description),
        gradeId: input.gradeId ?? null,
        departmentId: input.departmentId ?? null,
        isManagerial: input.isManagerial,
      },
    });

    if (input.requiredDocumentTypeIds.length > 0) {
      await tx.designationRequiredDocument.createMany({
        data: input.requiredDocumentTypeIds.map((documentTypeId) => ({
          designationId: designation.id,
          documentTypeId,
          createdBy: actor.id,
        })),
      });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.MASTER_DATA_CREATED,
      entityType: "Designation",
      entityId: designation.id,
      afterData: { code: designation.code, name: designation.name, requiredDocumentTypeIds: input.requiredDocumentTypeIds },
    });
    return designation;
  });
}

export async function updateDesignation(
  actor: AuthenticatedUser,
  input: DesignationInput & { id: string }
) {
  const existing = await db.designation.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("designation", input.code, input.id);
  }

  return db.$transaction(async (tx) => {
    const designation = await tx.designation.update({
      where: { id: input.id },
      data: {
        code: input.code,
        name: input.name,
        description: normalizeOptional(input.description),
        gradeId: input.gradeId ?? null,
        departmentId: input.departmentId ?? null,
        isManagerial: input.isManagerial,
      },
    });

    await tx.designationRequiredDocument.deleteMany({ where: { designationId: input.id } });
    if (input.requiredDocumentTypeIds.length > 0) {
      await tx.designationRequiredDocument.createMany({
        data: input.requiredDocumentTypeIds.map((documentTypeId) => ({
          designationId: input.id,
          documentTypeId,
          createdBy: actor.id,
        })),
      });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.MASTER_DATA_UPDATED,
      entityType: "Designation",
      entityId: designation.id,
      afterData: { requiredDocumentTypeIds: input.requiredDocumentTypeIds },
    });
    return designation;
  });
}

export async function setDesignationActive(id: string, isActive: boolean) {
  return db.designation.update({ where: { id }, data: { isActive } });
}

// --- Employment grades ----------------------------------------------------

export async function listEmploymentGrades() {
  return db.employmentGrade.findMany({ orderBy: { rank: "asc" } });
}

export async function createEmploymentGrade(
  actor: AuthenticatedUser,
  input: EmploymentGradeInput
) {
  await assertCodeAvailable("employmentGrade", input.code);
  const grade = await db.employmentGrade.create({
    data: {
      code: input.code,
      name: input.name,
      rank: input.rank,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "EmploymentGrade",
    entityId: grade.id,
  });
  return grade;
}

export async function updateEmploymentGrade(
  actor: AuthenticatedUser,
  input: EmploymentGradeInput & { id: string }
) {
  const existing = await db.employmentGrade.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("employmentGrade", input.code, input.id);
  }
  const grade = await db.employmentGrade.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      rank: input.rank,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "EmploymentGrade",
    entityId: grade.id,
  });
  return grade;
}

export async function setEmploymentGradeActive(id: string, isActive: boolean) {
  return db.employmentGrade.update({ where: { id }, data: { isActive } });
}

// --- Employment types -------------------------------------------------

export async function listEmploymentTypes() {
  return db.employmentType.findMany({ orderBy: { name: "asc" } });
}

export async function createEmploymentType(
  actor: AuthenticatedUser,
  input: EmploymentTypeInput
) {
  await assertCodeAvailable("employmentType", input.code);
  const type = await db.employmentType.create({
    data: {
      code: input.code,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "EmploymentType",
    entityId: type.id,
  });
  return type;
}

export async function updateEmploymentType(
  actor: AuthenticatedUser,
  input: EmploymentTypeInput & { id: string }
) {
  const existing = await db.employmentType.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("employmentType", input.code, input.id);
  }
  const type = await db.employmentType.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "EmploymentType",
    entityId: type.id,
  });
  return type;
}

export async function setEmploymentTypeActive(id: string, isActive: boolean) {
  return db.employmentType.update({ where: { id }, data: { isActive } });
}

// --- Project roles ------------------------------------------------------

export async function listProjectRoles() {
  return db.projectRole.findMany({ orderBy: { name: "asc" } });
}

export async function createProjectRole(
  actor: AuthenticatedUser,
  input: ProjectRoleInput
) {
  await assertCodeAvailable("projectRole", input.code);
  const role = await db.projectRole.create({
    data: {
      code: input.code,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "ProjectRole",
    entityId: role.id,
  });
  return role;
}

export async function updateProjectRole(
  actor: AuthenticatedUser,
  input: ProjectRoleInput & { id: string }
) {
  const existing = await db.projectRole.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("projectRole", input.code, input.id);
  }
  const role = await db.projectRole.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "ProjectRole",
    entityId: role.id,
  });
  return role;
}

export async function setProjectRoleActive(id: string, isActive: boolean) {
  return db.projectRole.update({ where: { id }, data: { isActive } });
}

// --- Document types -----------------------------------------------------

export async function listDocumentTypes() {
  return db.documentType.findMany({ orderBy: { name: "asc" } });
}

export async function createDocumentType(
  actor: AuthenticatedUser,
  input: DocumentTypeInput
) {
  await assertCodeAvailable("documentType", input.code);
  const type = await db.documentType.create({
    data: {
      code: input.code,
      name: input.name,
      requiresExpiryDate: input.requiresExpiryDate,
      isConfidential: input.isConfidential,
      allowedMimeTypes: input.allowedMimeTypes,
      maximumFileSizeBytes: input.maximumFileSizeBytes,
      retentionCategory: normalizeOptional(input.retentionCategory),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "DocumentType",
    entityId: type.id,
  });
  return type;
}

export async function updateDocumentType(
  actor: AuthenticatedUser,
  input: DocumentTypeInput & { id: string }
) {
  const existing = await db.documentType.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("documentType", input.code, input.id);
  }
  const type = await db.documentType.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      requiresExpiryDate: input.requiresExpiryDate,
      isConfidential: input.isConfidential,
      allowedMimeTypes: input.allowedMimeTypes,
      maximumFileSizeBytes: input.maximumFileSizeBytes,
      retentionCategory: normalizeOptional(input.retentionCategory),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "DocumentType",
    entityId: type.id,
  });
  return type;
}

export async function setDocumentTypeActive(id: string, isActive: boolean) {
  return db.documentType.update({ where: { id }, data: { isActive } });
}

// --- Certification types -------------------------------------------------

export async function listCertificationTypes() {
  return db.certificationType.findMany({ orderBy: { name: "asc" } });
}

export async function createCertificationType(
  actor: AuthenticatedUser,
  input: CertificationTypeInput
) {
  await assertCodeAvailable("certificationType", input.code);
  const type = await db.certificationType.create({
    data: {
      code: input.code,
      name: input.name,
      issuingAuthority: normalizeOptional(input.issuingAuthority),
      requiresExpiryDate: input.requiresExpiryDate,
      defaultValidityMonths: input.defaultValidityMonths ?? null,
      reminderDays: input.reminderDays,
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "CertificationType",
    entityId: type.id,
  });
  return type;
}

export async function updateCertificationType(
  actor: AuthenticatedUser,
  input: CertificationTypeInput & { id: string }
) {
  const existing = await db.certificationType.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("certificationType", input.code, input.id);
  }
  const type = await db.certificationType.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      issuingAuthority: normalizeOptional(input.issuingAuthority),
      requiresExpiryDate: input.requiresExpiryDate,
      defaultValidityMonths: input.defaultValidityMonths ?? null,
      reminderDays: input.reminderDays,
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "CertificationType",
    entityId: type.id,
  });
  return type;
}

export async function setCertificationTypeActive(id: string, isActive: boolean) {
  return db.certificationType.update({ where: { id }, data: { isActive } });
}

// --- Shift types ----------------------------------------------------------

export async function listShiftTypes() {
  return db.shiftType.findMany({ orderBy: { name: "asc" } });
}

export async function createShiftType(actor: AuthenticatedUser, input: ShiftTypeInput) {
  await assertCodeAvailable("shiftType", input.code);
  const shiftType = await db.shiftType.create({
    data: {
      code: input.code,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      gracePeriodMinutes: input.gracePeriodMinutes,
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "ShiftType",
    entityId: shiftType.id,
  });
  return shiftType;
}

export async function updateShiftType(
  actor: AuthenticatedUser,
  input: ShiftTypeInput & { id: string }
) {
  const existing = await db.shiftType.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("shiftType", input.code, input.id);
  }
  const shiftType = await db.shiftType.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      gracePeriodMinutes: input.gracePeriodMinutes,
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "ShiftType",
    entityId: shiftType.id,
  });
  return shiftType;
}

export async function setShiftTypeActive(id: string, isActive: boolean) {
  return db.shiftType.update({ where: { id }, data: { isActive } });
}

// --- Holidays ---------------------------------------------------------

export async function listHolidays() {
  return db.holiday.findMany({ orderBy: { date: "asc" } });
}

export async function createHoliday(actor: AuthenticatedUser, input: HolidayInput) {
  const date = new Date(input.date);
  const existing = await db.holiday.findUnique({ where: { date } });
  if (existing) throw new AppError(ErrorCode.VALIDATION_ERROR, "A holiday already exists on this date.");

  const holiday = await db.holiday.create({
    data: {
      date,
      name: input.name,
      description: normalizeOptional(input.description),
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.HOLIDAY_CREATED,
    entityType: "Holiday",
    entityId: holiday.id,
    afterData: { date: input.date, name: holiday.name },
  });
  return holiday;
}

export async function deleteHoliday(actor: AuthenticatedUser, id: string) {
  const existing = await db.holiday.findUnique({ where: { id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);

  await db.holiday.delete({ where: { id } });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.HOLIDAY_DELETED,
    entityType: "Holiday",
    entityId: id,
    beforeData: { date: existing.date.toISOString(), name: existing.name },
  });
}

// --- Leave types ------------------------------------------------------

export async function listLeaveTypes() {
  return db.leaveType.findMany({ orderBy: { name: "asc" } });
}

export async function createLeaveType(actor: AuthenticatedUser, input: LeaveTypeInput) {
  await assertCodeAvailable("leaveType", input.code);
  const leaveType = await db.leaveType.create({
    data: {
      code: input.code,
      name: input.name,
      defaultEntitlementDays: input.defaultEntitlementDays,
      isPaid: input.isPaid,
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "LeaveType",
    entityId: leaveType.id,
  });
  return leaveType;
}

export async function updateLeaveType(
  actor: AuthenticatedUser,
  input: LeaveTypeInput & { id: string }
) {
  const existing = await db.leaveType.findUnique({ where: { id: input.id } });
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND);
  if (input.code !== existing.code) {
    await assertCodeAvailable("leaveType", input.code, input.id);
  }
  const leaveType = await db.leaveType.update({
    where: { id: input.id },
    data: {
      code: input.code,
      name: input.name,
      defaultEntitlementDays: input.defaultEntitlementDays,
      isPaid: input.isPaid,
    },
  });
  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "LeaveType",
    entityId: leaveType.id,
  });
  return leaveType;
}

export async function setLeaveTypeActive(id: string, isActive: boolean) {
  return db.leaveType.update({ where: { id }, data: { isActive } });
}
