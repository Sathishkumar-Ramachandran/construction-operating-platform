/**
 * Domain "enums" for the HR module, following the same TS-const pattern used
 * by lib/authorization/roles.ts — values are enforced at the TypeScript
 * layer, columns stay plain strings in the DB (see prisma/schema.prisma).
 */

export const EmploymentStatus = {
  DRAFT: "DRAFT",
  PRE_ONBOARDING: "PRE_ONBOARDING",
  ACTIVE: "ACTIVE",
  ON_LEAVE: "ON_LEAVE",
  SUSPENDED: "SUSPENDED",
  NOTICE_PERIOD: "NOTICE_PERIOD",
  RESIGNED: "RESIGNED",
  TERMINATED: "TERMINATED",
  RETIRED: "RETIRED",
  OFFBOARDED: "OFFBOARDED",
  ARCHIVED: "ARCHIVED",
} as const;
export type EmploymentStatus =
  (typeof EmploymentStatus)[keyof typeof EmploymentStatus];
export const ALL_EMPLOYMENT_STATUSES: EmploymentStatus[] =
  Object.values(EmploymentStatus);

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  DRAFT: "Draft",
  PRE_ONBOARDING: "Pre-onboarding",
  ACTIVE: "Active",
  ON_LEAVE: "On Leave",
  SUSPENDED: "Suspended",
  NOTICE_PERIOD: "Notice Period",
  RESIGNED: "Resigned",
  TERMINATED: "Terminated",
  RETIRED: "Retired",
  OFFBOARDED: "Offboarded",
  ARCHIVED: "Archived",
};

/** Allowed employment-status transitions — enforced centrally, never ad hoc. */
export const EMPLOYMENT_STATUS_TRANSITIONS: Record<
  EmploymentStatus,
  EmploymentStatus[]
> = {
  DRAFT: [EmploymentStatus.PRE_ONBOARDING, EmploymentStatus.ACTIVE],
  PRE_ONBOARDING: [EmploymentStatus.ACTIVE],
  ACTIVE: [
    EmploymentStatus.ON_LEAVE,
    EmploymentStatus.SUSPENDED,
    EmploymentStatus.NOTICE_PERIOD,
    EmploymentStatus.RESIGNED,
    EmploymentStatus.TERMINATED,
    EmploymentStatus.RETIRED,
  ],
  ON_LEAVE: [EmploymentStatus.ACTIVE],
  SUSPENDED: [EmploymentStatus.ACTIVE, EmploymentStatus.TERMINATED],
  NOTICE_PERIOD: [
    EmploymentStatus.ACTIVE,
    EmploymentStatus.RESIGNED,
    EmploymentStatus.TERMINATED,
  ],
  RESIGNED: [EmploymentStatus.OFFBOARDED],
  TERMINATED: [EmploymentStatus.OFFBOARDED],
  RETIRED: [EmploymentStatus.OFFBOARDED],
  OFFBOARDED: [EmploymentStatus.ARCHIVED],
  ARCHIVED: [],
};

export const WorkforceAvailability = {
  IN_PROJECT: "IN_PROJECT",
  FREE: "FREE",
  PARTIALLY_ALLOCATED: "PARTIALLY_ALLOCATED",
  TEMPORARILY_UNAVAILABLE: "TEMPORARILY_UNAVAILABLE",
  ON_LEAVE: "ON_LEAVE",
  INACTIVE: "INACTIVE",
} as const;
export type WorkforceAvailability =
  (typeof WorkforceAvailability)[keyof typeof WorkforceAvailability];

export const WORKFORCE_AVAILABILITY_LABELS: Record<
  WorkforceAvailability,
  string
> = {
  IN_PROJECT: "In Project",
  FREE: "Free",
  PARTIALLY_ALLOCATED: "Partially Allocated",
  TEMPORARILY_UNAVAILABLE: "Temporarily Unavailable",
  ON_LEAVE: "On Leave",
  INACTIVE: "Inactive",
};

export const WorkLocation = {
  OFFICE: "OFFICE",
  SITE: "SITE",
} as const;
export type WorkLocation = (typeof WorkLocation)[keyof typeof WorkLocation];

