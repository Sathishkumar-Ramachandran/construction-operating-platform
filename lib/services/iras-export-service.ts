import { db } from "@/lib/db";
import { employeeDisplayName } from "@/lib/hr/employee-display";
import { PayrollPeriodStatus } from "@/lib/payroll/constants";

/**
 * Generates a CSV export of annual employment income, aggregated per
 * employee, for manual submission to IRAS (Auto-Inclusion Scheme). This is
 * a starting point, NOT a byte-for-file verified against the current IRAS
 * AIS file specification — that spec is revised periodically and must be
 * checked before any real filing. Deliberately excludes the full NRIC/FIN
 * (only the last 4 digits are stored decryptable-at-rest in bulk; revealing
 * a full national ID is a one-employee-at-a-time, audited operation — see
 * revealSensitiveField in employee-service.ts) — fill that column in
 * manually from the employee profile before submitting.
 */
export async function generateIr8aExport(year: number): Promise<{ filename: string; content: string }> {
  const payslips = await db.payslip.findMany({
    where: {
      payrollPeriod: {
        periodYear: year,
        status: { in: [PayrollPeriodStatus.PAID, PayrollPeriodStatus.CLOSED] },
      },
    },
    include: {
      employee: { select: { employeeNumber: true, firstName: true, lastName: true, preferredName: true, nationalIdLast4: true } },
    },
  });

  const byEmployee = new Map<
    string,
    { employeeNumber: string; name: string; nricLast4: string | null; grossIncome: number; employeeCpf: number; employerCpf: number }
  >();

  for (const payslip of payslips) {
    const key = payslip.employeeId;
    const existing = byEmployee.get(key);
    const grossIncome = Number(payslip.grossPay);
    const employeeCpf = Number(payslip.employeeCpfAmount);
    const employerCpf = Number(payslip.employerCpfAmount);

    if (existing) {
      existing.grossIncome += grossIncome;
      existing.employeeCpf += employeeCpf;
      existing.employerCpf += employerCpf;
    } else {
      byEmployee.set(key, {
        employeeNumber: payslip.employee.employeeNumber,
        name: employeeDisplayName(payslip.employee),
        nricLast4: payslip.employee.nationalIdLast4,
        grossIncome,
        employeeCpf,
        employerCpf,
      });
    }
  }

  const header = [
    "Employee_Number",
    "Employee_Name",
    "NRIC_FIN_Last4",
    "Annual_Gross_Income",
    "Total_Employee_CPF",
    "Total_Employer_CPF",
  ];
  const rows = [...byEmployee.values()].map((row) => [
    row.employeeNumber,
    row.name,
    row.nricLast4 ?? "",
    row.grossIncome.toFixed(2),
    row.employeeCpf.toFixed(2),
    row.employerCpf.toFixed(2),
  ]);

  const content = [header, ...rows]
    .map((cols) => cols.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");

  return { filename: `ir8a-draft-${year}.csv`, content };
}
