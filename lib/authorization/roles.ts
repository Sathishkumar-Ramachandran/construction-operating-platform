export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  HR: "HR",
  TEAM_MEMBER: "TEAM_MEMBER",
  SALES: "SALES",
  WAREHOUSE_KEEPER: "WAREHOUSE_KEEPER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ALL_ROLES: UserRole[] = Object.values(UserRole);

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  HR: "HR",
  TEAM_MEMBER: "Team Member",
  SALES: "Sales",
  WAREHOUSE_KEEPER: "Warehouse Keeper",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN:
    "Full end-to-end control of the company platform. Owner-level access.",
  ADMIN: "Controls projects, managers, and HR.",
  MANAGER: "Controls assigned project lifecycle and team members.",
  HR: "Controls employee records, attendance, leave, and payroll.",
  TEAM_MEMBER: "Assigned project tasks.",
  SALES: "Manages CRM leads, tenders, and quotations they own.",
  WAREHOUSE_KEEPER: "Confirms goods receipts and stock transfers for assigned warehouses.",
};

export function isUserRole(value: string): value is UserRole {
  return (ALL_ROLES as string[]).includes(value);
}
