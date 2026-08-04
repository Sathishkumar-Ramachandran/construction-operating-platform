import { z } from "zod";

/**
 * Env vars read only by `prisma/seed.ts` and dev scripts — never by
 * request-serving code. Deliberately kept out of `lib/env.ts`'s schema:
 * that one is validated on every server boot (see instrumentation.ts), so a
 * missing/undelivered seed-only var (e.g. an env-var-injection hiccup on the
 * hosting platform) must not be able to take down the live app.
 */
const seedEnvSchema = z.object({
  SEED_SUPER_ADMIN_NAME: z.string().min(1),
  SEED_SUPER_ADMIN_EMAIL: z.email(),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(12),
  SEED_PLATFORM_ADMIN_NAME: z.string().min(1),
  SEED_PLATFORM_ADMIN_EMAIL: z.email(),
  SEED_PLATFORM_ADMIN_PASSWORD: z.string().min(12),
});

function loadSeedEnv() {
  const parsed = seedEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing seed environment variables:\n${issues}\n\nCheck your .env file against .env.example.`
    );
  }

  return parsed.data;
}

export const seedEnv = loadSeedEnv();
