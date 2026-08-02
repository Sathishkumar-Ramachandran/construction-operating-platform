"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Pencil, ShieldAlert, Hash, CalendarDays, Building2, Users2, ClipboardCheck, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { EmptyState } from "@/components/shared/empty-state";
import { EmploymentStatusBadge } from "@/components/shared/employment-status-badge";
import { WorkforceAvailabilityBadge } from "@/components/shared/workforce-availability-badge";
import { EmployeeStatusDialog } from "@/app/(protected)/employees/[id]/employee-status-dialog";
import { OffboardDialog } from "@/app/(protected)/employees/[id]/offboard-dialog";
import { UserAccessPanel } from "@/app/(protected)/employees/[id]/user-access-panel";
import { AllocationPanel } from "@/app/(protected)/employees/[id]/allocation-panel";
import { DocumentsPanel } from "@/app/(protected)/employees/[id]/documents-panel";
import { WorkPassesPanel } from "@/app/(protected)/employees/[id]/work-passes-panel";
import { CertificationsPanel } from "@/app/(protected)/employees/[id]/certifications-panel";
import { BankAccountsPanel } from "@/app/(protected)/employees/[id]/bank-accounts-panel";
import { AttendancePanel, type AttendanceHistoryDayView } from "@/app/(protected)/employees/[id]/attendance-panel";
import { PayrollPanel } from "@/app/(protected)/employees/[id]/payroll-panel";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import type { EmployeeAccessLevel } from "@/lib/services/employee-service";
import type { getEmployeeById } from "@/lib/services/employee-service";
import type { getWorkforceAvailability } from "@/lib/services/employee-availability-service";
import type { getStatusHistory } from "@/lib/services/employee-status-service";
import type { listAssignmentsForEmployee } from "@/lib/services/employee-allocation-service";
import type { listEmployeeDocuments, getEmployeeDocumentChecklist } from "@/lib/services/employee-document-service";
import type { listWorkPasses } from "@/lib/services/work-pass-service";
import type { listCertifications } from "@/lib/services/certification-service";
import type { getDirectReports } from "@/lib/services/org-hierarchy-service";
import type { listEmergencyContacts, listBankAccountsMasked } from "@/lib/services/employee-personal-service";
import type { getSalaryStructureForEmployee, listPayslipsForEmployee } from "@/lib/services/payroll-service";

type Employee = Awaited<ReturnType<typeof getEmployeeById>>["employee"];

type Permissions = {
  canUpdate: boolean;
  canDeactivate: boolean;
  canOffboard: boolean;
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canViewWorkPass: boolean;
  canManageWorkPass: boolean;
  canViewCertification: boolean;
  canManageCertification: boolean;
  canViewAllocation: boolean;
  canManageAllocation: boolean;
  canCreateUserFromEmployee: boolean;
  canResetPassword: boolean;
  canViewAudit: boolean;
  canViewAttendance: boolean;
  canManageAttendance: boolean;
  canViewPayroll: boolean;
  canManageSalaryStructures: boolean;
};

