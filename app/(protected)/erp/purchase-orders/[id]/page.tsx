import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPurchaseOrderById } from "@/lib/services/purchase-order-service";
import { PurchaseOrderStatusBadge } from "@/app/(protected)/erp/purchase-orders/purchase-order-status-badge";
import { PurchaseOrderActions } from "@/app/(protected)/erp/purchase-orders/[id]/purchase-order-actions";
import { GoodsReceiptDialog } from "@/app/(protected)/erp/purchase-orders/[id]/goods-receipt-dialog";
import type { PurchaseOrderStatus } from "@/lib/erp/constants";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requirePermission(PERMISSIONS.ERP_PURCHASE_ORDERS_VIEW.code);
  const canManage = await hasPermission(actor, PERMISSIONS.ERP_PURCHASE_ORDERS_MANAGE.code);
  const canReceive = await hasPermission(actor, PERMISSIONS.ERP_GOODS_RECEIPT_MANAGE.code);

  let po;
  try {
    po = await getPurchaseOrderById(id, canManage);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  const canPostReceipt = canReceive && (po.status === "APPROVED" || po.status === "PARTIALLY_RECEIVED");

  return (
    <div className="space-y-6">
      <PageHeader
        title={po.poNumber}
        description={`${po.supplier.name} → ${po.warehouse.name}`}
        actions={
          <div className="flex items-center gap-2">
            <PurchaseOrderStatusBadge status={po.status as PurchaseOrderStatus} />
            {canManage ? <PurchaseOrderActions id={po.id} status={po.status} /> : null}
            {canPostReceipt ? <GoodsReceiptDialog purchaseOrderId={po.id} lines={po.lines as never} /> : null}
          </div>
        }
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Material</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Received</TableHead>
            {canManage ? <TableHead className="text-right">Unit Cost</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {po.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.material.name}</TableCell>
              <TableCell>{Number(line.quantityOrdered)} {line.material.unit}</TableCell>
              <TableCell>{Number(line.quantityReceived)} {line.material.unit}</TableCell>
              {canManage ? <TableCell className="text-right">${line.unitCost != null ? Number(line.unitCost).toFixed(2) : "—"}</TableCell> : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {canManage && po.totalAmount != null ? (
        <p className="text-right text-sm font-semibold text-foreground">Total: ${Number(po.totalAmount).toFixed(2)}</p>
      ) : null}

      {po.goodsReceipts.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Goods receipt history</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Received At</TableHead>
                <TableHead>Lines</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.goodsReceipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>{receipt.receivedAt.toLocaleString("en-SG")}</TableCell>
                  <TableCell>{receipt.lines.length} line(s)</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
