import { withTenantApiUser } from "@/lib/auth/guards";
import * as masterData from "@/lib/services/hr-master-data-service";
import { ALL_DOCUMENT_TYPE_SCOPES, type DocumentTypeScope } from "@/lib/hr/constants";

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
  request: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  // Any authenticated user, not just HR.MASTER_DATA.MANAGE holders — these
  // lists are just dropdown labels (department/leave-type names, codes,
  // etc.), never sensitive data, and self-service flows (e.g. requesting
  // leave) need to populate them for every role, not only HR/Admin.
  return withTenantApiUser(async () => {
    const { type } = await params;
    if (!isMasterDataType(type)) {
      return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // Only "document-types" is scope-aware today (Employee/Project/Supplier
    // uploads share one table but must not share one undifferentiated list —
    // see DocumentTypeScope in lib/hr/constants.ts). Every other lister
    // ignores the param entirely.
    if (type === "document-types") {
      const scopeParam = new URL(request.url).searchParams.get("scope");
      const items = await masterData.listDocumentTypes(
        isDocumentTypeScope(scopeParam) ? scopeParam : undefined
      );
      return Response.json({ items });
    }

    const items = await LISTERS[type]();
    return Response.json({ items });
  });
}

function isDocumentTypeScope(value: string | null): value is DocumentTypeScope {
  return value !== null && (ALL_DOCUMENT_TYPE_SCOPES as string[]).includes(value);
}
