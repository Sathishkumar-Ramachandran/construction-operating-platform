import { requireApiPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import * as masterData from "@/lib/services/hr-master-data-service";

const LISTERS = {
  departments: masterData.listDepartments,
  designations: masterData.listDesignations,
  grades: masterData.listEmploymentGrades,
  "employment-types": masterData.listEmploymentTypes,
  "project-roles": masterData.listProjectRoles,
  "document-types": masterData.listDocumentTypes,
  "certification-types": masterData.listCertificationTypes,
} as const;

type MasterDataType = keyof typeof LISTERS;

function isMasterDataType(value: string): value is MasterDataType {
  return value in LISTERS;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const guard = await requireApiPermission(PERMISSIONS.HR_MASTER_DATA_MANAGE.code);
  if (guard.response) return guard.response;

  const { type } = await params;
  if (!isMasterDataType(type)) {
    return Response.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const items = await LISTERS[type]();
  return Response.json({ items });
}
