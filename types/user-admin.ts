import type { UserRole } from "@/lib/authorization/roles";

/** Shape of a user row as returned by GET /api/administration/users (JSON). */
export type SafeUserListItem = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  mustChangePassword: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
  role: { id: string; code: UserRole; name: string };
};

export type UsersListResponse = {
  users: SafeUserListItem[];
  total: number;
  page: number;
  pageSize: number;
};
