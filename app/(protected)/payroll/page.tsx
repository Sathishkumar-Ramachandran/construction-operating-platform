import Link from "next/link";
import { Wallet } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { listPayrollPeriods } from "@/lib/services/payroll-service";
import { CreatePayrollPeriodDialog } from "@/app/(protected)/payroll/create-payroll-period-dialog";
import { PayrollPeriodStatusBadge } from "@/app/(protected)/payroll/payroll-period-status-badge";
import type { PayrollPeriodStatus } from "@/lib/payroll/constants";

export default async function PayrollPage() {
  const actor = await requirePermission(PERMISSIONS.PAYROLL_RUNS_VIEW.code);
  const canManage = await hasPermission(actor, PERMISSIONS.PAYROLL_RUNS_MANAGE.code);
  const periods = await listPayrollPeriods();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        description="Run monthly payroll, review payslips, and manage CPF/statutory settings."
        actions={canManage ? <CreatePayrollPeriodDialog /> : null}
      />
      {periods.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No payroll periods yet"
          description={canManage ? "Create your first payroll period to get started." : "No payroll periods have been created yet."}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payslips</TableHead>
              <TableHead>Cutoff date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {periods.map((period) => (
              <TableRow key={period.id}>
                <TableCell className="font-medium">
                  {period.periodMonth}/{period.periodYear}
                </TableCell>
                <TableCell>
                  <PayrollPeriodStatusBadge status={period.status as PayrollPeriodStatus} />
                </TableCell>
                <TableCell>{period._count.payslips}</TableCell>
                <TableCell>{period.cutoffDate.toLocaleDateString("en-SG")}</TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/payroll/${period.id}`} />}>
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
