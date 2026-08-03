import "dotenv/config";
import { rawDb } from "@/lib/db";

/**
 * One-time data migration (Part B.5, step 3 of the multi-tenancy plan):
 * creates a single default Company ("Excell Enterprises") and assigns every
 * existing row across every tenant-scoped model to it. Must run after the
 * `companyId` columns exist (nullable) but before lib/db.ts's Prisma
 * extension starts requiring tenant context on every query — this script
 * uses the plain, unscoped client deliberately.
 *
 * Idempotent: re-running only touches rows still missing a companyId.
 *
 * This list must stay in sync with every tenant-scoped model in
 * prisma/schema.prisma (everything except Company/PlatformAdmin/
 * PlatformAdminSession).
 */
const SCOPED_MODEL_ACCESSORS = [
  "user", "role", "permission", "rolePermission", "session", "auditLog",
  "passwordResetToken", "department", "designation", "designationRequiredDocument",
  "employmentGrade", "employmentType", "projectRole", "documentType",
  "certificationType", "employeeNumberSequence", "employee", "employeeAddress",
  "emergencyContact", "employeeBankAccount", "employeeStatusHistory",
  "salaryStructure", "compensationComponent", "payrollPeriod", "payslip",
  "payslipLineItem", "cpfContributionRate", "project", "site",
  "siteStageChecklistItem", "siteStageHistory", "projectResourceRequest", "task",
  "employeeProjectAssignment", "employeeAvailabilityOverride", "employeeDocument",
  "workPass", "employeeCertification", "shiftType", "holiday", "attendanceRecord",
  "leaveType", "leaveBalance", "leaveRequest", "approvalRequest", "approvalStep",
  "notification", "lead", "tender", "quotation", "pricingLine", "projectDocument",
  "projectBudgetLine", "progressClaim", "defectItem", "materialCategory",
  "material", "supplier", "warehouse", "stockLevel", "stockTransaction",
  "purchaseOrder", "purchaseOrderLine", "goodsReceipt", "goodsReceiptLine",
  "supplierDocument", "stockTransfer",
] as const;

const DEFAULT_COMPANY_NAME = "Excell Enterprises";
const DEFAULT_COMPANY_SLUG = "excell-enterprises";

async function main() {
  const company = await rawDb.company.upsert({
    where: { slug: DEFAULT_COMPANY_SLUG },
    create: { name: DEFAULT_COMPANY_NAME, slug: DEFAULT_COMPANY_SLUG },
    update: {},
  });
  console.log(`Default company: ${company.name} (${company.id})`);

  for (const accessor of SCOPED_MODEL_ACCESSORS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (rawDb as any)[accessor];
    const { count } = await model.updateMany({
      where: { companyId: null },
      data: { companyId: company.id },
    });
    if (count > 0) console.log(`  ${accessor}: backfilled ${count} row(s)`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await rawDb.$disconnect();
  });
