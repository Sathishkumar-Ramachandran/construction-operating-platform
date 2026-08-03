import { Truck } from "lucide-react";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { listStockTransfers } from "@/lib/services/stock-transfer-service";
import { listWarehouses } from "@/lib/services/warehouse-service";
import { listMaterials } from "@/lib/services/erp-master-data-service";
import { CreateStockTransferDialog } from "@/app/(protected)/erp/stock-transfers/create-stock-transfer-dialog";
import { StockTransferRowActions } from "@/app/(protected)/erp/stock-transfers/stock-transfer-row-actions";
import { STOCK_TRANSFER_STATUS_LABELS } from "@/lib/erp/constants";

export default async function StockTransfersPage() {
  return withTenantPermission(PERMISSIONS.ERP_STOCK_TRANSFERS_MANAGE.code, async () => {
    const [transfers, warehouses, materials] = await Promise.all([
      listStockTransfers(),
      listWarehouses(),
      listMaterials(),
    ]);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Stock Transfers"
          description="Move materials between warehouses. Stock leaves the source on dispatch and only lands in the destination once confirmed received."
          actions={
            <CreateStockTransferDialog
              warehouses={warehouses}
              materials={materials.map((m) => ({ id: m.id, code: m.code, name: m.name, unit: m.unit }))}
            />
          }
        />
        {transfers.length === 0 ? (
          <EmptyState icon={Truck} title="No stock transfers yet" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id}>
                  <TableCell>{transfer.material.name}</TableCell>
                  <TableCell>{transfer.fromWarehouse.name}</TableCell>
                  <TableCell>{transfer.toWarehouse.name}</TableCell>
                  <TableCell>{Number(transfer.quantity)} {transfer.material.unit}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {STOCK_TRANSFER_STATUS_LABELS[transfer.status as keyof typeof STOCK_TRANSFER_STATUS_LABELS]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StockTransferRowActions id={transfer.id} status={transfer.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  });
}
