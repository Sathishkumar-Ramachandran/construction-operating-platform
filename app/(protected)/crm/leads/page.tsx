import Link from "next/link";
import { Handshake } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { listLeads } from "@/lib/services/lead-service";
import { db } from "@/lib/db";
import { CreateLeadDialog } from "@/app/(protected)/crm/leads/create-lead-dialog";
import { LeadStatusBadge } from "@/app/(protected)/crm/leads/lead-status-badge";
import { LEAD_ACQUISITION_PATH_LABELS, type LeadStatus, type LeadAcquisitionPath } from "@/lib/crm/constants";

export default async function LeadsPage() {
  const actor = await requirePermission(PERMISSIONS.CRM_LEADS_VIEW.code);
  const canManage = await hasPermission(actor, PERMISSIONS.CRM_LEADS_MANAGE.code);

  const [leads, owners] = await Promise.all([
    listLeads(actor),
    db.user.findMany({
      where: { isActive: true, role: { code: { in: [UserRole.SALES, UserRole.ADMIN, UserRole.SUPER_ADMIN] } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Client-acquisition pipeline — from first contact through Tender or Quotation to a won project."
        actions={canManage ? <CreateLeadDialog owners={owners} defaultOwnerId={actor.id} /> : null}
      />
      {leads.length === 0 ? (
        <EmptyState icon={Handshake} title="No leads yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Estimated Value</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.code}</TableCell>
                <TableCell>{lead.clientName}</TableCell>
                <TableCell>{LEAD_ACQUISITION_PATH_LABELS[lead.acquisitionPath as LeadAcquisitionPath]}</TableCell>
                <TableCell><LeadStatusBadge status={lead.status as LeadStatus} /></TableCell>
                <TableCell className="text-right">
                  {lead.estimatedValue != null ? `$${Number(lead.estimatedValue).toLocaleString()}` : "—"}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/crm/leads/${lead.id}`} />}>
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
