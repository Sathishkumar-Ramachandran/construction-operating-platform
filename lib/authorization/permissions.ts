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
  PROJECTS_TEAM_MANAGE: permission(
    "PROJECTS.TEAM.MANAGE",
    "PROJECTS",
    "TEAM",
    "MANAGE",
    "Assign or end an employee's assignment to a project from the project workspace."
  ),
  PROJECTS_RESOURCE_REQUEST_MANAGE: permission(
    "PROJECTS.RESOURCE_REQUEST.MANAGE",
    "PROJECTS",
    "RESOURCE_REQUEST",
    "MANAGE",
    "Request equipment/materials for a project and cancel your own pending requests."
  ),
  PROJECTS_TASK_MANAGE: permission(
    "PROJECTS.TASK.MANAGE",
    "PROJECTS",
    "TASK",
    "MANAGE",
    "Create and assign tasks within a project."
  ),

  TEAM_VIEW: permission("TEAM.VIEW", "TEAM", "TEAM", "VIEW", "View team."),
  TEAM_MANAGE: permission(
    "TEAM.MANAGE",
    "TEAM",
    "TEAM",
    "MANAGE",
    "Manage team members."
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

  APPROVALS_VIEW: permission(
    "APPROVALS.APPROVALS.VIEW",
    "APPROVALS",
    "APPROVALS",
    "VIEW",
    "View the approvals inbox (requests you made or can decide)."
  ),
  APPROVALS_DECIDE: permission(
    "APPROVALS.APPROVALS.DECIDE",
    "APPROVALS",
    "APPROVALS",
    "DECIDE",
    "Approve or reject pending approval requests assigned to you."
  ),

  // Scaffolding for the Payroll, CRM, ERP-warehouse, and traditional-PM
  // modules (not yet built). Defined now so the role/permission matrix is
  // the single source of truth from day one — see the platform expansion
  // plan for the phase each module ships in.
  PAYROLL_RUNS_VIEW: permission(
    "PAYROLL.RUNS.VIEW",
    "PAYROLL",
    "RUNS",
    "VIEW",
    "View payroll periods and runs."
  ),
  PAYROLL_RUNS_MANAGE: permission(
    "PAYROLL.RUNS.MANAGE",
    "PAYROLL",
    "RUNS",
    "MANAGE",
    "Create and process payroll runs."
  ),
  PAYROLL_RUNS_APPROVE: permission(
    "PAYROLL.RUNS.APPROVE",
    "PAYROLL",
    "RUNS",
    "APPROVE",
    "Approve a payroll run before disbursement."
  ),
  PAYROLL_PAYSLIPS_VIEW_OWN: permission(
    "PAYROLL.PAYSLIPS.VIEW_OWN",
    "PAYROLL",
    "PAYSLIPS",
    "VIEW_OWN",
    "View your own payslips."
  ),
  PAYROLL_PAYSLIPS_VIEW_ALL: permission(
    "PAYROLL.PAYSLIPS.VIEW_ALL",
    "PAYROLL",
    "PAYSLIPS",
    "VIEW_ALL",
    "View all employees' payslips."
  ),
  PAYROLL_STRUCTURES_MANAGE: permission(
    "PAYROLL.STRUCTURES.MANAGE",
    "PAYROLL",
    "STRUCTURES",
    "MANAGE",
    "Manage salary structures and compensation components."
  ),
  PAYROLL_STATUTORY_EXPORT: permission(
    "PAYROLL.STATUTORY.EXPORT",
    "PAYROLL",
    "STATUTORY",
    "EXPORT",
    "Export statutory filings (e.g. IR8A) for a payroll period."
  ),

  CRM_LEADS_VIEW: permission(
    "CRM.LEADS.VIEW",
    "CRM",
    "LEADS",
    "VIEW",
    "View CRM leads."
  ),
  CRM_LEADS_MANAGE: permission(
    "CRM.LEADS.MANAGE",
    "CRM",
    "LEADS",
    "MANAGE",
    "Create and update CRM leads."
  ),
  CRM_LEADS_CONVERT: permission(
    "CRM.LEADS.CONVERT",
    "CRM",
    "LEADS",
    "CONVERT",
    "Convert a won lead into a project."
  ),
  CRM_TENDERS_MANAGE: permission(
    "CRM.TENDERS.MANAGE",
    "CRM",
    "TENDERS",
    "MANAGE",
    "Manage tender submissions and BOQ lines."
  ),
  CRM_QUOTATIONS_MANAGE: permission(
    "CRM.QUOTATIONS.MANAGE",
    "CRM",
    "QUOTATIONS",
    "MANAGE",
    "Manage quotations sent to leads."
  ),

  ERP_WAREHOUSES_MANAGE: permission(
    "ERP.WAREHOUSES.MANAGE",
    "ERP",
    "WAREHOUSES",
    "MANAGE",
    "Manage warehouse master data."
  ),
  ERP_PURCHASE_ORDERS_VIEW: permission(
    "ERP.PURCHASE_ORDERS.VIEW",
    "ERP",
    "PURCHASE_ORDERS",
    "VIEW",
    "View purchase orders (line quantities only — pricing requires MANAGE)."
  ),
  ERP_PURCHASE_ORDERS_MANAGE: permission(
    "ERP.PURCHASE_ORDERS.MANAGE",
    "ERP",
    "PURCHASE_ORDERS",
    "MANAGE",
    "Create and edit purchase orders."
  ),
  ERP_PURCHASE_ORDERS_APPROVE: permission(
    "ERP.PURCHASE_ORDERS.APPROVE",
    "ERP",
    "PURCHASE_ORDERS",
    "APPROVE",
    "Approve purchase orders."
  ),
  ERP_GOODS_RECEIPT_MANAGE: permission(
    "ERP.GOODS_RECEIPT.MANAGE",
    "ERP",
    "GOODS_RECEIPT",
    "MANAGE",
    "Record goods receipts against purchase orders."
  ),
  ERP_STOCK_TRANSFERS_MANAGE: permission(
    "ERP.STOCK_TRANSFERS.MANAGE",
    "ERP",
    "STOCK_TRANSFERS",
    "MANAGE",
    "Create and receive stock transfers between warehouses."
  ),

  PROJECTS_DOCUMENTS_VIEW: permission(
    "PROJECTS.DOCUMENTS.VIEW",
    "PROJECTS",
    "DOCUMENTS",
    "VIEW",
    "View project documents."
  ),
  PROJECTS_DOCUMENTS_MANAGE: permission(
    "PROJECTS.DOCUMENTS.MANAGE",
    "PROJECTS",
    "DOCUMENTS",
    "MANAGE",
    "Upload and manage project documents."
  ),
  PROJECTS_BUDGET_MANAGE: permission(
    "PROJECTS.BUDGET.MANAGE",
    "PROJECTS",
    "BUDGET",
    "MANAGE",
    "Manage project budget lines."
  ),
  PROJECTS_WBS_MANAGE: permission(
    "PROJECTS.WBS.MANAGE",
    "PROJECTS",
    "WBS",
    "MANAGE",
    "Manage the work-breakdown structure/task hierarchy for a project."
  ),
  PROJECTS_PROGRESS_CLAIM_MANAGE: permission(
    "PROJECTS.PROGRESS_CLAIM.MANAGE",
    "PROJECTS",
    "PROGRESS_CLAIM",
    "MANAGE",
    "Prepare and submit progress claims."
  ),
  PROJECTS_PROGRESS_CLAIM_CERTIFY: permission(
    "PROJECTS.PROGRESS_CLAIM.CERTIFY",
    "PROJECTS",
    "PROGRESS_CLAIM",
    "CERTIFY",
    "Certify a submitted progress claim (preparer and certifier must differ)."
  ),
  PROJECTS_DEFECTS_MANAGE: permission(
    "PROJECTS.DEFECTS.MANAGE",
    "PROJECTS",
    "DEFECTS",
    "MANAGE",
    "Log and manage defects during the Defects Liability Period."
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
    PERMISSIONS.PROJECTS_MANAGE.code,
    PERMISSIONS.PROJECTS_TASK_MANAGE.code,
    PERMISSIONS.INVENTORY_VIEW.code,
    PERMISSIONS.INVENTORY_MANAGE.code,
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
    PERMISSIONS.APPROVALS_VIEW.code,
    PERMISSIONS.APPROVALS_DECIDE.code,
    PERMISSIONS.PAYROLL_RUNS_VIEW.code,
    PERMISSIONS.PAYROLL_RUNS_MANAGE.code,
    PERMISSIONS.PAYROLL_RUNS_APPROVE.code,
    PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_OWN.code,
    PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_ALL.code,
    PERMISSIONS.PAYROLL_STRUCTURES_MANAGE.code,
    PERMISSIONS.PAYROLL_STATUTORY_EXPORT.code,
    PERMISSIONS.CRM_LEADS_VIEW.code,
    PERMISSIONS.CRM_LEADS_MANAGE.code,
    PERMISSIONS.CRM_LEADS_CONVERT.code,
    PERMISSIONS.CRM_TENDERS_MANAGE.code,
    PERMISSIONS.CRM_QUOTATIONS_MANAGE.code,
    PERMISSIONS.ERP_WAREHOUSES_MANAGE.code,
    PERMISSIONS.ERP_PURCHASE_ORDERS_VIEW.code,
    PERMISSIONS.ERP_PURCHASE_ORDERS_MANAGE.code,
    PERMISSIONS.ERP_PURCHASE_ORDERS_APPROVE.code,
    PERMISSIONS.ERP_GOODS_RECEIPT_MANAGE.code,
    PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code,
    PERMISSIONS.PROJECTS_DOCUMENTS_VIEW.code,
    PERMISSIONS.PROJECTS_DOCUMENTS_MANAGE.code,
    PERMISSIONS.PROJECTS_BUDGET_MANAGE.code,
    PERMISSIONS.PROJECTS_WBS_MANAGE.code,
    PERMISSIONS.PROJECTS_PROGRESS_CLAIM_MANAGE.code,
    PERMISSIONS.PROJECTS_PROGRESS_CLAIM_CERTIFY.code,
    PERMISSIONS.PROJECTS_DEFECTS_MANAGE.code,
  ],

  [UserRole.MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.PROJECTS_VIEW.code,
    PERMISSIONS.PROJECTS_TEAM_MANAGE.code,
    PERMISSIONS.PROJECTS_RESOURCE_REQUEST_MANAGE.code,
    PERMISSIONS.PROJECTS_TASK_MANAGE.code,
    PERMISSIONS.PROJECTS_DOCUMENTS_VIEW.code,
    PERMISSIONS.PROJECTS_WBS_MANAGE.code,
    PERMISSIONS.PROJECTS_PROGRESS_CLAIM_MANAGE.code,
    PERMISSIONS.PROJECTS_DEFECTS_MANAGE.code,
    PERMISSIONS.INVENTORY_VIEW.code,
    PERMISSIONS.TEAM_VIEW.code,
    PERMISSIONS.TEAM_MANAGE.code,
    PERMISSIONS.HR_EMPLOYEE_VIEW.code,
    PERMISSIONS.HR_ALLOCATION_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
    PERMISSIONS.HR_LEAVE_VIEW.code,
    PERMISSIONS.APPROVALS_VIEW.code,
    PERMISSIONS.APPROVALS_DECIDE.code,
    PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_OWN.code,
  ],

  [UserRole.HR]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_MANAGE.code,
    PERMISSIONS.HR_LEAVE_VIEW.code,
    PERMISSIONS.HR_LEAVE_MANAGE.code,
    PERMISSIONS.APPROVALS_VIEW.code,
    PERMISSIONS.APPROVALS_DECIDE.code,
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
    PERMISSIONS.PAYROLL_RUNS_VIEW.code,
    PERMISSIONS.PAYROLL_RUNS_MANAGE.code,
    PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_OWN.code,
    PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_ALL.code,
    PERMISSIONS.PAYROLL_STRUCTURES_MANAGE.code,
    PERMISSIONS.PAYROLL_STATUTORY_EXPORT.code,
  ],

  [UserRole.TEAM_MEMBER]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.HR_ATTENDANCE_VIEW.code,
    PERMISSIONS.HR_LEAVE_VIEW.code,
    PERMISSIONS.APPROVALS_VIEW.code,
    PERMISSIONS.PROJECTS_VIEW.code,
    PERMISSIONS.PROJECTS_DOCUMENTS_VIEW.code,
    PERMISSIONS.PAYROLL_PAYSLIPS_VIEW_OWN.code,
  ],

  // Narrow, module-scoped operational roles (RBAC hardening decision): each
  // gets only the permissions needed for its day-to-day task — no HR,
  // Payroll-for-others, User-management, or cross-module visibility.
  [UserRole.SALES]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.CRM_LEADS_VIEW.code,
    PERMISSIONS.CRM_LEADS_MANAGE.code,
  ],

  [UserRole.WAREHOUSE_KEEPER]: [
    PERMISSIONS.DASHBOARD_VIEW.code,
    PERMISSIONS.ERP_PURCHASE_ORDERS_VIEW.code,
    PERMISSIONS.ERP_GOODS_RECEIPT_MANAGE.code,
    PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code,
  ],
};
