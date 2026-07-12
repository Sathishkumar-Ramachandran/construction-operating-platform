"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { UserTable } from "@/app/(protected)/administration/users/user-table";
import { CreateUserDialog } from "@/app/(protected)/administration/users/create-user-dialog";
import { ALL_ROLES, ROLE_LABELS } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";
import type { UsersListResponse } from "@/types/user-admin";

const PAGE_SIZE = 20;

export function UsersAdministration({
  actor,
  canResetPassword,
}: {
  actor: AuthenticatedUser;
  canResetPassword: boolean;
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  // Reset to page 1 whenever the filters change. Adjusted during render
  // (React's recommended pattern for derived state) rather than in an
  // effect, which would cause an extra cascading render.
  const [appliedFilters, setAppliedFilters] = useState({
    debouncedSearch,
    roleFilter,
    statusFilter,
  });
  if (
    appliedFilters.debouncedSearch !== debouncedSearch ||
    appliedFilters.roleFilter !== roleFilter ||
    appliedFilters.statusFilter !== statusFilter
  ) {
    setAppliedFilters({ debouncedSearch, roleFilter, statusFilter });
    setPage(1);
  }

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (roleFilter !== "all") params.set("roleCode", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return params.toString();
  }, [debouncedSearch, roleFilter, statusFilter, page]);

  const { data, isLoading, isError, refetch } = useQuery<UsersListResponse>({
    queryKey: ["administration-users", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/administration/users?${queryParams}`);
      if (!res.ok) throw new Error("Failed to load users.");
      return res.json();
    },
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ALL_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value ?? "all")}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" aria-hidden /> Create user
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.users.length === 0 ? (
        <EmptyState
          icon={Users2}
          title="No users found"
          description="Try adjusting your search or filters, or create a new user."
        />
      ) : (
        <UserTable
          users={data.users}
          actor={actor}
          canResetPassword={canResetPassword}
          activeSuperAdminCount={data.users.filter(
            (u) => u.role.code === "SUPER_ADMIN" && u.isActive
          ).length}
          onChanged={() => refetch()}
        />
      )}

      {data && data.total > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {data.page} of {totalPages} · {data.total} users
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

      <CreateUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        canAssignSuperAdmin={actor.role === "SUPER_ADMIN"}
        onCreated={() => refetch()}
      />
    </div>
  );
}
