import { db } from "@/lib/db";
import { ALL_ROLES, ROLE_LABELS, type UserRole } from "@/lib/authorization/roles";
import { INACTIVE_EMPLOYMENT_STATUSES, EmploymentStatus, EXPIRY_ALERT_THRESHOLDS_DAYS, WorkforceAvailability } from "@/lib/hr/constants";
import { getWorkforceAvailabilityBatch } from "@/lib/services/employee-availability-service";

export async function getUserAdminSummary() {
  const [totalActive, roleCounts, recentLogins, recentAdminActivity] =
    await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.role.findMany({
        select: { code: true, _count: { select: { users: true } } },
      }),
      db.auditLog.findMany({
        where: { action: "AUTH_LOGIN_SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true, email: true } } },
      }),
      db.auditLog.findMany({
        where: {
          action: {
            in: [
              "USER_CREATED",
              "USER_UPDATED",
              "USER_ROLE_CHANGED",
              "USER_ACTIVATED",
              "USER_DEACTIVATED",
            ],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { user: { select: { name: true } } },
      }),
    ]);

  const byRole = new Map(roleCounts.map((r) => [r.code, r._count.users]));

  return {
    totalActive,
    byRole: ALL_ROLES.map((code: UserRole) => ({
      role: code,
      label: ROLE_LABELS[code],
      count: byRole.get(code) ?? 0,
    })),
    recentLogins,
    recentAdminActivity,
  };
}

const EXPIRY_ALERT_WINDOW_DAYS = Math.max(...EXPIRY_ALERT_THRESHOLDS_DAYS);

export async function getHrDashboardSummary() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const expiryWindowEnd = new Date();
  expiryWindowEnd.setDate(expiryWindowEnd.getDate() + EXPIRY_ALERT_WINDOW_DAYS);

  const [
    activeEmployees,
    departmentCount,
    newJoinersThisMonth,
    offboardedThisMonth,
    expiringWorkPasses,
    expiringCertifications,
    allEmployeeIds,
  ] = await Promise.all([
    db.employee.count({
      where: { employmentStatus: { notIn: INACTIVE_EMPLOYMENT_STATUSES } },
    }),
    db.department.count({ where: { isActive: true } }),
    db.employee.count({ where: { joiningDate: { gte: startOfMonth } } }),
    db.employee.count({
      where: {
        employmentStatus: EmploymentStatus.OFFBOARDED,
        updatedAt: { gte: startOfMonth },
      },
    }),
    db.workPass.count({
      where: { expiryDate: { lte: expiryWindowEnd, gte: new Date() } },
    }),
    db.employeeCertification.count({
      where: { expiryDate: { lte: expiryWindowEnd, gte: new Date() } },
    }),
    db.employee.findMany({
      where: { employmentStatus: { notIn: INACTIVE_EMPLOYMENT_STATUSES } },
      select: { id: true },
    }),
  ]);

  const availabilityByEmployee = await getWorkforceAvailabilityBatch(
    allEmployeeIds.map((e) => e.id)
  );
  let inProject = 0;
  let free = 0;
  for (const status of availabilityByEmployee.values()) {
    if (status === WorkforceAvailability.IN_PROJECT) inProject += 1;
    if (status === WorkforceAvailability.FREE) free += 1;
  }

  return {
    activeEmployees,
    departmentCount,
    newJoinersThisMonth,
    offboardedThisMonth,
    expiringWorkPasses,
    expiringCertifications,
    inProject,
    free,
  };
}
