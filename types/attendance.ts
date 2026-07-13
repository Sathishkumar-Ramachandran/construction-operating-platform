import type { AttendanceStatus } from "@/lib/hr/constants";

export type AttendanceBoardItem = {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  preferredName: string | null;
  displayName: string;
  employmentStatus: string;
  department: { id: string; name: string } | null;
  designation: { id: string; name: string } | null;
  attendanceStatus: AttendanceStatus;
  checkInAt: string | null;
  checkOutAt: string | null;
};

export type AttendanceBoardResponse = {
  employees: AttendanceBoardItem[];
  total: number;
  page: number;
  pageSize: number;
  holidayName: string | null;
};
