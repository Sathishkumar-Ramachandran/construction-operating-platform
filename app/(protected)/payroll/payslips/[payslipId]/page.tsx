import { notFound } from "next/navigation";
import { withTenantUser } from "@/lib/auth/guards";
import { isAppError } from "@/lib/errors";
import { getPayslipById, assertActorCanViewPayslip } from "@/lib/services/payroll-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { db } from "@/lib/db";
import { PayslipPrintButton } from "@/app/(protected)/payroll/payslips/[payslipId]/payslip-print-button";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ payslipId: string }>;
}) {
  const { payslipId } = await params;
  return withTenantUser(async (actor) => {
    let payslip;
    try {
      payslip = await getPayslipById(payslipId);
      await assertActorCanViewPayslip(actor, payslip);
    } catch (error) {
      if (isAppError(error)) notFound();
      throw error;
    }

    await recordAuditLog(db, {
      userId: actor.id,
      action: AuditAction.PAYSLIP_VIEWED,
      entityType: "Payslip",
      entityId: payslip.id,
    });

    const earnings = payslip.lineItems.filter((item) => item.type === "EARNING");
    const deductions = payslip.lineItems.filter((item) => item.type === "DEDUCTION");
    const employerContributions = payslip.lineItems.filter((item) => item.type === "EMPLOYER_CONTRIBUTION");

    return (
      <div className="mx-auto max-w-2xl space-y-6 print:max-w-full">
        <div className="flex items-center justify-between print:hidden">
          <h1 className="text-lg font-semibold text-foreground">Payslip</h1>
          <PayslipPrintButton />
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-lg font-semibold text-foreground">Excell Enterprises</p>
              <p className="text-sm text-muted-foreground">
                Payslip for {payslip.payrollPeriod.periodMonth}/{payslip.payrollPeriod.periodYear}
              </p>
            </div>
            <div className="text-right text-sm text-muted-foreground">
              <p>{employeeDisplayName(payslip.employee)}</p>
              <p>{payslip.employee.employeeNumber}</p>
            </div>
          </div>

          <PayslipSection title="Earnings" items={earnings} />
          <PayslipSection title="Deductions" items={deductions} />

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-base font-semibold text-foreground">
            <span>Net Pay</span>
            <span>${Number(payslip.netPay).toFixed(2)}</span>
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium text-muted-foreground">Employer contributions (not deducted from pay)</p>
            <PayslipSection title="" items={employerContributions} bare />
          </div>
        </div>
      </div>
    );
  });
}

function PayslipSection({
  title,
  items,
  bare,
}: {
  title: string;
  items: { id: string; label: string; amount: unknown }[];
  bare?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <div className={bare ? "" : "mb-4"}>
      {title ? <p className="mb-2 text-sm font-medium text-muted-foreground">{title}</p> : null}
      <div className="space-y-1.5 text-sm">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between">
            <span className="text-foreground">{item.label}</span>
            <span className="text-foreground">${Number(item.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
