import "dotenv/config";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
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
  defaultDocumentTypeSeedRow,
} from "@/lib/hr/constants";
import { ensureEmployeeNumberSequenceSeeded } from "@/lib/services/employee-number-service";

async function seedRoles() {
  const roles = new Map<string, { id: string }>();

  for (const code of ALL_ROLES) {
    const role = await db.role.upsert({
      where: { code },
      create: {
        code,
        name: ROLE_LABELS[code],
        description: ROLE_DESCRIPTIONS[code],
        isSystemRole: true,
        isActive: true,
      },
      update: {
        name: ROLE_LABELS[code],
        description: ROLE_DESCRIPTIONS[code],
        isSystemRole: true,
        isActive: true,
      },
    });
    roles.set(code, role);
  }

  console.log(`Seeded ${roles.size} roles.`);
  return roles;
}

async function seedPermissions() {
  const permissions = new Map<string, { id: string }>();

  for (const def of ALL_PERMISSIONS) {
    const permission = await db.permission.upsert({
      where: { code: def.code },
      create: {
        code: def.code,
        module: def.module,
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
      update: {
        module: def.module,
        resource: def.resource,
        action: def.action,
        description: def.description,
      },
    });
    permissions.set(def.code, permission);
  }

  console.log(`Seeded ${permissions.size} permissions.`);
  return permissions;
}

async function seedRolePermissions(
  roles: Map<string, { id: string }>,
  permissions: Map<string, { id: string }>
) {
  let count = 0;

  for (const roleCode of ALL_ROLES) {
    const role = roles.get(roleCode);
    if (!role) continue;

    const codes = DEFAULT_ROLE_PERMISSIONS[roleCode];
    for (const permissionCode of codes) {
      const permission = permissions.get(permissionCode);
      if (!permission) continue;

      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        create: { roleId: role.id, permissionId: permission.id, allowed: true },
        update: { allowed: true },
      });
      count += 1;
    }
  }

  console.log(`Seeded ${count} role-permission mappings.`);
}

async function seedSuperAdmin(roles: Map<string, { id: string }>) {
  const superAdminRole = roles.get(UserRole.SUPER_ADMIN);
  if (!superAdminRole) {
    throw new Error("SUPER_ADMIN role was not seeded.");
  }

  const normalizedEmail = env.SEED_SUPER_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    await db.user.update({
      where: { id: existing.id },
      data: { roleId: superAdminRole.id, isActive: true },
    });
    console.log(`Super Admin already exists (${normalizedEmail}); role/active status ensured.`);
    return;
  }

  const passwordHash = await hashPassword(env.SEED_SUPER_ADMIN_PASSWORD);
  await db.user.create({
    data: {
      name: env.SEED_SUPER_ADMIN_NAME,
      email: normalizedEmail,
      passwordHash,
      roleId: superAdminRole.id,
      isActive: true,
      mustChangePassword: false,
    },
  });
  console.log(`Created initial Super Admin (${normalizedEmail}).`);
}

async function seedEmploymentTypes() {
  for (const entry of DEFAULT_EMPLOYMENT_TYPES) {
    await db.employmentType.upsert({
      where: { code: entry.code },
      create: { code: entry.code, name: entry.name },
      update: { name: entry.name },
    });
  }
  console.log(`Seeded ${DEFAULT_EMPLOYMENT_TYPES.length} employment types.`);
}

async function seedProjectRoles() {
  for (const entry of DEFAULT_PROJECT_ROLES) {
    await db.projectRole.upsert({
      where: { code: entry.code },
      create: { code: entry.code, name: entry.name },
      update: { name: entry.name },
    });
  }
  console.log(`Seeded ${DEFAULT_PROJECT_ROLES.length} project roles.`);
}

async function seedDocumentTypes() {
  for (const entry of DEFAULT_DOCUMENT_TYPES) {
    const row = defaultDocumentTypeSeedRow(entry);
    await db.documentType.upsert({
      where: { code: row.code },
      create: row,
      update: row,
    });
  }
  console.log(`Seeded ${DEFAULT_DOCUMENT_TYPES.length} document types.`);
}

async function main() {
  const roles = await seedRoles();
  const permissions = await seedPermissions();
  await seedRolePermissions(roles, permissions);
  await seedSuperAdmin(roles);
  await seedEmploymentTypes();
  await seedProjectRoles();
  await seedDocumentTypes();
  await ensureEmployeeNumberSequenceSeeded();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
