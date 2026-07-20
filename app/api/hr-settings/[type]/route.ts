import { requireApiUser } from "@/lib/auth/guards";
import * as masterData from "@/lib/services/hr-master-data-service";

const LISTERS = {
  departments: masterData.listDepartments,
  designations: masterData.listDesignations,
  grades: masterData.listEmploymentGrades,
  "employment-types": masterData.listEmploymentTypes,
  "project-roles": masterData.listProjectRoles,
  "document-types": masterData.listDocumentTypes,
  "certification-types": masterData.listCertificationTypes,
  "shift-types": masterData.listShiftTypes,
  holidays: masterData.listHolidays,
  "leave-types": masterData.listLeaveTypes,
} as const;

type MasterDataType = keyof typeof LISTERS;

function isMasterDataType(value: string): value is MasterDataType {
  return value in LISTERS;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  // Any authenticated user, not just HR.MASTER_DATA.MANAGE holders — these
  // lists are just dropdown labels (department/leave-type names, codes,
  // etc.), never sensitive data, and self-service flows (e.g. requesting
  // leave) need to populate them for every role, not only HR/Admin.
  const guard = await requireApiUser();
  if (guard.response) return guard.response;

  const { type } = await params;
  if (!isMasterDataType(type)) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const items = await LISTERS[type]();
  return Response.json({ items });
}
