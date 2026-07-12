import { Boxes } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";

export default async function InventoryPage() {
  await requirePermission(PERMISSIONS.INVENTORY_VIEW.code);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Material and inventory management is not built yet."
      />
      <EmptyState
        icon={Boxes}
        title="Inventory management is coming soon"
        description="This module will track materials, stock levels, and supplier deliveries."
      />
    </div>
  );
}
