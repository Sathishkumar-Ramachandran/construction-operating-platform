import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { EmploymentStatus } from "@/lib/hr/constants";
import {
  PayrollPeriodStatus,
  PAYROLL_PERIOD_STATUS_TRANSITIONS,
  DisbursementStatus,
  CompensationComponentType,
  PayslipLineItemType,
  SDL_RATE,
  SDL_MIN_AMOUNT,
  SDL_MAX_AMOUNT,
} from "@/lib/payroll/constants";
import { computeCpfContribution } from "@/lib/services/cpf-computation-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { ApprovalModule, registerApprovalModule } from "@/lib/services/approval-registry";
import * as approvalService from "@/lib/services/approval-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import type {
  SetSalaryStructureInput,
  CreatePayrollPeriodInput,
} from "@/lib/validation/payroll";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

function isPeriodStatusTransitionAllowed(
  from: PayrollPeriodStatus,
  to: PayrollPeriodStatus
): boolean {
  return PAYROLL_PERIOD_STATUS_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// Salary structures
// ---------------------------------------------------------------------------

export async function getSalaryStructureForEmployee(employeeId: string) {
  return db.salaryStructure.findUnique({
    where: { employeeId },
    include: { components: { orderBy: { createdAt: "asc" } } },
  });
}

/** Full replace-on-write: components are always the complete current set,
 * not a diff — matches how the employee document checklist treats its
 * requirement rows (small, admin-managed sets, easier to reason about as a
 * whole than to patch incrementally). */
export async function setSalaryStructure(
  actor: AuthenticatedUser,
  input: SetSalaryStructureInput,
  meta: ActorMeta = {}
) {
  const employee = await db.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new AppError(ErrorCode.EMPLOYEE_NOT_FOUND);

  const structure = await db.$transaction(async (tx) => {
    const saved = await tx.salaryStructure.upsert({
      where: { employeeId: input.employeeId },
      create: {
        employeeId: input.employeeId,
        basicMonthlySalary: input.basicMonthlySalary,
        effectiveFrom: new Date(input.effectiveFrom),
        cpfApplicable: input.cpfApplicable,
        createdBy: actor.id,
      },
      update: {
        basicMonthlySalary: input.basicMonthlySalary,
        effectiveFrom: new Date(input.effectiveFrom),
        cpfApplicable: input.cpfApplicable,
      },
    });

    await tx.compensationComponent.deleteMany({ where: { salaryStructureId: saved.id } });
    if (input.components.length > 0) {
      await tx.compensationComponent.createMany({
        data: input.components.map((component) => ({
          salaryStructureId: saved.id,
          type: component.type,
          code: component.code,
          label: component.label,
          amount: component.amount,
          isRecurring: component.isRecurring,
        })),
      });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.SALARY_STRUCTURE_SET,
      entityType: "SalaryStructure",
      entityId: saved.id,
      afterData: { employeeId: input.employeeId, basicMonthlySalary: input.basicMonthlySalary },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return saved;
  });

  return structure;
}

// ---------------------------------------------------------------------------
// Payroll periods
// ---------------------------------------------------------------------------

export async function listPayrollPeriods() {
  return db.payrollPeriod.findMany({
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    include: { _count: { select: { payslips: true } } },
  });
}

export async function getPayrollPeriodById(id: string) {
  const period = await db.payrollPeriod.findUnique({
    where: { id },
    include: {
      payslips: {
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, preferredName: true, employeeNumber: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!period) throw new AppError(ErrorCode.PAYROLL_PERIOD_NOT_FOUND);
  return period;
}

export async function createPayrollPeriod(
  actor: AuthenticatedUser,
  input: CreatePayrollPeriodInput,
  meta: ActorMeta = {}
) {
  const existing = await db.payrollPeriod.findUnique({
    where: { periodYear_periodMonth: { periodYear: input.periodYear, periodMonth: input.periodMonth } },
  });
  if (existing) throw new AppError(ErrorCode.PAYROLL_PERIOD_ALREADY_EXISTS);

  const period = await db.payrollPeriod.create({
    data: {
      periodYear: input.periodYear,
      periodMonth: input.periodMonth,
      cutoffDate: new Date(input.cutoffDate),
      status: PayrollPeriodStatus.OPEN,
      createdBy: actor.id,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.PAYROLL_PERIOD_CREATED,
    entityType: "PayrollPeriod",
    entityId: period.id,
    afterData: { periodYear: input.periodYear, periodMonth: input.periodMonth },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return period;
}

function sdlFor(grossPay: number): number {
  if (grossPay <= 0) return 0;
  const base = Math.min(grossPay, 4500);
  const raw = base * SDL_RATE;
  return Math.min(Math.max(raw, SDL_MIN_AMOUNT), SDL_MAX_AMOUNT);
}

/**
 * Computes and writes a Payslip (+ line items) for every ACTIVE employee
 * who has a SalaryStructure, then submits the run for approval via the
 * generic approval engine. One transaction per employee — a single
 * transaction spanning the whole workforce risks the same interactive-
 * transaction timeout seen with long sequential test runs against a remote
 * pooled Postgres connection.
 *
 * Simplifications disclosed rather than silently assumed: no proration for
 * mid-month joiners/leavers; CompensationComponents apply to every run they
 * are attached to regardless of isRecurring (that flag is an HR-facing hint
 * to remove one-off components after a run, not an automatic per-period
 * gate — there is no period-scoped adjustments model yet).
 */
export async function processPayrollRun(
  actor: AuthenticatedUser,
  periodId: string,
  meta: ActorMeta = {}
) {
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new AppError(ErrorCode.PAYROLL_PERIOD_NOT_FOUND);
  if (
    !isPeriodStatusTransitionAllowed(
      period.status as PayrollPeriodStatus,
      PayrollPeriodStatus.PROCESSING
    )
  ) {
    throw new AppError(ErrorCode.PAYROLL_PERIOD_INVALID_STATUS_TRANSITION);
  }

  const employees = await db.employee.findMany({
    where: { employmentStatus: EmploymentStatus.ACTIVE, salaryStructure: { isNot: null } },
    include: { salaryStructure: { include: { components: true } } },
  });
  if (employees.length === 0) {
    throw new AppError(ErrorCode.PAYROLL_NO_ACTIVE_EMPLOYEES);
  }

  await db.payrollPeriod.update({
    where: { id: periodId },
    data: { status: PayrollPeriodStatus.PROCESSING },
  });

  const periodStart = new Date(Date.UTC(period.periodYear, period.periodMonth - 1, 1));
  const periodEnd = new Date(Date.UTC(period.periodYear, period.periodMonth, 0));
  const daysInMonth = periodEnd.getUTCDate();

  for (const employee of employees) {
    const structure = employee.salaryStructure!;
    const basicPay = Number(structure.basicMonthlySalary);
    const dailyRate = basicPay / daysInMonth;

    const absentDays = await db.attendanceRecord.count({
      where: {
        employeeId: employee.id,
        date: { gte: periodStart, lte: periodEnd },
        status: "ABSENT",
      },
    });
    const unpaidLeaveDeduction = Math.round(dailyRate * absentDays * 100) / 100;

    const earningComponents = structure.components.filter(
      (c) => c.type === CompensationComponentType.ALLOWANCE || c.type === CompensationComponentType.BONUS
    );
    const deductionComponents = structure.components.filter(
      (c) => c.type === CompensationComponentType.DEDUCTION
    );
    const totalAllowances = earningComponents.reduce((sum, c) => sum + Number(c.amount), 0);
    const componentDeductions = deductionComponents.reduce((sum, c) => sum + Number(c.amount), 0);
    const totalDeductions = componentDeductions + unpaidLeaveDeduction;
    const grossPay = basicPay + totalAllowances;

    const { employeeCpfAmount, employerCpfAmount } = await computeCpfContribution(
      grossPay,
      employee.dateOfBirth,
      periodEnd,
      structure.cpfApplicable
    );
    const sdlAmount = sdlFor(grossPay);
    const netPay = grossPay - totalDeductions - employeeCpfAmount;

    const primaryBankAccount = await db.employeeBankAccount.findFirst({
      where: { employeeId: employee.id, isPrimary: true },
      orderBy: { effectiveFrom: "desc" },
    });

    await db.$transaction(async (tx) => {
      const lineItems = [
        { type: PayslipLineItemType.EARNING, label: "Basic Pay", amount: basicPay },
        ...earningComponents.map((c) => ({
          type: PayslipLineItemType.EARNING,
          label: c.label,
          amount: Number(c.amount),
        })),
        ...deductionComponents.map((c) => ({
          type: PayslipLineItemType.DEDUCTION,
          label: c.label,
          amount: Number(c.amount),
        })),
        ...(unpaidLeaveDeduction > 0
          ? [
              {
                type: PayslipLineItemType.DEDUCTION,
                label: `Unpaid Leave (${absentDays} day${absentDays === 1 ? "" : "s"})`,
                amount: unpaidLeaveDeduction,
              },
            ]
          : []),
        { type: PayslipLineItemType.EMPLOYER_CONTRIBUTION, label: "Employer CPF", amount: employerCpfAmount },
        { type: PayslipLineItemType.EMPLOYER_CONTRIBUTION, label: "SDL", amount: sdlAmount },
      ];

      const payslip = await tx.payslip.upsert({
        where: { payrollPeriodId_employeeId: { payrollPeriodId: periodId, employeeId: employee.id } },
        create: {
          payrollPeriodId: periodId,
          employeeId: employee.id,
          basicPay,
          totalAllowances,
          totalDeductions,
          grossPay,
          employeeCpfAmount,
          employerCpfAmount,
          sdlAmount,
          netPay,
          paidToBankAccountId: primaryBankAccount?.id ?? null,
          disbursementStatus: DisbursementStatus.PENDING,
        },
        update: {
          basicPay,
          totalAllowances,
          totalDeductions,
          grossPay,
          employeeCpfAmount,
          employerCpfAmount,
          sdlAmount,
          netPay,
          paidToBankAccountId: primaryBankAccount?.id ?? null,
        },
      });

      await tx.payslipLineItem.deleteMany({ where: { payslipId: payslip.id } });
      await tx.payslipLineItem.createMany({
        data: lineItems.map((item) => ({ ...item, payslipId: payslip.id })),
      });
    });
  }

  const approvalRequest = await approvalService.createApprovalRequest(actor, {
    module: ApprovalModule.PAYROLL_RUN,
    entityType: "PayrollPeriod",
    entityId: periodId,
    payload: { periodId, periodYear: period.periodYear, periodMonth: period.periodMonth },
  });

  const updated = await db.payrollPeriod.update({
    where: { id: periodId },
    data: { status: PayrollPeriodStatus.PENDING_APPROVAL, approvalRequestId: approvalRequest.id },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.PAYROLL_RUN_PROCESSED,
    entityType: "PayrollPeriod",
    entityId: periodId,
    afterData: { employeeCount: employees.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

/** Marks each payslip's disbursement outcome based on whether the employee
 * has a bank account on file, then moves the period to PAID. This records
 * that disbursement happened — it does not itself move money; the actual
 * bank transfer/GIRO is executed outside the system using the payslip data
 * (a bank-file export is a natural follow-up, not built in this phase). */
export async function disbursePayslips(
  actor: AuthenticatedUser,
  periodId: string,
  meta: ActorMeta = {}
) {
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new AppError(ErrorCode.PAYROLL_PERIOD_NOT_FOUND);
  if (
    !isPeriodStatusTransitionAllowed(period.status as PayrollPeriodStatus, PayrollPeriodStatus.PAID)
  ) {
    throw new AppError(ErrorCode.PAYROLL_PERIOD_INVALID_STATUS_TRANSITION);
  }

  const payslips = await db.payslip.findMany({ where: { payrollPeriodId: periodId } });
  for (const payslip of payslips) {
    await db.payslip.update({
      where: { id: payslip.id },
      data: {
        disbursementStatus: payslip.paidToBankAccountId
          ? DisbursementStatus.DISBURSED
          : DisbursementStatus.FAILED,
      },
    });
  }

  const updated = await db.payrollPeriod.update({
    where: { id: periodId },
    data: { status: PayrollPeriodStatus.PAID, payDate: new Date() },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.PAYSLIP_DISBURSED,
    entityType: "PayrollPeriod",
    entityId: periodId,
    afterData: { payslipCount: payslips.length },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}

export async function closePayrollPeriod(actor: AuthenticatedUser, periodId: string) {
  const period = await db.payrollPeriod.findUnique({ where: { id: periodId } });
  if (!period) throw new AppError(ErrorCode.PAYROLL_PERIOD_NOT_FOUND);
  if (
    !isPeriodStatusTransitionAllowed(period.status as PayrollPeriodStatus, PayrollPeriodStatus.CLOSED)
  ) {
    throw new AppError(ErrorCode.PAYROLL_PERIOD_INVALID_STATUS_TRANSITION);
  }
  return db.payrollPeriod.update({ where: { id: periodId }, data: { status: PayrollPeriodStatus.CLOSED } });
}

// ---------------------------------------------------------------------------
// Payslips
// ---------------------------------------------------------------------------

export async function getPayslipById(id: string) {
  const payslip = await db.payslip.findUnique({
    where: { id },
    include: {
      lineItems: true,
      employee: { select: { id: true, userId: true, firstName: true, lastName: true, preferredName: true, employeeNumber: true } },
      payrollPeriod: { select: { periodMonth: true, periodYear: true, payDate: true } },
    },
  });
  if (!payslip) throw new AppError(ErrorCode.PAYSLIP_NOT_FOUND);
  return payslip;
}

/** Owner (via linked Employee.userId) or a PAYROLL_PAYSLIPS_VIEW_ALL holder
 * may view a payslip — same "self or elevated permission" shape as
 * getEmployeeById's access-level resolution. */
export async function assertActorCanViewPayslip(
  actor: AuthenticatedUser,
  payslip: { employee: { userId: string | null } }
) {
  if (payslip.employee.userId === actor.id) return;
  if (await hasPermission(actor, PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_ALL.code)) return;
  throw new AppError(ErrorCode.PAYSLIP_NOT_AUTHORIZED);
}

export async function listPayslipsForEmployee(employeeId: string) {
  return db.payslip.findMany({
    where: { employeeId },
    include: { payrollPeriod: { select: { periodMonth: true, periodYear: true, status: true } } },
    orderBy: [{ payrollPeriod: { periodYear: "desc" } }, { payrollPeriod: { periodMonth: "desc" } }],
  });
}

registerApprovalModule(ApprovalModule.PAYROLL_RUN, {
  async resolveApprovers() {
    // PAYROLL.RUNS.APPROVE is Admin/Super-Admin only by design (segregation
    // of duties: whoever ran the payroll should not also approve it) —
    // hasRole's SUPER_ADMIN bypass means an ADMIN-role pool covers both.
    return [{ stepOrder: 1, approverRole: UserRole.ADMIN }];
  },

  async onApproved(tx, request) {
    await tx.payrollPeriod.update({
      where: { id: request.entityId },
      data: { status: PayrollPeriodStatus.APPROVED },
    });
  },

  async onRejected(tx, request) {
    // Sent back to OPEN (not left stuck in PENDING_APPROVAL) so HR can
    // correct salary structures/components and resubmit — same
    // resubmit-after-rejection shape as the project stage-gate handover.
    await tx.payrollPeriod.update({
      where: { id: request.entityId },
      data: { status: PayrollPeriodStatus.OPEN, approvalRequestId: null },
    });
  },
});
