import "dotenv/config";
import { rawDb, db, withTenant } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/auth/password";
import { UserRole } from "@/lib/authorization/roles";
import { seedCompanyDefaults } from "@/lib/services/company-provisioning-service";

type SeedUserInput = { name: string; email: string; role: UserRole };
type SeedCompanyInput = { name: string; slug: string; users: SeedUserInput[] };

/**
 * The platform's seeded companies. Every company after these can be created
 * via the Platform Admin control panel (/platform-admin), which calls the
 * exact same seedCompanyDefaults() this script uses.
 */
const COMPANIES: SeedCompanyInput[] = [
  {
    name: "Excell Enterprise",
    slug: "excell-enterprise",
    users: [
      { name: "Krish", email: "krish@excellenterprise.com.sg", role: UserRole.SUPER_ADMIN },
      { name: "HR", email: "hr@excellenterprise.com.sg", role: UserRole.HR },
    ],
  },
  {
    name: "Accessplus",
    slug: "accessplus",
    users: [
      { name: "Krish", email: "krish@accessplus.com.sg", role: UserRole.SUPER_ADMIN },
      { name: "HR", email: "hr@accessplus.com.sg", role: UserRole.HR },
    ],
  },
];

async function seedCompany(input: SeedCompanyInput): Promise<{ id: string }> {
  const company = await rawDb.company.upsert({
    where: { slug: input.slug },
    create: { name: input.name, slug: input.slug, isActive: true },
    update: { name: input.name, isActive: true },
  });
  console.log(`Company ready: ${company.name} (${company.id}).`);
  return company;
}

/** Every seeded user shares SEED_SUPER_ADMIN_PASSWORD as its initial
 * password (documented in the User Guide) — change it after first login. */
async function seedCompanyUser(companyId: string, input: SeedUserInput): Promise<void> {
  await withTenant(companyId, async () => {
    const role = await db.role.findUnique({
      where: { companyId_code: { companyId, code: input.role } },
    });
    if (!role) {
      throw new Error(`${input.role} role was not seeded for company ${companyId}.`);
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const existing = await db.user.findUnique({
      where: { companyId_email: { companyId, email: normalizedEmail } },
    });

    if (existing) {
      await db.user.update({
        where: { id: existing.id },
        data: { roleId: role.id, isActive: true },
      });
      console.log(`User already exists (${normalizedEmail}); role/active status ensured.`);
      return;
    }

    const passwordHash = await hashPassword(env.SEED_SUPER_ADMIN_PASSWORD);
    await db.user.create({
      data: {
        name: input.name,
        email: normalizedEmail,
        passwordHash,
        roleId: role.id,
        isActive: true,
        mustChangePassword: false,
      },
    });
    console.log(`Created user (${normalizedEmail}) as ${input.role}.`);
  });
}

/** The cross-tenant Platform Admin who provisions companies via
 * /platform-admin — a completely separate identity/table from any
 * per-company User, seeded once, globally (no companyId). */
async function seedPlatformAdmin() {
  const normalizedEmail = env.SEED_PLATFORM_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await rawDb.platformAdmin.findUnique({ where: { email: normalizedEmail } });

  if (existing) {
    await rawDb.platformAdmin.update({ where: { id: existing.id }, data: { isActive: true } });
    console.log(`Platform Admin already exists (${normalizedEmail}); active status ensured.`);
    return;
  }

  const passwordHash = await hashPassword(env.SEED_PLATFORM_ADMIN_PASSWORD);
  await rawDb.platformAdmin.create({
    data: {
      name: env.SEED_PLATFORM_ADMIN_NAME,
      email: normalizedEmail,
      passwordHash,
      isActive: true,
    },
  });
  console.log(`Created initial Platform Admin (${normalizedEmail}).`);
}

async function main() {
  for (const companyInput of COMPANIES) {
    const company = await seedCompany(companyInput);
    await seedCompanyDefaults(company.id);
    for (const userInput of companyInput.users) {
      await seedCompanyUser(company.id, userInput);
    }
  }
  await seedPlatformAdmin();
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await rawDb.$disconnect();
  });
