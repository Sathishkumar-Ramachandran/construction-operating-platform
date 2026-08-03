import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { listWarehouses } from "@/lib/services/warehouse-service";
import { WarehousesSettings } from "@/app/(protected)/erp/warehouses/warehouses-settings";

export default async function WarehousesPage() {
  return withTenantPermission(PERMISSIONS.ERP_WAREHOUSES_MANAGE.code, async () => {
    const warehouses = await listWarehouses();

    return (
      <div className="space-y-6">
        <PageHeader
          title="Warehouses"
          description="Physical stock locations. Stock levels and purchase order deliveries are tracked per warehouse."
        />
        <WarehousesSettings warehouses={warehouses} />
      </div>
    );
  });
}
