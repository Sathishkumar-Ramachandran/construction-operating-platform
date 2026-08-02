import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { LeadStatus, isLeadStatusTransitionAllowed } from "@/lib/crm/constants";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";
import type { CreateLeadInput, UpdateLeadInput, ChangeLeadStatusInput } from "@/lib/validation/crm";
import type { AuthenticatedUser } from "@/types/auth";
import type { Prisma } from "@/generated/prisma/client";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

async function nextLeadCode(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await db.lead.count({ where: { code: { startsWith: `LD-${year}-` } } });
  return `LD-${year}-${String(count + 1).padStart(4, "0")}`;
}

/** SALES sees/manages only leads it owns; Admin/Super Admin see everything
 * — same "assignment-scoped vs. Admin sees all" shape as
 * assertActorCanAccessProject in project-service.ts. */
export async function assertActorCanAccessLead(actor: AuthenticatedUser, leadId: string): Promise<void> {
  if (actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.ADMIN) return;

  const lead = await db.lead.findUnique({ where: { id: leadId }, select: { ownerUserId: true } });
  if (!lead || lead.ownerUserId !== actor.id) {
    throw new AppError(ErrorCode.LEAD_NOT_FOUND);
  }
}

export async function listLeads(actor: AuthenticatedUser) {
  const isScoped = actor.role !== UserRole.SUPER_ADMIN && actor.role !== UserRole.ADMIN;
  return db.lead.findMany({
    where: isScoped ? { ownerUserId: actor.id } : {},
    orderBy: { createdAt: "desc" },
  });
}

export async function getLeadById(id: string) {
  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      tender: { include: { lines: true } },
      quotations: { include: { lines: true }, orderBy: { version: "desc" } },
      convertedProject: { select: { id: true, code: true, name: true } },
    },
  });
  if (!lead) throw new AppError(ErrorCode.LEAD_NOT_FOUND);
  return lead;
}

export async function createLead(actor: AuthenticatedUser, input: CreateLeadInput, meta: ActorMeta = {}) {
  const code = await nextLeadCode();

  const lead = await db.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: {
        code,
        clientName: input.clientName,
        contactPersonName: input.contactPersonName || null,
        contactPhone: input.contactPhone || null,
        contactEmail: input.contactEmail || null,
        source: input.source ?? null,
        acquisitionPath: input.acquisitionPath,
        estimatedValue: input.estimatedValue ?? null,
        ownerUserId: input.ownerUserId,
        createdBy: actor.id,
      },
    });

    // A TENDER-path lead always gets its Tender row created up front (1:1,
    // empty) so tender-service.ts never has to distinguish "not started"
    // from "doesn't exist" — mirrors how a Project always has its
    // EmployeeProjectAssignment relation ready to populate, never lazily
    // created on first use.
    if (input.acquisitionPath === "TENDER") {
      await tx.tender.create({ data: { leadId: created.id } });
    }

    await recordAuditLog(tx, {
      userId: actor.id,
      action: AuditAction.LEAD_CREATED,
      entityType: "Lead",
      entityId: created.id,
      afterData: { code, clientName: input.clientName, acquisitionPath: input.acquisitionPath },
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return created;
  });

  return lead;
}

export async function updateLead(
  actor: AuthenticatedUser,
  id: string,
  input: UpdateLeadInput,
  meta: ActorMeta = {}
) {
  await assertActorCanAccessLead(actor, id);
  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) throw new AppError(ErrorCode.LEAD_NOT_FOUND);

  // Only Admin/Super Admin may reassign ownership away from themselves —
  // a Sales rep changing their own leads' owner would let them hand off
  // (or grab) leads outside their CRM.LEADS.MANAGE scope.
  const canReassignOwner = await hasPermission(actor, PERMISSIONS.CRM_LEADS_CONVERT.code);
  const ownerUserId = canReassignOwner ? input.ownerUserId : existing.ownerUserId;

  const lead = await db.lead.update({
    where: { id },
    data: {
      clientName: input.clientName,
      contactPersonName: input.contactPersonName || null,
      contactPhone: input.contactPhone || null,
      contactEmail: input.contactEmail || null,
      estimatedValue: input.estimatedValue ?? null,
      ownerUserId,
    },
  });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.MASTER_DATA_UPDATED,
    entityType: "Lead",
    entityId: lead.id,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return lead;
}

export async function changeLeadStatus(
  actor: AuthenticatedUser,
  id: string,
  input: ChangeLeadStatusInput,
  meta: ActorMeta = {}
) {
  await assertActorCanAccessLead(actor, id);
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) throw new AppError(ErrorCode.LEAD_NOT_FOUND);

  if (!isLeadStatusTransitionAllowed(lead.status as LeadStatus, input.status as LeadStatus)) {
    throw new AppError(ErrorCode.LEAD_INVALID_STATUS_TRANSITION);
  }

  const data: Prisma.LeadUpdateInput = { status: input.status };
  if (input.status === LeadStatus.LOST) {
    data.lostReason = input.lostReason || null;
  }

  const updated = await db.lead.update({ where: { id }, data });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.LEAD_STATUS_CHANGED,
    entityType: "Lead",
    entityId: id,
    beforeData: { status: lead.status },
    afterData: { status: input.status },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return updated;
}
