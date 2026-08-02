import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { db } from "@/lib/db";
import { CpfRatesSettings, type CpfRateRow } from "@/app/(protected)/payroll/settings/cpf-rates-settings";
import { Ir8aExportButton } from "@/app/(protected)/payroll/settings/ir8a-export-button";

export default async function PayrollSettingsPage() {
  await requirePermission(PERMISSIONS.PAYROLL_STRUCTURES_MANAGE.code);

  const rates = await db.cpfContributionRate.findMany({ orderBy: { minAge: "asc" } });
  const ratesView: CpfRateRow[] = rates.map((rate) => ({
    id: rate.id,
    ageBandLabel: rate.ageBandLabel,
    minAge: rate.minAge,
    maxAge: rate.maxAge,
    wageCeiling: rate.wageCeiling.toString(),
    employeeRate: rate.employeeRate.toString(),
    employerRate: rate.employerRate.toString(),
    effectiveFrom: rate.effectiveFrom.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payroll settings"
        description="CPF contribution rates and statutory export tools. Salary structures are managed per-employee on their profile's Payroll tab."
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">CPF contribution rates</h2>
        <CpfRatesSettings rates={ratesView} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Statutory export</h2>
        <p className="text-sm text-muted-foreground">
          Generates a draft annual income summary for IRAS submission. This is a starting-point
          export, not verified against the current IRAS AIS file specification — review before
          filing, and add the full NRIC/FIN manually (only the last 4 digits are included here).
        </p>
        <Ir8aExportButton />
      </section>
    </div>
  );
}
