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
