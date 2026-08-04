import "dotenv/config";
import { db, withTenant } from "@/lib/db";
import { authenticateUser, createSession } from "@/lib/services/auth-service";
import { seedEnv } from "@/lib/seed-env";

/** Defaults to the seeded Excell Enterprise Super Admin; pass an email as
 * argv[2] to sign in as any other seeded user (e.g. an HR account). */
const email = process.argv[2] ?? "krish@excellenterprise.com.sg";

async function main() {
  const outcome = await authenticateUser(email, seedEnv.SEED_SUPER_ADMIN_PASSWORD);
  if (!outcome.ok) throw new Error("Login failed: " + outcome.auditCode);
  const session = await withTenant(outcome.user.companyId, () =>
    createSession(outcome.user.id, {})
  );
  console.log(session.token);
}

main().finally(() => db.$disconnect());
