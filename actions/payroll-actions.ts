"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import {
  setSalaryStructureSchema,
  createPayrollPeriodSchema,
  cpfContributionRateSchema,
} from "@/lib/validation/payroll";
import * as payrollService from "@/lib/services/payroll-service";
import { generateIr8aExport } from "@/lib/services/iras-export-service";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { db } from "@/lib/db";
import { isAppError } from "@/lib/errors";
import type { ActionResult } from "@/actions/user-actions";

async function getRequestMeta() {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  return {
    ipAddress: forwardedFor ? forwardedFor.split(",")[0].trim() : null,
    userAgent: headerList.get("user-agent"),
  };
}

export async function setSalaryStructureAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE.code, async (actor) => {
    const parsed = setSalaryStructureSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    try {
      const structure = await payrollService.setSalaryStructure(actor, parsed.data, await getRequestMeta());
      revalidatePath(`/employees/${parsed.data.employeeId}`);
      revalidatePath("/payroll/settings");
      return { ok: true, data: structure };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function createPayrollPeriodAction(input: unknown): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PAYROLL_RUNS_MANAGE.code, async (actor) => {
    const parsed = createPayrollPeriodSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    try {
      const period = await payrollService.createPayrollPeriod(actor, parsed.data, await getRequestMeta());
      revalidatePath("/payroll");
      return { ok: true, data: period };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function processPayrollRunAction(periodId: string): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PAYROLL_RUNS_MANAGE.code, async (actor) => {
    try {
      const period = await payrollService.processPayrollRun(actor, periodId, await getRequestMeta());
      revalidatePath(`/payroll/${periodId}`);
      revalidatePath("/payroll");
      return { ok: true, data: period };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function disbursePayslipsAction(periodId: string): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PAYROLL_RUNS_MANAGE.code, async (actor) => {
    try {
      const period = await payrollService.disbursePayslips(actor, periodId, await getRequestMeta());
      revalidatePath(`/payroll/${periodId}`);
      revalidatePath("/payroll");
      return { ok: true, data: period };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function closePayrollPeriodAction(periodId: string): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PAYROLL_RUNS_MANAGE.code, async (actor) => {
    try {
      const period = await payrollService.closePayrollPeriod(actor, periodId);
      revalidatePath(`/payroll/${periodId}`);
      revalidatePath("/payroll");
      return { ok: true, data: period };
    } catch (error) {
      if (isAppError(error)) return { ok: false, message: error.message };
      throw error;
    }
  });
}

export async function setCpfContributionRateAction(
  rateId: string | null,
  input: unknown
): Promise<ActionResult> {
  return withTenantPermission(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE.code, async (actor) => {
    const parsed = cpfContributionRateSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." };
    }
    const data = {
      ageBandLabel: parsed.data.ageBandLabel,
      minAge: parsed.data.minAge,
      maxAge: parsed.data.maxAge === "" || parsed.data.maxAge === undefined ? null : parsed.data.maxAge,
      wageCeiling: parsed.data.wageCeiling,
      employeeRate: parsed.data.employeeRate,
      employerRate: parsed.data.employerRate,
      effectiveFrom: new Date(parsed.data.effectiveFrom),
    };
    const rate = rateId
      ? await db.cpfContributionRate.update({ where: { id: rateId }, data })
      : await db.cpfContributionRate.create({ data });

    await recordAuditLog(db, {
      userId: actor.id,
      action: AuditAction.MASTER_DATA_UPDATED,
      entityType: "CpfContributionRate",
      entityId: rate.id,
      afterData: { ageBandLabel: data.ageBandLabel },
    });

    revalidatePath("/payroll/settings");
    return { ok: true, data: rate };
  });
}

export async function exportIr8aAction(year: number): Promise<ActionResult<{ filename: string; content: string }>> {
  return withTenantPermission(PERMISSIONS.PAYROLL_STATUTORY_EXPORT.code, async (actor) => {
    const result = await generateIr8aExport(year);
    await recordAuditLog(db, {
      userId: actor.id,
      action: AuditAction.PAYROLL_STATUTORY_EXPORTED,
      entityType: "PayrollPeriod",
      afterData: { year },
    });
    return { ok: true, data: result };
  });
}
