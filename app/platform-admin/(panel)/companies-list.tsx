"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreateCompanyDialog } from "@/app/platform-admin/(panel)/create-company-dialog";
import { setCompanyActiveAction } from "@/actions/platform-admin-actions";

export type CompanyView = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  isActive: boolean;
  userCount: number;
  employeeCount: number;
  projectCount: number;
  createdAt: string;
};

export function CompaniesList({ companies }: { companies: CompanyView[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  async function handleToggleActive(company: CompanyView, isActive: boolean) {
    const result = await setCompanyActiveAction({ companyId: company.id, isActive });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(isActive ? `${company.name} activated.` : `${company.name} deactivated.`);
    router.refresh();
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              {companies.length} {companies.length === 1 ? "company" : "companies"}
            </h2>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            New company
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Employees</TableHead>
                <TableHead className="text-right">Projects</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium text-foreground">
                    <Link
                      href={`/platform-admin/companies/${company.id}`}
                      className="hover:underline"
                    >
                      {company.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {company.slug}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{company.userCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {company.employeeCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {company.projectCount}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={company.isActive}
                        onCheckedChange={(checked) => handleToggleActive(company, checked)}
                      />
                      <Badge variant={company.isActive ? "default" : "secondary"}>
                        {company.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {companies.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    No companies yet — create the first one.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      <CreateCompanyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => router.refresh()}
      />
    </>
  );
}
