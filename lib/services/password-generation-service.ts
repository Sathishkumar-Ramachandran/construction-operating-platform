import { randomInt } from "node:crypto";

const MIN_LENGTH = 14;
const LOWERCASE = "abcdefghijkmnopqrstuvwxyz"; // no `l` (looks like 1/I)
const UPPERCASE = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no `O`/`I`
const DIGITS = "23456789"; // no `0`/`1`
const SYMBOLS = "!@#$%^&*-_=+?";
const ALL_CHARS = LOWERCASE + UPPERCASE + DIGITS + SYMBOLS;

function pickChar(pool: string): string {
  return pool[randomInt(pool.length)];
}

function shuffle(chars: string[]): string[] {
  // Fisher-Yates using a CSPRNG, not Math.random().
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars;
}

/**
 * Generates a cryptographically secure random password satisfying the
 * initial-password policy (min 14 chars, at least one of each character
 * class). Never runs client-side; the plaintext must only exist transiently
 * in the request that created it.
 */
export function generateSecureInitialPassword(): string {
  const required = [
    pickChar(LOWERCASE),
    pickChar(UPPERCASE),
    pickChar(DIGITS),
    pickChar(SYMBOLS),
  ];

  const remainingLength = MIN_LENGTH - required.length;
  const rest = Array.from({ length: remainingLength }, () =>
    pickChar(ALL_CHARS)
  );

  return shuffle([...required, ...rest]).join("");
}

/**
 * Rejects passwords that trivially encode identifying information about the
 * person they were generated for. This never runs on user-chosen passwords
 * (those only need `strongPasswordSchema`) — only as a defensive check on
 * generated ones, and on any employee-linked password-generation inputs.
 */
export function containsPredictablePattern(
  password: string,
  identifyingValues: Array<string | null | undefined>
): boolean {
  const normalizedPassword = password.toLowerCase();
  return identifyingValues
    .filter((value): value is string => Boolean(value && value.length >= 3))
    .some((value) => normalizedPassword.includes(value.toLowerCase()));
}

/**
 * Generates a password, re-rolling if it happens to contain a predictable
 * fragment of the provided identifying values (name, email, DOB, etc).
 */
export function generateSecureInitialPasswordFor(
  identifyingValues: Array<string | null | undefined>
): string {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateSecureInitialPassword();
    if (!containsPredictablePattern(candidate, identifyingValues)) {
      return candidate;
    }
  }
  // Astronomically unlikely to be reached with a 14-char random password,
  // but never loop forever.
  return generateSecureInitialPassword();
}
