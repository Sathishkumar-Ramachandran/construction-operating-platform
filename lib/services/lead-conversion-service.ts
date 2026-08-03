import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { LeadStatus } from "@/lib/crm/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { reassignLeadDocumentsToProject } from "@/lib/services/project-document-service";
import type { ConvertLeadToProjectInput } from "@/lib/validation/crm";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

/**
 * The one conversion boundary between the pre-project CRM stage and
 * Project — gated on CRM.LEADS.CONVERT (Admin/Super Admin only, since this
 * creates a real financial/operational commitment), and requires the lead
 * to be WON. Everything happens in one transaction: create the Project,
 * flip its documents from the Lead over (no copy — see
 * reassignLeadDocumentsToProject), and mark the Lead CONVERTED.
 */
export async function convertLeadToProject(
  actor: AuthenticatedUser,
  leadId: string,
  input: ConvertLeadToProjectInput,
  meta: ActorMeta = {}
) {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { tender: true, quotations: { where: { status: "ACCEPTED" }, orderBy: { version: "desc" }, take: 1 } },
  });
  if (!lead) throw new AppError(ErrorCode.LEAD_NOT_FOUND);
  if (lead.status !== LeadStatus.WON) throw new AppError(ErrorCode.LEAD_NOT_WON);

  const existingProject = await db.project.findUnique({ where: { sourceLeadId: leadId } });
  if (existingProject) throw new AppError(ErrorCode.LEAD_ALREADY_CONVERTED);

  const existingCode = await db.project.findUnique({
    where: { companyId_code: { companyId: actor.companyId, code: input.code } },
  });
  if (existingCode) throw new AppError(ErrorCode.MASTER_DATA_CODE_ALREADY_EXISTS);

  const estimatedBudget =
    lead.acquisitionPath === "TENDER" ? lead.tender?.bidAmount ?? null : lead.quotations[0]?.totalAmount ?? null;

  const project = await db.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        code: input.code,
        name: input.name,
        clientName: lead.clientName,
        address: input.address || null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        estimatedBudget,
        acquisitionPath: lead.acquisitionPath,
        sourceLeadId: lead.id,
        createdBy: actor.id,
      },
    });

    await reassignLeadDocumentsToProject(tx, lead.id, created.id);

    await tx.lead.update({ where: { id: lead.id }, data: { status: LeadStatus.CONVERTED } });

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.LEAD_CONVERTED_TO_PROJECT,
      entityType: "Project",
      entityId: created.id,
      afterData: { leadId: lead.id, leadCode: lead.code, projectCode: created.code },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return project;
}
