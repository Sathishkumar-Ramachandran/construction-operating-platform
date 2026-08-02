import Link from "next/link";
import { FileText } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { listPurchaseOrders } from "@/lib/services/purchase-order-service";
import { listWarehouses } from "@/lib/services/warehouse-service";
import { listSuppliers, listMaterials } from "@/lib/services/erp-master-data-service";
import { CreatePurchaseOrderDialog } from "@/app/(protected)/erp/purchase-orders/create-purchase-order-dialog";
import { PurchaseOrderStatusBadge } from "@/app/(protected)/erp/purchase-orders/purchase-order-status-badge";
import type { PurchaseOrderStatus } from "@/lib/erp/constants";

export default async function PurchaseOrdersPage() {
  const actor = await requirePermission(PERMISSIONS.ERP_PURCHASE_ORDERS_VIEW.code);
  const canManage = await hasPermission(actor, PERMISSIONS.ERP_PURCHASE_ORDERS_MANAGE.code);

  const [purchaseOrders, warehouses, suppliers, materials] = await Promise.all([
    listPurchaseOrders(),
    listWarehouses(),
    canManage ? listSuppliers() : Promise.resolve([]),
    canManage ? listMaterials() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchase Orders"
        description="Order materials from suppliers for delivery into a warehouse."
        actions={
          canManage ? (
            <CreatePurchaseOrderDialog
              suppliers={suppliers}
              warehouses={warehouses}
              materials={materials.map((m) => ({ id: m.id, code: m.code, name: m.name, unit: m.unit }))}
            />
          ) : null
        }
      />
      {purchaseOrders.length === 0 ? (
        <EmptyState icon={FileText} title="No purchase orders yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-right">Total</TableHead> : null}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium">{po.poNumber}</TableCell>
                <TableCell>{po.supplier.name}</TableCell>
                <TableCell>{po.warehouse.name}</TableCell>
                <TableCell><PurchaseOrderStatusBadge status={po.status as PurchaseOrderStatus} /></TableCell>
                {canManage ? <TableCell className="text-right">${Number(po.totalAmount).toFixed(2)}</TableCell> : null}
                <TableCell>
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/erp/purchase-orders/${po.id}`} />}>
                    Open
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
