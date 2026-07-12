"use client";

import { useQuery } from "@tanstack/react-query";
import type { MasterDataOption } from "@/types/employee";

export type MasterDataType =
  | "departments"
  | "designations"
  | "grades"
  | "employment-types"
  | "project-roles"
  | "document-types"
  | "certification-types";

/**
 * Every consumer of `["hr-settings", type]` must resolve to this exact
 * shape (a plain array) — TanStack Query caches by key, not by call site,
 * so a second query using the same key with a differently-shaped result
 * (e.g. `{ items: [...] }`) will silently clobber or be clobbered by this
 * one. Route the option/dropdown fetch through this hook everywhere
 * instead of writing ad hoc `useQuery(["hr-settings", type], ...)` calls.
 */
async function fetchOptions(type: MasterDataType): Promise<MasterDataOption[]> {
  const res = await fetch(`/api/hr-settings/${type}`);
  if (!res.ok) throw new Error(`Failed to load ${type}.`);
  const { items } = await res.json();
  return items;
}

export function useMasterDataOptions(type: MasterDataType) {
  return useQuery({
    queryKey: ["hr-settings", type],
    queryFn: () => fetchOptions(type),
    staleTime: 60_000,
  });
}

function activeOnly(options: MasterDataOption[] | undefined) {
  return (options ?? []).filter((o) => o.isActive !== false);
}

export function useHrMasterDataOptions() {
  const departments = useMasterDataOptions("departments");
  const designations = useMasterDataOptions("designations");
  const grades = useMasterDataOptions("grades");
  const employmentTypes = useMasterDataOptions("employment-types");

  return {
    departments: activeOnly(departments.data),
    designations: activeOnly(designations.data),
    grades: activeOnly(grades.data),
    employmentTypes: activeOnly(employmentTypes.data),
    isLoading:
      departments.isLoading ||
      designations.isLoading ||
      grades.isLoading ||
      employmentTypes.isLoading,
  };
}
