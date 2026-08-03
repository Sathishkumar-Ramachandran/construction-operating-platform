import { rawDb } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import {
  seedCompanyDefaults,
  provisionFirstAdminUser,
  type ProvisionFirstAdminInput,
  type ProvisionFirstAdminResult,
} from "@/lib/services/company-provisioning-service";

export async function listCompanies() {
  return rawDb.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, employees: true, projects: true } } },
  });
}

export async function getCompanyById(id: string) {
  const company = await rawDb.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, employees: true, projects: true } },
      users: {
        select: { id: true, name: true, email: true, isActive: true, role: { select: { code: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!company) throw new AppError(ErrorCode.COMPANY_NOT_FOUND);
  return company;
}

export type CreateCompanyInput = {
  name: string;
  slug: string;
  code?: string | null;
};

/**
 * Creates the Company row, then seeds it with the exact same defaults as
 * the bootstrap company (prisma/seed.ts) via seedCompanyDefaults — the one
 * shared source of truth so a company created here can never drift from
 * one created at initial deploy time.
 */
export async function createCompany(
  platformAdminId: string,
  input: CreateCompanyInput
) {
  const slug = input.slug.trim().toLowerCase();
  const existing = await rawDb.company.findUnique({ where: { slug } });
  if (existing) throw new AppError(ErrorCode.COMPANY_SLUG_ALREADY_EXISTS);

  const company = await rawDb.company.create({
    data: {
      name: input.name.trim(),
      slug,
      code: input.code?.trim() || null,
      isActive: true,
    },
  });

  await seedCompanyDefaults(company.id);

  // userId is left null — AuditLog.userId has a real FK to User(id), and a
  // Platform Admin is a different table entirely (never a User row), so
  // the acting identity goes in metadata instead.
  await recordAuditLog(rawDb, {
    action: AuditAction.MASTER_DATA_CREATED,
    entityType: "Company",
    entityId: company.id,
    afterData: { name: company.name, slug: company.slug },
    metadata: { platformAdminId },
  });

  return company;
}

/**
 * Deactivating a company blocks new logins immediately (auth-service.ts's
 * authenticateUser checks company.isActive) and invalidates every already
 * -live session on its very next request (getSessionUser re-checks
 * company.isActive on every call) — no separate session-revocation step
 * needed here.
 */
export async function setCompanyActive(
  platformAdminId: string,
  companyId: string,
  isActive: boolean
) {
  const company = await rawDb.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError(ErrorCode.COMPANY_NOT_FOUND);

  const updated = await rawDb.company.update({
    where: { id: companyId },
    data: { isActive },
  });

  await recordAuditLog(rawDb, {
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "Company",
    entityId: companyId,
    afterData: { isActive },
    metadata: { platformAdminId },
  });

  return updated;
}

export async function provisionCompanyFirstAdmin(
  platformAdminId: string,
  companyId: string,
  input: ProvisionFirstAdminInput
): Promise<ProvisionFirstAdminResult> {
  const company = await rawDb.company.findUnique({ where: { id: companyId } });
  if (!company) throw new AppError(ErrorCode.COMPANY_NOT_FOUND);

  const result = await provisionFirstAdminUser(companyId, input);

  await recordAuditLog(rawDb, {
    action: AuditAction.USER_CREATED,
    entityType: "User",
    entityId: result.userId,
    afterData: { email: result.email, companyId },
    metadata: { platformAdminId },
  });

  return result;
}
