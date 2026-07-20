export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_ACCOUNT_INACTIVE: "AUTH_ACCOUNT_INACTIVE",
  AUTH_SESSION_REQUIRED: "AUTH_SESSION_REQUIRED",
  AUTH_PERMISSION_DENIED: "AUTH_PERMISSION_DENIED",
  USER_EMAIL_ALREADY_EXISTS: "USER_EMAIL_ALREADY_EXISTS",
  USER_CANNOT_MODIFY_SUPER_ADMIN: "USER_CANNOT_MODIFY_SUPER_ADMIN",
  USER_CANNOT_DEACTIVATE_SELF: "USER_CANNOT_DEACTIVATE_SELF",
  USER_LAST_SUPER_ADMIN_REQUIRED: "USER_LAST_SUPER_ADMIN_REQUIRED",
  USER_CANNOT_ASSIGN_SUPER_ADMIN: "USER_CANNOT_ASSIGN_SUPER_ADMIN",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_CANNOT_RESET_OWN_PASSWORD: "USER_CANNOT_RESET_OWN_PASSWORD",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  CONFLICT_ERROR: "CONFLICT_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RESET_TOKEN_INVALID: "RESET_TOKEN_INVALID",

  EMPLOYEE_NOT_FOUND: "EMPLOYEE_NOT_FOUND",
  EMPLOYEE_WORK_EMAIL_ALREADY_EXISTS: "EMPLOYEE_WORK_EMAIL_ALREADY_EXISTS",
  EMPLOYEE_ALREADY_LINKED_TO_USER: "EMPLOYEE_ALREADY_LINKED_TO_USER",
  EMPLOYEE_INACTIVE: "EMPLOYEE_INACTIVE",
  EMPLOYEE_INVALID_STATUS_TRANSITION: "EMPLOYEE_INVALID_STATUS_TRANSITION",
  EMPLOYEE_REPORTING_CYCLE: "EMPLOYEE_REPORTING_CYCLE",
  DEPARTMENT_CIRCULAR_HIERARCHY: "DEPARTMENT_CIRCULAR_HIERARCHY",
  DEPARTMENT_IN_USE: "DEPARTMENT_IN_USE",
  MASTER_DATA_CODE_ALREADY_EXISTS: "MASTER_DATA_CODE_ALREADY_EXISTS",

  ASSIGNMENT_INVALID_ALLOCATION: "ASSIGNMENT_INVALID_ALLOCATION",
  ASSIGNMENT_OVER_ALLOCATED: "ASSIGNMENT_OVER_ALLOCATED",
  ASSIGNMENT_SITE_PROJECT_MISMATCH: "ASSIGNMENT_SITE_PROJECT_MISMATCH",
  ASSIGNMENT_INVALID_DATES: "ASSIGNMENT_INVALID_DATES",

  STORAGE_NOT_CONFIGURED: "STORAGE_NOT_CONFIGURED",
  DOCUMENT_FILE_TYPE_NOT_ALLOWED: "DOCUMENT_FILE_TYPE_NOT_ALLOWED",
  DOCUMENT_FILE_TOO_LARGE: "DOCUMENT_FILE_TOO_LARGE",

  ATTENDANCE_NO_LINKED_EMPLOYEE: "ATTENDANCE_NO_LINKED_EMPLOYEE",
  ATTENDANCE_ALREADY_CHECKED_IN: "ATTENDANCE_ALREADY_CHECKED_IN",
  ATTENDANCE_NOT_CHECKED_IN: "ATTENDANCE_NOT_CHECKED_IN",
  ATTENDANCE_ALREADY_CHECKED_OUT: "ATTENDANCE_ALREADY_CHECKED_OUT",

  APPROVAL_NOT_FOUND: "APPROVAL_NOT_FOUND",
  APPROVAL_ALREADY_DECIDED: "APPROVAL_ALREADY_DECIDED",
  APPROVAL_NOT_AUTHORIZED_APPROVER: "APPROVAL_NOT_AUTHORIZED_APPROVER",
  APPROVAL_INVALID_STEP_ORDER: "APPROVAL_INVALID_STEP_ORDER",
  APPROVAL_NO_APPROVERS_RESOLVED: "APPROVAL_NO_APPROVERS_RESOLVED",
  APPROVAL_UNKNOWN_MODULE: "APPROVAL_UNKNOWN_MODULE",

  LEAVE_OVERLAPPING_REQUEST: "LEAVE_OVERLAPPING_REQUEST",
  LEAVE_INSUFFICIENT_BALANCE: "LEAVE_INSUFFICIENT_BALANCE",
  LEAVE_REQUEST_NOT_FOUND: "LEAVE_REQUEST_NOT_FOUND",
  LEAVE_REQUEST_NOT_CANCELLABLE: "LEAVE_REQUEST_NOT_CANCELLABLE",

  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  PROJECT_NOT_ACTIVE: "PROJECT_NOT_ACTIVE",
  PROJECT_INVALID_STATUS_TRANSITION: "PROJECT_INVALID_STATUS_TRANSITION",
  SITE_NOT_FOUND: "SITE_NOT_FOUND",
  SITE_STAGE_ALREADY_COMPLETE: "SITE_STAGE_ALREADY_COMPLETE",
  SITE_STAGE_HANDOVER_ALREADY_PENDING: "SITE_STAGE_HANDOVER_ALREADY_PENDING",
  SITE_STAGE_NOT_AUTHORIZED: "SITE_STAGE_NOT_AUTHORIZED",
  SITE_STAGE_CHECKLIST_INCOMPLETE: "SITE_STAGE_CHECKLIST_INCOMPLETE",
  SITE_STAGE_CHECKLIST_LOCKED: "SITE_STAGE_CHECKLIST_LOCKED",
  RESOURCE_REQUEST_NOT_FOUND: "RESOURCE_REQUEST_NOT_FOUND",
  RESOURCE_REQUEST_NOT_CANCELLABLE: "RESOURCE_REQUEST_NOT_CANCELLABLE",

  TASK_NOT_FOUND: "TASK_NOT_FOUND",
  TASK_NOT_AUTHORIZED: "TASK_NOT_AUTHORIZED",
  TASK_ASSIGNEE_NOT_ON_PROJECT: "TASK_ASSIGNEE_NOT_ON_PROJECT",
  ATTENDANCE_MARK_NOT_AUTHORIZED: "ATTENDANCE_MARK_NOT_AUTHORIZED",

  MATERIAL_NOT_FOUND: "MATERIAL_NOT_FOUND",
  MATERIAL_CATEGORY_NOT_FOUND: "MATERIAL_CATEGORY_NOT_FOUND",
  SUPPLIER_NOT_FOUND: "SUPPLIER_NOT_FOUND",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  AUTH_INVALID_CREDENTIALS: "Invalid email or password.",
  AUTH_ACCOUNT_INACTIVE: "Invalid email or password.",
  AUTH_SESSION_REQUIRED: "You must be signed in to continue.",
  AUTH_PERMISSION_DENIED: "You do not have permission to do that.",
  USER_EMAIL_ALREADY_EXISTS: "A user with this email already exists.",
  USER_CANNOT_MODIFY_SUPER_ADMIN:
    "The Super Admin account cannot be modified this way.",
  USER_CANNOT_DEACTIVATE_SELF: "You cannot deactivate your own account.",
  USER_LAST_SUPER_ADMIN_REQUIRED:
    "At least one active Super Admin must remain.",
  USER_CANNOT_ASSIGN_SUPER_ADMIN:
    "Only a Super Admin can grant the Super Admin role.",
  USER_NOT_FOUND: "User not found.",
  USER_CANNOT_RESET_OWN_PASSWORD:
    "Use the security page to change your own password.",
  VALIDATION_ERROR: "The information provided is invalid.",
  CONFLICT_ERROR: "This action conflicts with the current state.",
  INTERNAL_ERROR: "Something went wrong. Please try again.",
  NOT_FOUND: "The requested record was not found.",
  RESET_TOKEN_INVALID: "This reset link is invalid or has expired.",

  EMPLOYEE_NOT_FOUND: "Employee not found.",
  EMPLOYEE_WORK_EMAIL_ALREADY_EXISTS:
    "An employee with this work email already exists.",
  EMPLOYEE_ALREADY_LINKED_TO_USER:
    "This employee already has a linked user account.",
  EMPLOYEE_INACTIVE: "This employee is not active.",
  EMPLOYEE_INVALID_STATUS_TRANSITION:
    "That employment status change isn't allowed from the current status.",
  EMPLOYEE_REPORTING_CYCLE:
    "This reporting-manager change would create a circular hierarchy.",
  DEPARTMENT_CIRCULAR_HIERARCHY:
    "This parent department would create a circular hierarchy.",
  DEPARTMENT_IN_USE:
    "This department cannot be removed while employees are assigned to it.",
  MASTER_DATA_CODE_ALREADY_EXISTS: "This code is already in use.",

  ASSIGNMENT_INVALID_ALLOCATION:
    "Allocation percentage must be greater than 0 and no more than 100.",
  ASSIGNMENT_OVER_ALLOCATED:
    "This employee's total active allocation would exceed 100%.",
  ASSIGNMENT_SITE_PROJECT_MISMATCH:
    "The selected site does not belong to the selected project.",
  ASSIGNMENT_INVALID_DATES: "The end date cannot be before the start date.",

  STORAGE_NOT_CONFIGURED:
    "Document storage isn't configured yet. Contact an administrator.",
  DOCUMENT_FILE_TYPE_NOT_ALLOWED:
    "This file type isn't allowed for the selected document type.",
  DOCUMENT_FILE_TOO_LARGE: "This file exceeds the maximum allowed size.",

  ATTENDANCE_NO_LINKED_EMPLOYEE:
    "Your account isn't linked to an employee record, so you can't check in.",
  ATTENDANCE_ALREADY_CHECKED_IN: "You've already checked in today.",
  ATTENDANCE_NOT_CHECKED_IN: "You need to check in before you can check out.",
  ATTENDANCE_ALREADY_CHECKED_OUT: "You've already checked out today.",

  APPROVAL_NOT_FOUND: "Approval request not found.",
  APPROVAL_ALREADY_DECIDED: "This approval step has already been decided.",
  APPROVAL_NOT_AUTHORIZED_APPROVER:
    "You are not an authorized approver for this request.",
  APPROVAL_INVALID_STEP_ORDER:
    "This isn't the current step awaiting a decision.",
  APPROVAL_NO_APPROVERS_RESOLVED:
    "No approver could be resolved for this request.",
  APPROVAL_UNKNOWN_MODULE: "This approval module isn't registered.",

  LEAVE_OVERLAPPING_REQUEST:
    "You already have a pending or approved leave request that overlaps these dates.",
  LEAVE_INSUFFICIENT_BALANCE: "You don't have enough leave balance remaining for this request.",
  LEAVE_REQUEST_NOT_FOUND: "Leave request not found.",
  LEAVE_REQUEST_NOT_CANCELLABLE: "Only a pending leave request can be cancelled.",

  PROJECT_NOT_FOUND: "Project not found.",
  PROJECT_NOT_ACTIVE: "This project is not active.",
  PROJECT_INVALID_STATUS_TRANSITION: "That project status change isn't allowed from the current status.",
  SITE_NOT_FOUND: "Site not found.",
  SITE_STAGE_ALREADY_COMPLETE: "This site has already completed its execution workflow.",
  SITE_STAGE_HANDOVER_ALREADY_PENDING: "A handover approval is already pending for this site.",
  SITE_STAGE_NOT_AUTHORIZED: "You must be assigned to this site (or be an Admin) to advance its stage.",
  SITE_STAGE_CHECKLIST_INCOMPLETE: "Complete every checklist item for this stage before advancing.",
  SITE_STAGE_CHECKLIST_LOCKED: "This stage's checklist can no longer be edited — the site has moved on.",
  RESOURCE_REQUEST_NOT_FOUND: "Resource request not found.",
  RESOURCE_REQUEST_NOT_CANCELLABLE: "Only a pending resource request can be cancelled.",

  TASK_NOT_FOUND: "Task not found.",
  TASK_NOT_AUTHORIZED: "You are not authorized to update this task.",
  TASK_ASSIGNEE_NOT_ON_PROJECT: "The assignee must be actively assigned to this project.",
  ATTENDANCE_MARK_NOT_AUTHORIZED: "You are not authorized to mark attendance for this employee.",

  MATERIAL_NOT_FOUND: "Material not found.",
  MATERIAL_CATEGORY_NOT_FOUND: "Material category not found.",
  SUPPLIER_NOT_FOUND: "Supplier not found.",
};

/**
 * Domain-safe error. `message` is always safe to show to end users;
 * never wraps raw database/driver error strings.
 */
export class AppError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    super(message ?? DEFAULT_MESSAGES[code]);
    this.code = code;
    this.name = "AppError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function toSafeErrorMessage(error: unknown): string {
  if (isAppError(error)) return error.message;
  return DEFAULT_MESSAGES.INTERNAL_ERROR;
}
