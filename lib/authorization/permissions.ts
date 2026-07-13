import { UserRole } from "@/lib/authorization/roles";

export type PermissionDefinition = {
  code: string;
  module: string;
  resource: string;
  action: string;
  description: string;
};

function permission(
  code: string,
  module: string,
  resource: string,
  action: string,
  description: string
): PermissionDefinition {
  return { code, module, resource, action, description };
}

/**
 * Single source of truth for every permission code in the system.
 * Reused by the seed script (to upsert Permission rows) and at runtime
 * (to type-check `requirePermission` calls) so the two can never drift.
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: permission(
    "DASHBOARD.VIEW",
    "DASHBOARD",
    "DASHBOARD",
    "VIEW",
    "View the dashboard."
  ),

  USERS_VIEW: permission(
    "USERS.VIEW",
    "USERS",
    "USERS",
    "VIEW",
    "View users."
  ),
  USERS_CREATE: permission(
    "USERS.CREATE",
    "USERS",
    "USERS",
    "CREATE",
    "Create users."
  ),
  USERS_UPDATE: permission(
    "USERS.UPDATE",
    "USERS",
    "USERS",
    "UPDATE",
    "Update users."
  ),
  USERS_DEACTIVATE: permission(
    "USERS.DEACTIVATE",
    "USERS",
    "USERS",
    "DEACTIVATE",
    "Activate or deactivate users."
  ),
  USERS_ASSIGN_ROLE: permission(
    "USERS.ASSIGN_ROLE",
    "USERS",
    "USERS",
    "ASSIGN_ROLE",
    "Assign a role to a user."
  ),

  ROLES_VIEW: permission(
    "ROLES.VIEW",
    "ROLES",
    "ROLES",
    "VIEW",
    "View roles and their permissions."
  ),
  ROLES_UPDATE: permission(
    "ROLES.UPDATE",
    "ROLES",
    "ROLES",
    "UPDATE",
    "Update role permissions."
  ),

  PROJECTS_VIEW: permission(
    "PROJECTS.VIEW",
    "PROJECTS",
    "PROJECTS",
    "VIEW",
    "View projects."
  ),
  PROJECTS_MANAGE: permission(
    "PROJECTS.MANAGE",
    "PROJECTS",
    "PROJECTS",
    "MANAGE",
    "Manage projects."
  ),

  TEAM_VIEW: permission("TEAM.VIEW", "TEAM", "TEAM", "VIEW", "View team."),
  TEAM_MANAGE: permission(
    "TEAM.MANAGE",
    "TEAM",
    "TEAM",
    "MANAGE",
    "Manage team members."
  ),

  HR_EMPLOYEES_VIEW: permission(
    "HR.EMPLOYEES.VIEW",
    "HR",
    "EMPLOYEES",
    "VIEW",
    "View employees."
  ),
  HR_EMPLOYEES_MANAGE: permission(
    "HR.EMPLOYEES.MANAGE",
    "HR",
    "EMPLOYEES",
    "MANAGE",
    "Manage employees."
  ),
  HR_ATTENDANCE_VIEW: permission(
    "HR.ATTENDANCE.VIEW",
    "HR",
    "ATTENDANCE",
    "VIEW",
    "View attendance."
  ),
  HR_ATTENDANCE_MANAGE: permission(
    "HR.ATTENDANCE.MANAGE",
    "HR",
    "ATTENDANCE",
    "MANAGE",
    "Manage attendance."
  ),
  HR_LEAVE_VIEW: permission(
    "HR.LEAVE.VIEW",
    "HR",
    "LEAVE",
    "VIEW",
    "View leave."
  ),
  HR_LEAVE_MANAGE: permission(
    "HR.LEAVE.MANAGE",
    "HR",
    "LEAVE",
    "MANAGE",
    "Manage leave."
  ),

  INVENTORY_VIEW: permission(
    "INVENTORY.VIEW",
    "INVENTORY",
    "INVENTORY",
    "VIEW",
    "View inventory."
  ),
  INVENTORY_MANAGE: permission(
    "INVENTORY.MANAGE",
    "INVENTORY",
    "INVENTORY",
    "MANAGE",
    "Manage inventory."
  ),

  REPORTS_VIEW: permission(
    "REPORTS.VIEW",
    "REPORTS",
    "REPORTS",
    "VIEW",
    "View reports."
  ),

  SETTINGS_VIEW: permission(
    "SETTINGS.VIEW",
    "SETTINGS",
    "SETTINGS",
    "VIEW",
    "View settings."
  ),
  SETTINGS_MANAGE: permission(
    "SETTINGS.MANAGE",
    "SETTINGS",
    "SETTINGS",
    "MANAGE",
    "Manage settings."
  ),

  AUDIT_VIEW: permission(
    "AUDIT.VIEW",
    "AUDIT",
    "AUDIT",
    "VIEW",
    "View audit logs."
  ),

  HR_EMPLOYEE_VIEW: permission(
    "HR.EMPLOYEE.VIEW",
    "HR",
    "EMPLOYEE",
    "VIEW",
    "View employee records."
  ),
  HR_EMPLOYEE_VIEW_SENSITIVE: permission(
    "HR.EMPLOYEE.VIEW_SENSITIVE",
    "HR",
    "EMPLOYEE",
    "VIEW_SENSITIVE",
    "View sensitive employee fields (bank details, identification numbers)."
  ),
  HR_EMPLOYEE_CREATE: permission(
    "HR.EMPLOYEE.CREATE",
    "HR",
    "EMPLOYEE",
    "CREATE",
    "Create employee records."
  ),
  HR_EMPLOYEE_UPDATE: permission(
    "HR.EMPLOYEE.UPDATE",
    "HR",
    "EMPLOYEE",
    "UPDATE",
    "Update employee records."
  ),
  HR_EMPLOYEE_DEACTIVATE: permission(
    "HR.EMPLOYEE.DEACTIVATE",
    "HR",
    "EMPLOYEE",
    "DEACTIVATE",
    "Change an employee's employment status."
  ),
  HR_EMPLOYEE_OFFBOARD: permission(
    "HR.EMPLOYEE.OFFBOARD",
    "HR",
    "EMPLOYEE",
    "OFFBOARD",
    "Offboard an employee."
  ),
  HR_EMPLOYEE_EXPORT: permission(
    "HR.EMPLOYEE.EXPORT",
    "HR",
    "EMPLOYEE",
    "EXPORT",
    "Export the employee directory."
  ),

  HR_DOCUMENT_VIEW: permission(
    "HR.DOCUMENT.VIEW",
    "HR",
    "DOCUMENT",
    "VIEW",
    "View employee documents."
  ),
  HR_DOCUMENT_UPLOAD: permission(
    "HR.DOCUMENT.UPLOAD",
    "HR",
    "DOCUMENT",
    "UPLOAD",
    "Upload employee documents."
  ),
  HR_DOCUMENT_UPDATE: permission(
    "HR.DOCUMENT.UPDATE",
    "HR",
    "DOCUMENT",
    "UPDATE",
    "Update employee document metadata."
  ),
  HR_DOCUMENT_DELETE: permission(
    "HR.DOCUMENT.DELETE",
    "HR",
    "DOCUMENT",
    "DELETE",
    "Archive/delete employee documents."
  ),
  HR_DOCUMENT_VIEW_CONFIDENTIAL: permission(
    "HR.DOCUMENT.VIEW_CONFIDENTIAL",
    "HR",
    "DOCUMENT",
    "VIEW_CONFIDENTIAL",
    "View confidential employee documents."
  ),

  HR_WORK_PASS_VIEW: permission(
    "HR.WORK_PASS.VIEW",
    "HR",
    "WORK_PASS",
    "VIEW",
    "View work passes."
  ),
  HR_WORK_PASS_MANAGE: permission(
    "HR.WORK_PASS.MANAGE",
    "HR",
    "WORK_PASS",
    "MANAGE",
    "Manage work passes."
  ),

  HR_CERTIFICATION_VIEW: permission(
    "HR.CERTIFICATION.VIEW",
    "HR",
    "CERTIFICATION",
    "VIEW",
    "View licences and certifications."
  ),
  HR_CERTIFICATION_MANAGE: permission(
    "HR.CERTIFICATION.MANAGE",
    "HR",
    "CERTIFICATION",
    "MANAGE",
    "Manage licences and certifications."
  ),

  HR_ALLOCATION_VIEW: permission(
    "HR.ALLOCATION.VIEW",
    "HR",
    "ALLOCATION",
    "VIEW",
    "View project/site allocation."
  ),
  HR_ALLOCATION_MANAGE: permission(
    "HR.ALLOCATION.MANAGE",
    "HR",
    "ALLOCATION",
    "MANAGE",
    "Manage project/site allocation."
  ),

  HR_MASTER_DATA_MANAGE: permission(
    "HR.MASTER_DATA.MANAGE",
    "HR",
    "MASTER_DATA",
    "MANAGE",
    "Manage HR master data (departments, designations, grades, etc.)."
  ),

  USERS_RESET_PASSWORD: permission(
    "USERS.RESET_PASSWORD",
    "USERS",
    "USERS",
    "RESET_PASSWORD",
    "Reset another user's password."
  ),
  USERS_CREATE_FROM_EMPLOYEE: permission(
    "USERS.CREATE_FROM_EMPLOYEE",
    "USERS",
    "USERS",
    "CREATE_FROM_EMPLOYEE",
    "Create a system-user account from an employee record."
  ),
} as const;

export type PermissionCode =
  (typeof PERMISSIONS)[keyof typeof PERMISSIONS]["code"];

export const ALL_PERMISSIONS: PermissionDefinition[] = Object.values(
  PERMISSIONS
);

/**
 * Default role -> permission matrix, seeded on every `db:seed` run.
 * SUPER_ADMIN is included for completeness (readable in the Role viewer UI)
 * even though authorization always short-circuits via the Super Admin
 * bypass before this table is consulted.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  [UserRole.SUPER_ADMIN]: ALL_PERMISSIONS.map((p) => p.code),

  [UserRole.ADMIN]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.USERS_VIEW.code,
    PERMISSIONS.USERS_CREATE.code,
    PERMISSIONS.USERS_UPDATE.code,
    PERMISSIONS.USERS_DEACTIVATE.code,
    PERMISSIONS.USERS_ASSIGN_ROLE.code,
    PERMISSIONS.USERS_RESET_PASSWORD.code,
    PERMISSIONS.USERS_CREATE_FROM_EMPLOYEE.code,
    PERMISSIONS.ROLES_VIEW.code,
    PERMISSIONS.PROJECTS_VIEW.code,
    PERMISSIONS.INVENTORY_VIEW.code,
    PERMISSIONS.REPORTS_VIEW.code,
    PERMISSIONS.SETTINGS_VIEW.code,
    PERMISSIONS.SETTINGS_MANAGE.code,
    PERMISSIONS.AUDIT_VIEW.code,
    PERMISSIONS.HR_EMPLOYEE_VIEW.code,
    PERMISSIONS.HR_EMPLOYEE_CREATE.code,
    PERMISSIONS.HR_EMPLOYEE_UPDATE.code,
    PERMISSIONS.HR_EMPLOYEE_DEACTIVATE.code,
    PERMISSIONS.HR_EMPLOYEE_OFFBOARD.code,
    PERMISSIONS.HR_EMPLOYEE_EXPORT.code,
    PERMISSIONS.HR_ALLOCATION_VIEW.code,
    PERMISSIONS.HR_ALLOCATION_MANAGE.code,
    PERMISSIONS.HR_MASTER_DATA_MANAGE.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_MANAGE.code,
  ],

  [UserRole.MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.PROJECTS_VIEW.code,
    PERMISSIONS.TEAM_VIEW.code,
    PERMISSIONS.TEAM_MANAGE.code,
    PERMISSIONS.REPORTS_VIEW.code,
    PERMISSIONS.HR_EMPLOYEE_VIEW.code,
    PERMISSIONS.HR_ALLOCATION_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
  ],

  [UserRole.HR]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.HR_EMPLOYEES_VIEW.code,
    PERMISSIONS.HR_EMPLOYEES_MANAGE.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_MANAGE.code,
    PERMISSIONS.HR_LEAVE_VIEW.code,
    PERMISSIONS.HR_LEAVE_MANAGE.code,
    PERMISSIONS.REPORTS_VIEW.code,
    PERMISSIONS.HR_EMPLOYEE_VIEW.code,
    PERMISSIONS.HR_EMPLOYEE_VIEW_SENSITIVE.code,
    PERMISSIONS.HR_EMPLOYEE_CREATE.code,
    PERMISSIONS.HR_EMPLOYEE_UPDATE.code,
    PERMISSIONS.HR_EMPLOYEE_DEACTIVATE.code,
    PERMISSIONS.HR_EMPLOYEE_OFFBOARD.code,
    PERMISSIONS.HR_EMPLOYEE_EXPORT.code,
    PERMISSIONS.HR_DOCUMENT_VIEW.code,
    PERMISSIONS.HR_DOCUMENT_UPLOAD.code,
    PERMISSIONS.HR_DOCUMENT_UPDATE.code,
    PERMISSIONS.HR_DOCUMENT_DELETE.code,
    PERMISSIONS.HR_DOCUMENT_VIEW_CONFIDENTIAL.code,
    PERMISSIONS.HR_WORK_PASS_VIEW.code,
    PERMISSIONS.HR_WORK_PASS_MANAGE.code,
    PERMISSIONS.HR_CERTIFICATION_VIEW.code,
    PERMISSIONS.HR_CERTIFICATION_MANAGE.code,
    PERMISSIONS.HR_ALLOCATION_VIEW.code,
    PERMISSIONS.HR_ALLOCATION_MANAGE.code,
    PERMISSIONS.HR_MASTER_DATA_MANAGE.code,
    PERMISSIONS.USERS_CREATE_FROM_EMPLOYEE.code,
    PERMISSIONS.USERS_RESET_PASSWORD.code,
  ],

  [UserRole.TEAM_MEMBER]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
    PERMISSIONS.HR_LEAVE_VIEW.code,
  ],
};
