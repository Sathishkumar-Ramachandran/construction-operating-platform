import { db, withTenant, currentCompanyId } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { generateSecureInitialPasswordFor } from "@/lib/services/password-generation-service";
import { ensureEmployeeNumberSequenceSeeded } from "@/lib/services/employee-number-service";
import { AppError, ErrorCode } from "@/lib/errors";
import {
  ALL_ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  UserRole,
} from "@/lib/authorization/roles";
import {
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/lib/authorization/permissions";
import {
  DEFAULT_EMPLOYMENT_TYPES,
  DEFAULT_PROJECT_ROLES,
  DEFAULT_DOCUMENT_TYPES,
  DEFAULT_LEAVE_TYPES,
  defaultDocumentTypeSeedRow,
} from "@/lib/hr/constants";
import { DEFAULT_CPF_CONTRIBUTION_RATES } from "@/lib/payroll/constants";
import { DEFAULT_WAREHOUSE_CODE } from "@/lib/erp/constants";

/** Every upsert-by-code helper below reads companyId from the active
 * withTenant context rather than taking it as a parameter — they're only
 * ever called from inside seedCompanyDefaults' withTenant wrapper, so
 * there's exactly one place that has to remember to scope, not a dozen. */

async function upsertRole(code: UserRole): Promise<{ id: string }> {
  const companyId = currentCompanyId();
  const existing = await db.role.findUnique({
    where: { companyId_code: { companyId, code } },
  });
  const data = {
    name: ROLE_LABELS[code],
    description: ROLE_DESCRIPTIONS[code],
    isSystemRole: true,
    isActive: true,
  };
  if (existing) return db.role.update({ where: { id: existing.id }, data });
  return db.role.create({ data: { code, ...data } });
}

async function seedRoles(): Promise<Map<string, { id: string }>> {
  const roles = new Map<string, { id: string }>();
  for (const code of ALL_ROLES) {
    roles.set(code, await upsertRole(code));
  }
  return roles;
}

async function upsertPermission(def: (typeof ALL_PERMISSIONS)[number]): Promise<{ id: string }> {
  const companyId = currentCompanyId();
  const existing = await db.permission.findUnique({
    where: { companyId_code: { companyId, code: def.code } },
  });
  const data = {
    module: def.module,
    resource: def.resource,
    action: def.action,
    description: def.description,
  };
  if (existing) return db.permission.update({ where: { id: existing.id }, data });
  return db.permission.create({ data: { code: def.code, ...data } });
}

async function seedPermissions(): Promise<Map<string, { id: string }>> {
  const permissions = new Map<string, { id: string }>();
  for (const def of ALL_PERMISSIONS) {
    permissions.set(def.code, await upsertPermission(def));
  }

  // Mirrors prisma/seed.ts's original cleanup: drop any permission rows for
  // this company that are no longer in ALL_PERMISSIONS (retired codes).
  const currentCodes = ALL_PERMISSIONS.map((p) => p.code);
  await db.permission.deleteMany({ where: { code: { notIn: currentCodes } } });

  return permissions;
}

async function seedRolePermissions(
  roles: Map<string, { id: string }>,
  permissions: Map<string, { id: string }>
): Promise<void> {
  for (const roleCode of ALL_ROLES) {
    const role = roles.get(roleCode);
    if (!role) continue;

    const codes = DEFAULT_ROLE_PERMISSIONS[roleCode];
    for (const permissionCode of codes) {
      const permission = permissions.get(permissionCode);
      if (!permission) continue;

      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id, allowed: true },
        update: { allowed: true },
      });
    }
  }
}

async function seedEmploymentTypes(): Promise<void> {
  const companyId = currentCompanyId();
  for (const entry of DEFAULT_EMPLOYMENT_TYPES) {
    await db.employmentType.upsert({
      where: { companyId_code: { companyId, code: entry.code } },
      create: { code: entry.code, name: entry.name },
      update: { name: entry.name },
    });
  }
}

async function seedProjectRoles(): Promise<void> {
  const companyId = currentCompanyId();
  for (const entry of DEFAULT_PROJECT_ROLES) {
    await db.projectRole.upsert({
      where: { companyId_code: { companyId, code: entry.code } },
      create: { code: entry.code, name: entry.name },
      update: { name: entry.name },
    });
  }
}

async function seedDocumentTypes(): Promise<void> {
  const companyId = currentCompanyId();
  for (const entry of DEFAULT_DOCUMENT_TYPES) {
    const row = defaultDocumentTypeSeedRow(entry);
    await db.documentType.upsert({
      where: { companyId_code: { companyId, code: row.code } },
      create: row,
      update: row,
    });
  }
}

