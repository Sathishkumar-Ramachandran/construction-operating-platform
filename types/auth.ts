import type { UserRole } from "@/lib/authorization/roles";

/**
 * Safe, minimal shape of the current user exposed to the UI. Never contains
 * the password hash, session tokens, or other sensitive fields.
 */
export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
};
