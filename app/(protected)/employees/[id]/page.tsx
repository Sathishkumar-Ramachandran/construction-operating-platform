import { notFound } from "next/navigation";
import { withTenantUser } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { getEmployeeById, employeeDisplayName, getActorEmployeeId } from "@/lib/services/employee-service";
import { getWorkforceAvailability } from "@/lib/services/employee-availability-service";
import { getStatusHistory } from "@/lib/services/employee-status-service";
import { listAssignmentsForEmployee } from "@/lib/services/employee-allocation-service";
import { listEmployeeDocuments, getEmployeeDocumentChecklist } from "@/lib/services/employee-document-service";
import { listWorkPasses } from "@/lib/services/work-pass-service";
import { listCertifications } from "@/lib/services/certification-service";
import { getDirectReports } from "@/lib/services/org-hierarchy-service";
import { listEmergencyContacts, listBankAccountsMasked } from "@/lib/services/employee-personal-service";
import { getEmployeeAttendanceHistory } from "@/lib/services/attendance-service";
import { getSalaryStructureForEmployee, listPayslipsForEmployee } from "@/lib/services/payroll-service";
import { db } from "@/lib/db";
import { EmployeeProfileTabs } from "@/app/(protected)/employees/[id]/employee-profile-tabs";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return withTenantUser(async (actor) => {
    let employeeResult;
    try {
      employeeResult = await getEmployeeById(actor, id);
    } catch (error) {
      if (isAppError(error)) notFound();
      throw error;
    }

    const { employee, access } = employeeResult;

    const [
      canUpdate,
      canDeactivate,
      canOffboard,
      canViewDocuments,
      canUploadDocuments,
      canViewWorkPass,
      canManageWorkPass,
      canViewCertification,
      canManageCertification,
      canViewAllocation,
      canManageAllocation,
      canCreateUserFromEmployee,
      canResetPassword,
      canViewAudit,
      canViewAttendance,
      canManageAttendance,
      canViewPayslipsAll,
      canViewPayslipsOwn,
      canManageSalaryStructures,
      actorEmployeeId,
      availability,
      statusHistory,
      assignments,
      documents,
      documentChecklist,
      workPasses,
      certifications,
      directReports,
      auditLogs,
      emergencyContacts,
      bankAccounts,
      attendanceHistoryRaw,
    ] = await Promise.all([
      hasPermission(actor, PERMISSIONS.HR_EMPLOYEE_UPDATE.code),
      hasPermission(actor, PERMISSIONS.HR_EMPLOYEE_DEACTIVATE.code),
      hasPermission(actor, PERMISSIONS.HR_EMPLOYEE_OFFBOARD.code),
      hasPermission(actor, PERMISSIONS.HR_DOCUMENT_VIEW.code),
      hasPermission(actor, PERMISSIONS.HR_DOCUMENT_UPLOAD.code),
      hasPermission(actor, PERMISSIONS.HR_WORK_PASS_VIEW.code),
      hasPermission(actor, PERMISSIONS.HR_WORK_PASS_MANAGE.code),
      hasPermission(actor, PERMISSIONS.HR_CERTIFICATION_VIEW.code),
      hasPermission(actor, PERMISSIONS.HR_CERTIFICATION_MANAGE.code),
      hasPermission(actor, PERMISSIONS.HR_ALLOCATION_VIEW.code),
      hasPermission(actor, PERMISSIONS.HR_ALLOCATION_MANAGE.code),
      hasPermission(actor, PERMISSIONS.USERS_CREATE_FROM_EMPLOYEE.code),
      hasPermission(actor, PERMISSIONS.USERS_RESET_PASSWORD.code),
      hasPermission(actor, PERMISSIONS.AUDIT_VIEW.code),
      hasPermission(actor, PERMISSIONS.HR_ATTENDANCE_VIEW.code),
      hasPermission(actor, PERMISSIONS.HR_ATTENDANCE_MANAGE.code),
      hasPermission(actor, PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_ALL.code),
      hasPermission(actor, PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_OWN.code),
      hasPermission(actor, PERMISSIONS.PAYROLL_STRUCTURES_MANAGE.code),
      getActorEmployeeId(actor.id),
      getWorkforceAvailability(employee.id),
      getStatusHistory(employee.id),
      listAssignmentsForEmployee(employee.id),
      hasPermission(actor, PERMISSIONS.HR_DOCUMENT_VIEW.code).then((can) =>
        can ? listEmployeeDocuments(employee.id) : []
      ),
      hasPermission(actor, PERMISSIONS.HR_DOCUMENT_VIEW.code).then((can) =>
        can ? getEmployeeDocumentChecklist(employee.id) : []
      ),
      hasPermission(actor, PERMISSIONS.HR_WORK_PASS_VIEW.code).then((can) =>
        can ? listWorkPasses(employee.id) : []
      ),
      hasPermission(actor, PERMISSIONS.HR_CERTIFICATION_VIEW.code).then((can) =>
        can ? listCertifications(employee.id) : []
      ),
      getDirectReports(employee.id),
      hasPermission(actor, PERMISSIONS.AUDIT_VIEW.code).then((can) =>
        can
          ? db.auditLog.findMany({
              where: { entityType: "Employee", entityId: employee.id },
              orderBy: { createdAt: "desc" },
              take: 50,
            })
          : []
      ),
      access === "SENSITIVE" ? listEmergencyContacts(employee.id) : [],
      access === "SENSITIVE" ? listBankAccountsMasked(employee.id) : [],
      hasPermission(actor, PERMISSIONS.HR_ATTENDANCE_VIEW.code).then((can) => {
        if (!can) return [];
        const to = new Date();
        const from = new Date();
        from.setDate(from.getDate() - 29);
        return getEmployeeAttendanceHistory(actor, employee.id, {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        });
      }),
    ]);

    const attendanceHistory = attendanceHistoryRaw.map((day) => ({
      date: day.date,
      status: day.status,
      checkInAt: day.checkInAt ? day.checkInAt.toISOString() : null,
      checkOutAt: day.checkOutAt ? day.checkOutAt.toISOString() : null,
      notes: day.notes,
    }));

    const linkedUser = employee.userId
      ? await db.user.findUnique({
          where: { id: employee.userId },
          select: { id: true, name: true, email: true, isActive: true, lastLoginAt: true },
        })
      : null;

    const isSelf = actorEmployeeId === employee.id;
    const canViewPayroll = canViewPayslipsAll || canManageSalaryStructures || (isSelf && canViewPayslipsOwn);
    const [salaryStructure, payslips] = canViewPayroll
      ? await Promise.all([
          getSalaryStructureForEmployee(employee.id),
          listPayslipsForEmployee(employee.id),
        ])
      : [null, []];

    return (
      <div className="space-y-6">
        <PageHeader
          title={employeeDisplayName(employee)}
          description={`${employee.employeeNumber} · ${employee.designation?.name ?? "—"}`}
        />
        <EmployeeProfileTabs
          employee={employee}
          access={access}
          availability={availability}
          statusHistory={statusHistory}
          assignments={assignments}
          documents={documents}
          documentChecklist={documentChecklist}
          workPasses={workPasses}
          certifications={certifications}
          directReports={directReports}
          auditLogs={auditLogs}
          emergencyContacts={emergencyContacts}
          bankAccounts={bankAccounts}
          attendanceHistory={attendanceHistory}
          salaryStructure={salaryStructure}
          payslips={payslips}
          linkedUser={linkedUser}
          permissions={{
            canUpdate,
            canDeactivate,
            canOffboard,
            canViewDocuments,
            canUploadDocuments,
            canViewWorkPass,
            canManageWorkPass,
            canViewCertification,
            canManageCertification,
            canViewAllocation,
            canManageAllocation,
            canCreateUserFromEmployee,
            canResetPassword,
            canViewAudit,
            canViewAttendance,
            canManageAttendance,
            canViewPayroll,
            canManageSalaryStructures,
          }}
        />
      </div>
    );
  });
}
