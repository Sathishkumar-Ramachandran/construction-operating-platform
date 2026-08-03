"use client";

import { useQuery } from "@tanstack/react-query";
import type { MasterDataOption } from "@/types/employee";
import type { DocumentTypeScope } from "@/lib/hr/constants";

export type MasterDataType =
  | "departments"
  | "designations"
  | "grades"
  | "employment-types"
  | "project-roles"
  | "document-types"
  | "certification-types"
  | "shift-types";

/**
 * Every consumer of `["hr-settings", type]` must resolve to this exact
 * shape (a plain array) — TanStack Query caches by key, not by call site,
 * so a second query using the same key with a differently-shaped result
 * (e.g. `{ items: [...] }`) will silently clobber or be clobbered by this
 * one. Route the option/dropdown fetch through this hook everywhere
 * instead of writing ad hoc `useQuery(["hr-settings", type], ...)` calls.
 */
async function fetchOptions(type: MasterDataType, scope?: DocumentTypeScope): Promise<MasterDataOption[]> {
  const url = scope ? `/api/hr-settings/${type}?scope=${scope}` : `/api/hr-settings/${type}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${type}.`);
  const { items } = await res.json();
  return items;
}

/** `scope` only applies to (and is only meaningful for) `type: "document-types"`
 * — see DocumentTypeScope in lib/hr/constants.ts. It's folded into the query
 * key so Employee/Project/Supplier document-type dropdowns cache separately
 * instead of clobbering each other. */
export function useMasterDataOptions(type: MasterDataType, options?: { scope?: DocumentTypeScope }) {
  const scope = options?.scope;
  return useQuery({
    queryKey: ["hr-settings", type, scope],
    queryFn: () => fetchOptions(type, scope),
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
  const shiftTypes = useMasterDataOptions("shift-types");

  return {
    departments: activeOnly(departments.data),
    designations: activeOnly(designations.data),
    grades: activeOnly(grades.data),
    employmentTypes: activeOnly(employmentTypes.data),
    shiftTypes: activeOnly(shiftTypes.data),
    isLoading:
      departments.isLoading ||
      designations.isLoading ||
      grades.isLoading ||
      employmentTypes.isLoading ||
      shiftTypes.isLoading,
  };
}
