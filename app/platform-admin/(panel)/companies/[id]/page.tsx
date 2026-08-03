import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin-guards";
import { getCompanyById } from "@/lib/services/platform-admin-service";
import { isAppError } from "@/lib/errors";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CompanyActiveToggle } from "@/app/platform-admin/(panel)/companies/[id]/company-active-toggle";
import { ProvisionAdminCard } from "@/app/platform-admin/(panel)/companies/[id]/provision-admin-card";

export default async function PlatformAdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformAdmin();
  const { id } = await params;

  let company;
  try {
    company = await getCompanyById(id);
  } catch (error) {
    if (isAppError(error)) notFound();
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/platform-admin"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All companies
        </Link>
        <PageHeader
          title={company.name}
          description={`Slug: ${company.slug}${company.code ? ` · Code: ${company.code}` : ""}`}
          actions={
            <CompanyActiveToggle companyId={company.id} isActive={company.isActive} />
          }
        />
      </div>

      <ProvisionAdminCard companyId={company.id} />

      <div className="rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Users ({company._count.users})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {company.users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>{user.role.code}</TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "default" : "secondary"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {company.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No users yet — provision the first Admin above.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
