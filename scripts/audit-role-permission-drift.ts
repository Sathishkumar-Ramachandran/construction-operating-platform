import "dotenv/config";
import { db } from "@/lib/db";
import { ALL_ROLES, UserRole } from "@/lib/authorization/roles";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/authorization/permissions";

/**
 * Read-only report of drift between the live `RolePermission` table and
 * `DEFAULT_ROLE_PERMISSIONS`. Run with `npx tsx scripts/audit-role-permission-drift.ts`
 * before re-running `db:seed` against a database that may have manual edits.
 */
async function main() {
  const roles = await db.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
  });

  let anyDrift = false;

  for (const roleCode of ALL_ROLES) {
    const role = roles.find((r) => r.code === roleCode);
    if (!role) {
      console.log(`[${roleCode}] role not found in DB`);
      continue;
    }
    const livePermissionCodes = new Set(
      role.rolePermissions.filter((rp) => rp.allowed).map((rp) => rp.permission.code)
    );
    const defaultCodes = new Set(DEFAULT_ROLE_PERMISSIONS[roleCode as UserRole]);

    const extra = [...livePermissionCodes].filter((c) => !defaultCodes.has(c));
    const missing = [...defaultCodes].filter((c) => !livePermissionCodes.has(c));

    if (extra.length === 0 && missing.length === 0) {
      console.log(`[${roleCode}] OK — matches DEFAULT_ROLE_PERMISSIONS (${livePermissionCodes.size} perms)`);
    } else {
      anyDrift = true;
      console.log(`[${roleCode}] DRIFT DETECTED`);
      if (extra.length) console.log(`  EXTRA (live has, default doesn't): ${extra.join(", ")}`);
      if (missing.length) console.log(`  MISSING (default has, live doesn't): ${missing.join(", ")}`);
    }
  }

  if (anyDrift) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
