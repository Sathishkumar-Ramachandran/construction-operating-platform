import { db } from "@/lib/db";
import { AppError, ErrorCode } from "@/lib/errors";
import { AuditAction, recordAuditLog } from "@/lib/services/audit-service";
import type { SetBudgetLineInput } from "@/lib/validation/projects";
import type { AuthenticatedUser } from "@/types/auth";

type ActorMeta = { ipAddress?: string | null; userAgent?: string | null };

export async function listBudgetLinesForProject(projectId: string) {
  return db.projectBudgetLine.findMany({ where: { projectId }, orderBy: { category: "asc" } });
}

export async function setBudgetLine(
  actor: AuthenticatedUser,
  input: SetBudgetLineInput,
  meta: ActorMeta = {}
) {
  const line = input.id
    ? await db.projectBudgetLine.update({
        where: { id: input.id },
        data: {
          category: input.category,
          description: input.description || null,
          budgetedAmount: input.budgetedAmount,
          actualAmount: input.actualAmount ?? undefined,
        },
      })
    : await db.projectBudgetLine.create({
        data: {
          projectId: input.projectId,
          category: input.category,
          description: input.description || null,
          budgetedAmount: input.budgetedAmount,
        },
      });

  await recordAuditLog(db, {
    userId: actor.id,
    action: AuditAction.BUDGET_LINE_SET,
    entityType: "ProjectBudgetLine",
    entityId: line.id,
    afterData: { category: line.category, budgetedAmount: line.budgetedAmount.toString() },
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });

  return line;
}

export async function deleteBudgetLine(id: string) {
  const line = await db.projectBudgetLine.findUnique({ where: { id } });
  if (!line) throw new AppError(ErrorCode.NOT_FOUND);
  return db.projectBudgetLine.delete({ where: { id } });
}
