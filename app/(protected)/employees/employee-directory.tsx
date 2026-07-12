"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserRound, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { EmploymentStatusBadge } from "@/components/shared/employment-status-badge";
import { WorkforceAvailabilityBadge } from "@/components/shared/workforce-availability-badge";
import { ALL_EMPLOYMENT_STATUSES, EMPLOYMENT_STATUS_LABELS } from "@/lib/hr/constants";
import type { EmployeesListResponse } from "@/types/employee";

const PAGE_SIZE = 20;

export function EmployeeDirectory({
  canCreate,
  canExport,
}: {
  canCreate: boolean;
  canExport: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const [appliedFilters, setAppliedFilters] = useState({ debouncedSearch, statusFilter });
  if (
    appliedFilters.debouncedSearch !== debouncedSearch ||
    appliedFilters.statusFilter !== statusFilter
  ) {
    setAppliedFilters({ debouncedSearch, statusFilter });
    setPage(1);
  }

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("employmentStatus", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [debouncedSearch, statusFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery<EmployeesListResponse>({
    queryKey: ["employees", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/employees?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load employees.");
      return res.json();
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name, number, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value ?? "all")}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Employment status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ALL_EMPLOYMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {EMPLOYMENT_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          {canExport ? (
            <Button variant="outline" className="gap-1.5" nativeButton={false} render={
              <a href={`/api/employees/export?${queryParams}`} />
            }>
              <Download className="size-4" aria-hidden /> Export
            </Button>
          ) : null}
          {canCreate ? (
            <Button className="gap-1.5" nativeButton={false} render={<Link href="/employees/new" />}>
              <Plus className="size-4" aria-hidden /> New employee
            </Button>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.employees.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No employees found"
          description="Try adjusting your search or filters, or create a new employee."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      <Link
                        href={`/employees/${employee.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {employee.displayName}
                      </Link>
                      <p className="text-xs text-muted-foreground">{employee.employeeNumber}</p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.designation?.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {employee.department?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      <EmploymentStatusBadge status={employee.employmentStatus} />
                    </TableCell>
                    <TableCell>
                      <WorkforceAvailabilityBadge status={employee.workforceAvailability} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 sm:hidden">
            {data.employees.map((employee) => (
              <Link
                key={employee.id}
                href={`/employees/${employee.id}`}
                className="block rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {employee.displayName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {employee.employeeNumber} · {employee.designation?.name ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <EmploymentStatusBadge status={employee.employmentStatus} />
                  <WorkforceAvailabilityBadge status={employee.workforceAvailability} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      {data && data.total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.page} of {totalPages} · {data.total} employees
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
