import type { WorkforceAvailability } from "@/lib/hr/constants";

export type EmployeeListItem = {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string | null;
  preferredName: string | null;
  displayName: string;
  employmentStatus: string;
  workforceAvailability: WorkforceAvailability;
  joiningDate: string;
  department: { id: string; name: string } | null;
  designation: { id: string; name: string } | null;
  reportingManager: { id: string; firstName: string; lastName: string | null } | null;
  userId: string | null;
};

export type EmployeesListResponse = {
  employees: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type MasterDataOption = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
};
