import "dotenv/config";
import { db } from "@/lib/db";
import { authenticateUser, createSession } from "@/lib/services/auth-service";
import { env } from "@/lib/env";

async function main() {
  const outcome = await authenticateUser(env.SEED_SUPER_ADMIN_EMAIL, env.SEED_SUPER_ADMIN_PASSWORD);
  if (!outcome.ok) throw new Error("Login failed: " + outcome.auditCode);
  const session = await createSession(outcome.user.id, {});
  console.log(session.token);
}

main().finally(() => db.$disconnect());
