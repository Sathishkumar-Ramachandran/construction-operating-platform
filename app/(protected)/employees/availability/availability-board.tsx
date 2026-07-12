"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Compass } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { WorkforceAvailabilityBadge } from "@/components/shared/workforce-availability-badge";
import { WORKFORCE_AVAILABILITY_LABELS, WorkforceAvailability } from "@/lib/hr/constants";
import type { EmployeesListResponse } from "@/types/employee";

const PAGE_SIZE = 24;
const ALL_STATUSES = Object.values(WorkforceAvailability);

export function AvailabilityBoard() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const [appliedFilters, setAppliedFilters] = useState({ debouncedSearch, statusFilter });
  if (appliedFilters.debouncedSearch !== debouncedSearch || appliedFilters.statusFilter !== statusFilter) {
    setAppliedFilters({ debouncedSearch, statusFilter });
    setPage(1);
  }

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [debouncedSearch, statusFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery<EmployeesListResponse>({
    queryKey: ["employees-availability", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/employees/availability?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load availability.");
      return res.json();
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  // Company-wide counts (independent of the current search/status filter
  // and pagination) so the summary tiles reflect the whole workforce.
  const { data: summaryData } = useQuery<EmployeesListResponse>({
    queryKey: ["employees-availability-summary"],
    queryFn: async () => {
      const res = await fetch(`/api/employees/availability?pageSize=1000`);
      if (!res.ok) throw new Error("Failed to load availability summary.");
      return res.json();
    },
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    const counts: Partial<Record<WorkforceAvailability, number>> = {};
    for (const employee of summaryData?.employees ?? []) {
      const status = employee.workforceAvailability;
      counts[status] = (counts[status] ?? 0) + 1;
    }
    return counts;
  }, [summaryData]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {ALL_STATUSES.map((status) => (
          <div key={status} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{WORKFORCE_AVAILABILITY_LABELS[status]}</p>
            <p className="text-xl font-semibold text-foreground">{summary[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by name or employee number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {WORKFORCE_AVAILABILITY_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.employees.length === 0 ? (
        <EmptyState icon={Compass} title="No employees match" description="Try adjusting your search or filters." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.employees.map((employee) => (
            <Link
              key={employee.id}
              href={`/employees/${employee.id}`}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
            >
              <p className="truncate text-sm font-medium text-foreground">{employee.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {employee.designation?.name ?? "—"} · {employee.department?.name ?? "—"}
              </p>
              <div className="mt-2">
                <WorkforceAvailabilityBadge status={employee.workforceAvailability} />
              </div>
            </Link>
          ))}
        </div>
      )}

      {data && data.total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {data.page} of {totalPages} · {data.total} employees</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