export const WORK_LOCATION_LABELS: Record<WorkLocation, string> = {
  OFFICE: "Office",
  SITE: "Site",
};

export const INACTIVE_EMPLOYMENT_STATUSES: EmploymentStatus[] = [
  EmploymentStatus.RESIGNED,
  EmploymentStatus.TERMINATED,
  EmploymentStatus.RETIRED,
  EmploymentStatus.OFFBOARDED,
  EmploymentStatus.ARCHIVED,
];

export const AssignmentStatus = {
  PLANNED: "PLANNED",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  SUSPENDED: "SUSPENDED",
} as const;
export type AssignmentStatus =
  (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const DocumentStatus = {
  UPLOADED: "UPLOADED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
} as const;
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

export const WorkPassStatus = {
  VALID: "VALID",
  EXPIRING: "EXPIRING",
  EXPIRED: "EXPIRED",
  SUSPENDED: "SUSPENDED",
  REVOKED: "REVOKED",
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
} as const;
export type WorkPassStatus = (typeof WorkPassStatus)[keyof typeof WorkPassStatus];

export const CertificationStatus = WorkPassStatus;
export type CertificationStatus = WorkPassStatus;

export const WORK_PASS_TYPES = [
  "WORK_PERMIT",
  "S_PASS",
  "EMPLOYMENT_PASS",
  "DEPENDANTS_PASS",
  "OTHER",
] as const;
export type WorkPassType = (typeof WORK_PASS_TYPES)[number];

export const EXPIRY_ALERT_THRESHOLDS_DAYS = [90, 60, 30, 14, 7] as const;

export const DEFAULT_EMPLOYMENT_TYPES = [
  { code: "PERMANENT", name: "Permanent" },
  { code: "CONTRACT", name: "Contract" },
  { code: "PART_TIME", name: "Part-Time" },
  { code: "DAILY_RATED", name: "Daily-Rated" },
  { code: "HOURLY_RATED", name: "Hourly-Rated" },
  { code: "INTERN", name: "Intern" },
  { code: "TEMPORARY", name: "Temporary" },
  { code: "SUBCONTRACTED", name: "Subcontracted" },
] as const;

/** Singapore-appropriate starter leave types. NS/Reservist leave is
 *  deliberately excluded — it interacts with Payroll make-up-pay claims,
 *  not just scheduling, and is deferred to the Payroll phase. */
export const DEFAULT_LEAVE_TYPES = [
  { code: "ANNUAL", name: "Annual Leave", defaultEntitlementDays: 14, isPaid: true },
  { code: "SICK", name: "Sick Leave (Outpatient)", defaultEntitlementDays: 14, isPaid: true },
  { code: "HOSPITALIZATION", name: "Hospitalization Leave", defaultEntitlementDays: 60, isPaid: true },
  { code: "MATERNITY", name: "Maternity Leave", defaultEntitlementDays: 112, isPaid: true },
  { code: "PATERNITY", name: "Paternity Leave", defaultEntitlementDays: 14, isPaid: true },
  { code: "SHARED_PARENTAL", name: "Shared Parental Leave", defaultEntitlementDays: 0, isPaid: true },
  { code: "CHILDCARE", name: "Childcare Leave", defaultEntitlementDays: 6, isPaid: true },
  { code: "COMPASSIONATE", name: "Compassionate Leave", defaultEntitlementDays: 3, isPaid: true },
  { code: "UNPAID", name: "Unpaid Leave", defaultEntitlementDays: 0, isPaid: false },
] as const;

export const DEFAULT_PROJECT_ROLES = [
  { code: "PROJECT_MANAGER", name: "Project Manager" },
  { code: "SITE_MANAGER", name: "Site Manager" },
  { code: "SITE_ENGINEER", name: "Site Engineer" },
  { code: "QUANTITY_SURVEYOR", name: "Quantity Surveyor" },
  { code: "SAFETY_OFFICER", name: "Safety Officer" },
  { code: "FOREMAN", name: "Foreman" },
  { code: "SUPERVISOR", name: "Supervisor" },
  { code: "TECHNICIAN", name: "Technician" },
  { code: "GENERAL_WORKER", name: "General Worker" },
] as const;

export const DEFAULT_DOCUMENT_TYPES = [
  { code: "IDENTITY_DOCUMENT", name: "Identity Document", requiresExpiryDate: false, isConfidential: true },
  { code: "PASSPORT", name: "Passport", requiresExpiryDate: true, isConfidential: true },
  { code: "WORK_PASS", name: "Work Pass", requiresExpiryDate: true, isConfidential: true },
  { code: "EMPLOYMENT_CONTRACT", name: "Employment Contract", requiresExpiryDate: false, isConfidential: true },
  { code: "EDUCATION_CERTIFICATE", name: "Education Certificate", requiresExpiryDate: false, isConfidential: false },
  { code: "PROFESSIONAL_CERTIFICATE", name: "Professional Certificate", requiresExpiryDate: true, isConfidential: false },
  { code: "LICENCE", name: "Licence", requiresExpiryDate: true, isConfidential: false },
  { code: "SAFETY_CERTIFICATE", name: "Safety Certificate", requiresExpiryDate: true, isConfidential: false },
  { code: "MEDICAL_DOCUMENT", name: "Medical Document", requiresExpiryDate: false, isConfidential: true },
  { code: "BANK_DOCUMENT", name: "Bank Document", requiresExpiryDate: false, isConfidential: true },
  { code: "RESUME", name: "Resume", requiresExpiryDate: false, isConfidential: false },
  { code: "PROFILE_PHOTO", name: "Profile Photo", requiresExpiryDate: false, isConfidential: false },
  { code: "OTHER", name: "Other", requiresExpiryDate: false, isConfidential: false },
] as const;

const DEFAULT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
];
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export const AttendanceStatus = {
  PRESENT: "PRESENT",
  LATE: "LATE",
  HALF_DAY: "HALF_DAY",
  ABSENT: "ABSENT",
  ON_LEAVE: "ON_LEAVE",
  HOLIDAY: "HOLIDAY",
  WEEKEND: "WEEKEND",
  NOT_MARKED: "NOT_MARKED",
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  HALF_DAY: "Half-Day",
  ABSENT: "Absent",
  ON_LEAVE: "On Leave",
  HOLIDAY: "Holiday",
  WEEKEND: "Weekend",
  NOT_MARKED: "Not Marked",
};

