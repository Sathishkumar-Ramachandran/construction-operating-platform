import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin-guards";
import { listCompanies } from "@/lib/services/platform-admin-service";
import { PageHeader } from "@/components/shared/page-header";
import { CompaniesList } from "@/app/platform-admin/(panel)/companies-list";

export default async function PlatformAdminCompaniesPage() {
  await requirePlatformAdmin();
  const companies = await listCompanies();

  const companiesView = companies.map((company) => ({
    id: company.id,
    name: company.name,
    slug: company.slug,
    code: company.code,
    isActive: company.isActive,
    userCount: company._count.users,
    employeeCount: company._count.employees,
    projectCount: company._count.projects,
    createdAt: company.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="Every company provisioned on this platform. Create a company, then provision its first Admin user."
      />
      <CompaniesList companies={companiesView} />
      <p className="text-center text-xs text-muted-foreground">
        Looking for a company&apos;s workspace?{" "}
        <Link href="/login" className="underline underline-offset-2">
          Go to the regular sign-in page
        </Link>
        .
      </p>
    </div>
  );
}
