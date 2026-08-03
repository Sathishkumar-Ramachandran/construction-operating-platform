/**
 * Safe, minimal shape of the current Platform Admin exposed to the UI.
 * Never contains the password hash or session tokens. Deliberately not
 * related to `AuthenticatedUser` (types/auth.ts) — a Platform Admin is not
 * a User and never carries a companyId; the two identities must never be
 * interchangeable.
 */
export type AuthenticatedPlatformAdmin = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
};
