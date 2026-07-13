"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { AttendanceStatusBadge } from "@/components/shared/attendance-status-badge";
import { CorrectAttendanceDialog } from "@/components/hr/correct-attendance-dialog";
import { ATTENDANCE_STATUS_LABELS, AttendanceStatus } from "@/lib/hr/constants";
import type { AttendanceBoardResponse } from "@/types/attendance";

const PAGE_SIZE = 24;
const ALL_STATUSES = Object.values(AttendanceStatus);

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AttendanceBoard({ canManage }: { canManage: boolean }) {
  const [date, setDate] = useState(todayIso());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [correcting, setCorrecting] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  const [appliedFilters, setAppliedFilters] = useState({ debouncedSearch, date });
  if (appliedFilters.debouncedSearch !== debouncedSearch || appliedFilters.date !== date) {
    setAppliedFilters({ debouncedSearch, date });
    setPage(1);
  }

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set("date", date);
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [date, debouncedSearch, page]);

  const { data, isLoading, isError, refetch } = useQuery<AttendanceBoardResponse>({
    queryKey: ["attendance-board", date, queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/board?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load attendance.");
      return res.json();
    },
  });

  const { data: summaryData } = useQuery<AttendanceBoardResponse>({
    queryKey: ["attendance-summary", date],
    queryFn: async () => {
      const res = await fetch(`/api/attendance/board?date=${date}&pageSize=1000`);
      if (!res.ok) throw new Error("Failed to load attendance summary.");
      return res.json();
    },
    staleTime: 30_000,
  });

  const summary = useMemo(() => {
    const counts: Partial<Record<AttendanceStatus, number>> = {};
    for (const employee of summaryData?.employees ?? []) {
      counts[employee.attendanceStatus] = (counts[employee.attendanceStatus] ?? 0) + 1;
    }
    return counts;
  }, [summaryData]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {ALL_STATUSES.map((status) => (
          <div key={status} className="rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{ATTENDANCE_STATUS_LABELS[status]}</p>
            <p className="text-xl font-semibold text-foreground">{summary[status] ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:max-w-[10rem]" />
        <Input
          placeholder="Search by name or employee number…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
      </div>

      {data?.holidayName ? (
        <p className="text-sm text-muted-foreground">Holiday: {data.holidayName}</p>
      ) : null}

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.employees.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No employees match" description="Try adjusting your search or date." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.employees.map((employee) => (
            <div key={employee.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/employees/${employee.id}`} className="min-w-0 hover:underline">
                  <p className="truncate text-sm font-medium text-foreground">{employee.displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {employee.designation?.name ?? "—"} · {employee.department?.name ?? "—"}
                  </p>
                </Link>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={() => setCorrecting({ id: employee.id, name: employee.displayName })}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <AttendanceStatusBadge status={employee.attendanceStatus} />
                <span className="text-xs text-muted-foreground">
                  {employee.checkInAt
                    ? new Date(employee.checkInAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
              </div>
            </div>
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

      {correcting ? (
        <CorrectAttendanceDialog
          employeeId={correcting.id}
          employeeName={correcting.name}
          date={date}
          onOpenChange={(open) => !open && setCorrecting(null)}
          onCorrected={() => refetch()}
        />
      ) : null}
    </div>
  );
}