export function EmployeeProfileTabs({
  employee,
  access,
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
  attendanceHistory,
  salaryStructure,
  payslips,
  linkedUser,
  permissions,
}: {
  employee: Employee;
  salaryStructure: Awaited<ReturnType<typeof getSalaryStructureForEmployee>>;
  payslips: Awaited<ReturnType<typeof listPayslipsForEmployee>>;
  access: EmployeeAccessLevel;
  availability: Awaited<ReturnType<typeof getWorkforceAvailability>>;
  statusHistory: Awaited<ReturnType<typeof getStatusHistory>>;
  assignments: Awaited<ReturnType<typeof listAssignmentsForEmployee>>;
  documents: Awaited<ReturnType<typeof listEmployeeDocuments>>;
  documentChecklist: Awaited<ReturnType<typeof getEmployeeDocumentChecklist>>;
  workPasses: Awaited<ReturnType<typeof listWorkPasses>>;
  certifications: Awaited<ReturnType<typeof listCertifications>>;
  directReports: Awaited<ReturnType<typeof getDirectReports>>;
  auditLogs: { id: string; action: string; createdAt: Date; metadata: unknown }[];
  emergencyContacts: Awaited<ReturnType<typeof listEmergencyContacts>>;
  bankAccounts: Awaited<ReturnType<typeof listBankAccountsMasked>>;
  attendanceHistory: AttendanceHistoryDayView[];
  linkedUser: { id: string; name: string; email: string; isActive: boolean; lastLoginAt: Date | null } | null;
  permissions: Permissions;
}) {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [offboardOpen, setOffboardOpen] = useState(false);
  const [onboardingBannerDismissed, setOnboardingBannerDismissed] = useState(false);

  const isOffboarded = employee.employmentStatus === "OFFBOARDED" || employee.employmentStatus === "ARCHIVED";

  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1" && permissions.canViewDocuments;

  const mandatoryChecklist = documentChecklist.filter((item) => item.isMandatory);
  const mandatoryUploadedCount = mandatoryChecklist.filter((item) => item.status !== "MISSING").length;
  const showOnboardingBanner =
    isOnboarding &&
    !onboardingBannerDismissed &&
    mandatoryChecklist.length > 0 &&
    mandatoryUploadedCount < mandatoryChecklist.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <EmploymentStatusBadge status={employee.employmentStatus} />
        <WorkforceAvailabilityBadge status={availability} />
        {permissions.canUpdate ? (
          <Button size="sm" variant="outline" className="gap-1.5" nativeButton={false} render={<Link href={`/employees/${employee.id}/edit`} />}>
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Button>
        ) : null}
        {permissions.canDeactivate && !isOffboarded ? (
          <Button size="sm" variant="outline" onClick={() => setStatusDialogOpen(true)}>
            Change status
          </Button>
        ) : null}
        {permissions.canOffboard && !isOffboarded ? (
          <Button size="sm" variant="destructive" onClick={() => setOffboardOpen(true)}>
            Offboard
          </Button>
        ) : null}
      </div>

      {showOnboardingBanner ? (
        <div className="flex items-start gap-3 rounded-xl border border-gold/30 bg-gold/5 p-4 text-sm">
          <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              Onboarding: {mandatoryUploadedCount} of {mandatoryChecklist.length} required documents uploaded
            </p>
            <p className="mt-0.5 text-muted-foreground">
              Finish uploading this employee&apos;s required documents to complete onboarding.
            </p>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            className="shrink-0"
            onClick={() => setOnboardingBannerDismissed(true)}
          >
            <X className="size-4" aria-hidden />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      ) : null}

      <Tabs defaultValue={isOnboarding ? "documents" : "overview"}>
        <div className="overflow-x-auto">
          <TabsList variant="line" className="w-max min-w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="personal">Personal & Contact</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            {access === "SENSITIVE" ? <TabsTrigger value="bank">Bank</TabsTrigger> : null}
            {permissions.canViewDocuments ? <TabsTrigger value="documents">Documents</TabsTrigger> : null}
            {permissions.canViewWorkPass || permissions.canViewCertification ? (
              <TabsTrigger value="passes">Work Passes & Licences</TabsTrigger>
            ) : null}
            {permissions.canViewAllocation ? <TabsTrigger value="allocation">Allocation</TabsTrigger> : null}
            {permissions.canViewAttendance ? <TabsTrigger value="attendance">Attendance</TabsTrigger> : null}
            {permissions.canViewPayroll ? <TabsTrigger value="payroll">Payroll</TabsTrigger> : null}
            <TabsTrigger value="lifecycle">Lifecycle</TabsTrigger>
            {permissions.canCreateUserFromEmployee || permissions.canResetPassword ? (
              <TabsTrigger value="access">User Access</TabsTrigger>
            ) : null}
            {permissions.canViewAudit ? <TabsTrigger value="audit">Audit History</TabsTrigger> : null}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DashboardCard icon={Hash} label="Employee number" value={employee.employeeNumber} />
            <DashboardCard icon={CalendarDays} label="Joining date" value={new Date(employee.joiningDate).toLocaleDateString()} />
            <DashboardCard icon={Building2} label="Department" value={employee.department?.name ?? "—"} />
            <DashboardCard icon={Users2} label="Direct reports" value={directReports.length} />
          </div>
          {employee.reportingManager ? (
            <div className="rounded-xl border border-border bg-card p-4 text-sm">
              <span className="text-muted-foreground">Reports to </span>
              <Link
                href={`/employees/${employee.reportingManager.id}`}
                className="font-medium text-foreground hover:underline"
              >
                {employeeDisplayName(employee.reportingManager)}
              </Link>
            </div>
          ) : null}
          {directReports.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-2 text-sm font-semibold text-foreground">Direct reports</h4>
              <ul className="space-y-1.5 text-sm">
                {directReports.map((report) => (
                  <li key={report.id}>
                    <Link href={`/employees/${report.id}`} className="text-foreground hover:underline">
                      {employeeDisplayName(report)}
                    </Link>
                    <span className="text-muted-foreground"> · {report.designation?.name ?? "—"}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          {access !== "SENSITIVE" ? (
            <RestrictedNotice />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoField label="Date of birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString() : "—"} />
              <InfoField label="Gender" value={employee.gender ?? "—"} />
              <InfoField label="Nationality" value={employee.nationalityCode ?? "—"} />
              <InfoField label="Marital status" value={employee.maritalStatus ?? "—"} />
              <InfoField label="National ID" value={employee.nationalIdLast4 ? `••••${employee.nationalIdLast4}` : "—"} />
              <InfoField label="Passport" value={employee.passportLast4 ? `••••${employee.passportLast4}` : "—"} />
              <InfoField label="Personal email" value={employee.personalEmail ?? "—"} />
              <InfoField label="Work email" value={employee.workEmail ?? "—"} />
              <InfoField label="Mobile" value={employee.mobileNumber ?? "—"} />
              <InfoField label="Alternate mobile" value={employee.alternateMobileNumber ?? "—"} />
            </div>
          )}

          {access === "SENSITIVE" ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="mb-3 text-sm font-semibold text-foreground">Emergency contacts</h4>
              {emergencyContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No emergency contacts recorded.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {emergencyContacts.map((contact) => (
                    <li key={contact.id} className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">{contact.name}</span>
                      <span className="text-muted-foreground">({contact.relationship})</span>
                      <span className="text-muted-foreground">{contact.phone}</span>
                      {contact.isPrimary ? <Badge variant="outline">Primary</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoField label="Designation" value={employee.designation?.name ?? "—"} />
            <InfoField label="Department" value={employee.department?.name ?? "—"} />
            {access !== "DIRECTORY" ? <InfoField label="Grade" value={employee.grade?.name ?? "—"} /> : null}
            {access !== "DIRECTORY" ? <InfoField label="Employment type" value={employee.employmentType?.name ?? "—"} /> : null}
            <InfoField label="Joining date" value={new Date(employee.joiningDate).toLocaleDateString()} />
            {access === "SENSITIVE" ? (
              <InfoField
                label="Confirmation date"
                value={employee.confirmationDate ? new Date(employee.confirmationDate).toLocaleDateString() : "Pending"}
              />
            ) : null}
          </div>
        </TabsContent>

        {access === "SENSITIVE" ? (
          <TabsContent value="bank">
            <BankAccountsPanel employeeId={employee.id} accounts={bankAccounts} />
          </TabsContent>
        ) : null}

        {permissions.canViewDocuments ? (
          <TabsContent value="documents">
            <DocumentsPanel
              employeeId={employee.id}
              documents={documents}
              checklist={documentChecklist}
              canUpload={permissions.canUploadDocuments}
            />
          </TabsContent>
        ) : null}

        {permissions.canViewWorkPass || permissions.canViewCertification ? (
          <TabsContent value="passes" className="space-y-6">
            {permissions.canViewWorkPass ? (
              <WorkPassesPanel
                employeeId={employee.id}
                workPasses={workPasses}
                canManage={permissions.canManageWorkPass}
              />
            ) : null}
            {permissions.canViewCertification ? (
              <CertificationsPanel
                employeeId={employee.id}
                certifications={certifications}
                canManage={permissions.canManageCertification}
              />
            ) : null}
          </TabsContent>
        ) : null}

        {permissions.canViewAllocation ? (
          <TabsContent value="allocation">
            <AllocationPanel
              employeeId={employee.id}
              assignments={assignments}
              canManage={permissions.canManageAllocation}
            />
          </TabsContent>
        ) : null}

        {permissions.canViewAttendance ? (
          <TabsContent value="attendance">
            <AttendancePanel
              employeeId={employee.id}
              employeeName={employeeDisplayName(employee)}
              history={attendanceHistory}
              canManage={permissions.canManageAttendance}
            />
          </TabsContent>
        ) : null}

        {permissions.canViewPayroll ? (
          <TabsContent value="payroll">
            <PayrollPanel
              employeeId={employee.id}
              salaryStructure={salaryStructure}
              payslips={payslips}
              canManageStructures={permissions.canManageSalaryStructures}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="lifecycle">
          {statusHistory.length === 0 ? (
            <EmptyState title="No status changes yet" description="This employee's status has not changed since creation." />
          ) : (
            <ol className="space-y-3">
              {statusHistory.map((entry) => (
                <li key={entry.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">{entry.previousStatus ?? "—"}</span>
                    <span>→</span>
                    <span className="font-medium text-foreground">{entry.newStatus}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-muted-foreground">{entry.reason}</p>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        {permissions.canCreateUserFromEmployee || permissions.canResetPassword ? (
          <TabsContent value="access">
            <UserAccessPanel
              employeeId={employee.id}
              employeeName={employeeDisplayName(employee)}
              linkedUser={linkedUser}
              canCreateUser={permissions.canCreateUserFromEmployee}
              canResetPassword={permissions.canResetPassword}
            />
          </TabsContent>
        ) : null}

        {permissions.canViewAudit ? (
          <TabsContent value="audit">
            {auditLogs.length === 0 ? (
              <EmptyState title="No audit history" description="No recorded changes for this employee yet." />
            ) : (
              <ul className="space-y-2 text-sm">
                {auditLogs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-foreground">{log.action}</span>
                    <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        ) : null}
      </Tabs>

      <EmployeeStatusDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        employeeId={employee.id}
        currentStatus={employee.employmentStatus}
      />
      <OffboardDialog open={offboardOpen} onOpenChange={setOffboardOpen} employeeId={employee.id} />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

function RestrictedNotice() {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>You don&apos;t have permission to view this employee&apos;s personal details.</span>
    </div>
  );
}
