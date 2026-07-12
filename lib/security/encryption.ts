import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function getKey(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "base64");
}

/**
 * Encrypts a plaintext value for at-rest storage. Output packs
 * iv/authTag/ciphertext into a single base64 string so it can live in one
 * database column.
 */
export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptField(packed: string): string {
  const raw = Buffer.from(packed, "base64");
  const iv = raw.subarray(0, IV_LENGTH_BYTES);
  const authTag = raw.subarray(IV_LENGTH_BYTES, IV_LENGTH_BYTES + 16);
  const ciphertext = raw.subarray(IV_LENGTH_BYTES + 16);

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/** Masks all but the last N characters, e.g. `••••1234`. */
export function maskLast(value: string, visibleCount = 4): string {
  const trimmed = value.trim();
  if (trimmed.length <= visibleCount) {
    return "•".repeat(trimmed.length);
  }
  return `${"•".repeat(trimmed.length - visibleCount)}${trimmed.slice(-visibleCount)}`;
}

export function lastCharacters(value: string, count = 4): string {
  return value.trim().slice(-count);
}