/** HALF_DAY and ON_LEAVE are never derived — they only ever come from an
 *  explicit HR correction (see attendance-service.ts's correctAttendance). */
export const AUTO_DERIVED_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.ABSENT,
  AttendanceStatus.HOLIDAY,
  AttendanceStatus.WEEKEND,
  AttendanceStatus.NOT_MARKED,
];

export const AttendanceSource = {
  SELF: "SELF",
  HR_MANUAL: "HR_MANUAL",
  MANAGER_MANUAL: "MANAGER_MANUAL",
  LEAVE: "LEAVE",
} as const;
export type AttendanceSource = (typeof AttendanceSource)[keyof typeof AttendanceSource];

export const LeaveRequestStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
export type LeaveRequestStatus = (typeof LeaveRequestStatus)[keyof typeof LeaveRequestStatus];

export const LEAVE_REQUEST_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/**
 * Working-week definition used to derive Absent/Weekend status. Not yet a
 * UI-editable company setting — documented limitation, matching how other
 * Phase-1 derivation parameters (e.g. availability thresholds) were scoped.
 * JS Date#getDay(): 0=Sun..6=Sat. Default: Mon-Sat working, Sunday off.
 */
export const DEFAULT_WORKING_WEEKDAYS = [1, 2, 3, 4, 5, 6];

export function defaultDocumentTypeSeedRow(
  entry: (typeof DEFAULT_DOCUMENT_TYPES)[number]
) {
  return {
    code: entry.code,
    name: entry.name,
    requiresExpiryDate: entry.requiresExpiryDate,
    isConfidential: entry.isConfidential,
    allowedMimeTypes:
      entry.code === "PROFILE_PHOTO"
        ? ["image/png", "image/jpeg"]
        : DEFAULT_ALLOWED_MIME_TYPES,
    maximumFileSizeBytes: DEFAULT_MAX_FILE_SIZE_BYTES,
  };
}
