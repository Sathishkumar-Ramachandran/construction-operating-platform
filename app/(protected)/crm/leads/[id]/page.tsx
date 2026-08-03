import { notFound } from "next/navigation";
import Link from "next/link";
import { withTenantUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { Building2, User, Phone, Mail } from "lucide-react";
import { getLeadById, assertActorCanAccessLead } from "@/lib/services/lead-service";
import { listDocumentsFor } from "@/lib/services/project-document-service";
import { LeadStatusBadge } from "@/app/(protected)/crm/leads/lead-status-badge";
import { LeadStatusActions } from "@/app/(protected)/crm/leads/[id]/lead-status-actions";
import { TenderPanel } from "@/app/(protected)/crm/leads/[id]/tender-panel";
import { QuotationPanel } from "@/app/(protected)/crm/leads/[id]/quotation-panel";
import { DocumentManagerPanel } from "@/components/shared/document-manager-panel";
import { LEAD_ACQUISITION_PATH_LABELS, type LeadStatus, type LeadAcquisitionPath } from "@/lib/crm/constants";

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withTenantUser(async (actor) => {
    let lead;
    try {
      await assertActorCanAccessLead(actor, id);
      lead = await getLeadById(id);
    } catch (error) {
      if (isAppError(error)) notFound();
      throw error;
    }

    const [canManageLeads, canConvert, canManageTenders, canManageQuotations, canManageDocuments, documents] =
      await Promise.all([
        hasPermission(actor, PERMISSIONS.CRM_LEADS_MANAGE.code),
        hasPermission(actor, PERMISSIONS.CRM_LEADS_CONVERT.code),
        hasPermission(actor, PERMISSIONS.CRM_TENDERS_MANAGE.code),
        hasPermission(actor, PERMISSIONS.CRM_QUOTATIONS_MANAGE.code),
        hasPermission(actor, PERMISSIONS.PROJECTS_DOCUMENTS_MANAGE.code),
        listDocumentsFor({ leadId: id }),
      ]);

    return (
      <div className="space-y-6">
        <PageHeader
          title={lead.clientName}
          description={`${lead.code} · ${LEAD_ACQUISITION_PATH_LABELS[lead.acquisitionPath as LeadAcquisitionPath]}`}
          actions={<LeadStatusBadge status={lead.status as LeadStatus} />}
        />

        {lead.convertedProject ? (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
            Converted to project{" "}
            <Link href={`/projects/${lead.convertedProject.id}`} className="font-medium underline">
              {lead.convertedProject.name}
            </Link>
          </div>
        ) : null}

        {canManageLeads ? (
          <LeadStatusActions leadId={lead.id} status={lead.status as LeadStatus} canConvert={canConvert} />
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DashboardCard icon={User} label="Contact" value={lead.contactPersonName ?? "—"} />
          <DashboardCard icon={Phone} label="Phone" value={lead.contactPhone ?? "—"} />
          <DashboardCard icon={Mail} label="Email" value={lead.contactEmail ?? "—"} />
          <DashboardCard icon={Building2} label="Estimated value" value={lead.estimatedValue != null ? `$${Number(lead.estimatedValue).toLocaleString()}` : "—"} />
        </div>

        {lead.acquisitionPath === "TENDER" && lead.tender ? (
          <TenderPanel leadId={lead.id} tender={lead.tender as never} canManage={canManageTenders} />
        ) : null}
        {lead.acquisitionPath === "NORMAL" ? (
          <QuotationPanel leadId={lead.id} quotations={lead.quotations as never} canManage={canManageQuotations} />
        ) : null}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-foreground">Documents</h3>
          <DocumentManagerPanel scope={{ leadId: lead.id }} documents={documents as never} canUpload={canManageDocuments} />
        </div>
      </div>
    );
  });
}
