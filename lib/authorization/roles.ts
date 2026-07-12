export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  HR: "HR",
  TEAM_MEMBER: "TEAM_MEMBER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ALL_ROLES: UserRole[] = Object.values(UserRole);

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  HR: "HR",
  TEAM_MEMBER: "Team Member",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN:
    "Full end-to-end control of the company platform. Owner-level access.",
  ADMIN: "Controls projects, managers, and HR.",
  MANAGER: "Controls assigned project lifecycle and team members.",
  HR: "Controls manager and high-level project/HR roles.",
  TEAM_MEMBER: "Assigned project tasks.",
};

export function isUserRole(value: string): value is UserRole {
  return (ALL_ROLES as string[]).includes(value);
}