async function seedLeaveTypes(): Promise<void> {
  const companyId = currentCompanyId();
  for (const entry of DEFAULT_LEAVE_TYPES) {
    await db.leaveType.upsert({
      where: { companyId_code: { companyId, code: entry.code } },
      create: {
        code: entry.code,
        name: entry.name,
        defaultEntitlementDays: entry.defaultEntitlementDays,
        isPaid: entry.isPaid,
      },
      update: {
        name: entry.name,
        defaultEntitlementDays: entry.defaultEntitlementDays,
        isPaid: entry.isPaid,
      },
    });
  }
}

/** Only seeds the starter CPF schedule if this company has none yet — once
 * an admin edits rates via Payroll settings, re-running this must never
 * clobber their edits. */
async function seedCpfContributionRates(): Promise<void> {
  const existingCount = await db.cpfContributionRate.count();
  if (existingCount > 0) return;

  await db.cpfContributionRate.createMany({
    data: DEFAULT_CPF_CONTRIBUTION_RATES.map((rate) => ({
      ageBandLabel: rate.ageBandLabel,
      minAge: rate.minAge,
      maxAge: rate.maxAge,
      wageCeiling: rate.wageCeiling,
      employeeRate: rate.employeeRate,
      employerRate: rate.employerRate,
      effectiveFrom: new Date("2024-01-01"),
    })),
  });
}

/** Every stock ledger row needs a warehouseId — a single MAIN warehouse
 * lets a fresh company create resource requests/POs immediately, without
 * forcing every new company to set up a warehouse by hand first. */
async function seedDefaultWarehouse(): Promise<void> {
  const companyId = currentCompanyId();
  await db.warehouse.upsert({
    where: { companyId_code: { companyId, code: DEFAULT_WAREHOUSE_CODE } },
    create: { code: DEFAULT_WAREHOUSE_CODE, name: "Main Warehouse", isActive: true },
    update: {},
  });
}

/**
 * Single source of truth for "what a brand-new company starts with" —
 * called both by `prisma/seed.ts` (for the first, bootstrap company) and
 * by the Platform Admin control panel (for every company created after
 * that). Must never drift between the two call sites, which is exactly
 * why this lives in one shared function instead of being duplicated.
 *
 * Idempotent (safe to re-run against the same company): every step
 * upserts or checks-before-creating, matching the existing prisma/seed.ts
 * convention this was extracted from.
 */
export async function seedCompanyDefaults(companyId: string): Promise<void> {
  await withTenant(companyId, async () => {
    const roles = await seedRoles();
    const permissions = await seedPermissions();
    await seedRolePermissions(roles, permissions);
    await seedEmploymentTypes();
    await seedProjectRoles();
    await seedDocumentTypes();
    await seedLeaveTypes();
    await seedDefaultWarehouse();
    await seedCpfContributionRates();
    await ensureEmployeeNumberSequenceSeeded(companyId);
  });
}

export type ProvisionFirstAdminInput = {
  name: string;
  email: string;
};

export type ProvisionFirstAdminResult = {
  userId: string;
  email: string;
  temporaryPassword: string;
};

/**
 * Creates a company's very first User (role ADMIN, must change password on
 * first login) — the account a Platform Admin hands to a new company so
 * they can sign in and take over from there. Deliberately NOT built on top
 * of user-service.ts's `createUser`, which requires an already-authenticated
 * `actor: AuthenticatedUser` to authorize against (assertCanCreateUser,
 * audit log `userId`) — there is no such actor yet for a company's first
 * user, and fabricating one would be worse than a small purpose-built
 * function. Call only after `seedCompanyDefaults` has run for this company
 * (the ADMIN role must already exist).
 */
export async function provisionFirstAdminUser(
  companyId: string,
  input: ProvisionFirstAdminInput
): Promise<ProvisionFirstAdminResult> {
  return withTenant(companyId, async () => {
    const adminRole = await db.role.findUnique({
      where: { companyId_code: { companyId, code: UserRole.ADMIN } },
    });
    if (!adminRole) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        "Company defaults have not been seeded yet — no ADMIN role exists."
      );
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await db.user.findUnique({
      where: { companyId_email: { companyId, email: normalizedEmail } },
      select: { id: true },
    });
    if (existing) {
      throw new AppError(ErrorCode.USER_EMAIL_ALREADY_EXISTS);
    }

    const temporaryPassword = generateSecureInitialPasswordFor([input.name, normalizedEmail]);
    const passwordHash = await hashPassword(temporaryPassword);

    const user = await db.user.create({
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
        passwordHash,
        roleId: adminRole.id,
        isActive: true,
        mustChangePassword: true,
      },
    });

    return { userId: user.id, email: normalizedEmail, temporaryPassword };
  });
}
