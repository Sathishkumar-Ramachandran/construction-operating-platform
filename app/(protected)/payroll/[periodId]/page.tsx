import { notFound } from "next/navigation";
import Link from "next/link";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getPayrollPeriodById } from "@/lib/services/payroll-service";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { PayrollPeriodStatusBadge } from "@/app/(protected)/payroll/payroll-period-status-badge";
import { PayrollPeriodActions } from "@/app/(protected)/payroll/[periodId]/payroll-period-actions";
import type { PayrollPeriodStatus } from "@/lib/payroll/constants";
import { Wallet } from "lucide-react";

export default async function PayrollPeriodPage({
  params,
}: {
  params: Promise<{ periodId: string }>;
}) {
  const { periodId } = await params;
  return withTenantPermission(PERMISSIONS.PAYROLL_RUNS_VIEW.code, async (actor) => {
    const canManage = await hasPermission(actor, PERMISSIONS.PAYROLL_RUNS_MANAGE.code);

    let period;
    try {
      period = await getPayrollPeriodById(periodId);
    } catch (error) {
      if (isAppError(error)) notFound();
      throw error;
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title={`Payroll — ${period.periodMonth}/${period.periodYear}`}
          description="Review and process this month's payroll run."
          actions={
            <div className="flex items-center gap-2">
              <PayrollPeriodStatusBadge status={period.status as PayrollPeriodStatus} />
              {canManage ? <PayrollPeriodActions periodId={period.id} status={period.status} /> : null}
            </div>
          }
        />

        {period.payslips.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title="No payslips yet"
            description="Process this payroll run to generate payslips for every active employee with a salary structure."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Gross</TableHead>
                <TableHead className="text-right">Employee CPF</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Disbursement</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {period.payslips.map((payslip) => (
                <TableRow key={payslip.id}>
                  <TableCell>
                    <Link href={`/employees/${payslip.employee.id}`} className="hover:underline">
                      {employeeDisplayName(payslip.employee)}
                    </Link>
                    <span className="text-muted-foreground"> · {payslip.employee.employeeNumber}</span>
                  </TableCell>
                  <TableCell className="text-right">${Number(payslip.grossPay).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${Number(payslip.employeeCpfAmount).toFixed(2)}</TableCell>
                  <TableCell className="text-right">${Number(payslip.netPay).toFixed(2)}</TableCell>
                  <TableCell>{payslip.disbursementStatus}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/payroll/payslips/${payslip.id}`} />}>
                      View payslip
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  });
}
