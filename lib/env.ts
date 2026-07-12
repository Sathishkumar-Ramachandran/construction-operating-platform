import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters long."),
  AUTH_URL: z.url(),
  SEED_SUPER_ADMIN_NAME: z.string().min(1),
  SEED_SUPER_ADMIN_EMAIL: z.email(),
  SEED_SUPER_ADMIN_PASSWORD: z.string().min(12),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // 32-byte (base64) key used for AES-256-GCM encryption of sensitive HR
  // fields (bank account numbers, national ID / passport numbers).
  // Generate with: openssl rand -base64 32
  ENCRYPTION_KEY: z
    .string()
    .refine((value) => {
      try {
        return Buffer.from(value, "base64").length === 32;
      } catch {
        return false;
      }
    }, "ENCRYPTION_KEY must be a base64-encoded 32-byte key (e.g. `openssl rand -base64 32`)."),

  // Optional S3-compatible object storage for employee documents. When any
  // of these is missing, document upload/download is disabled and the UI
  // shows a "storage not configured" state instead of a broken flow.
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n\nCheck your .env file against .env.example.`
    );
  }

  return parsed.data;
}

export const env = loadEnv();
