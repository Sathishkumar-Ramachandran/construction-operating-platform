import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { ErpTabs } from "@/app/(protected)/erp/erp-tabs";

export default async function ErpPage() {
  await requirePermission(PERMISSIONS.INVENTORY_MANAGE.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="ERP"
        description="Materials, equipment, and suppliers — the catalog Project resource requests and Purchase Orders will draw from."
      />
      <ErpTabs />
    </div>
  );
}
