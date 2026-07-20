"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type EmployeeOption = { id: string; label: string };

/**
 * Searchable employee combobox backed by /api/employees/search — used for
 * any ID-bound picker over the full employee population (reporting manager,
 * department manager, etc.), where a plain <Select> listing every employee
 * doesn't scale.
 */
export function EmployeePicker({
  value,
  onChange,
  excludeId,
  placeholder = "Search employees…",
  disabled,
}: {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  excludeId?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timeout);
  }, [query]);

  const { data, isLoading } = useQuery<{ items: EmployeeOption[] }>({
    queryKey: ["employee-search", debouncedQuery, excludeId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (debouncedQuery) params.set("q", debouncedQuery);
      if (excludeId) params.set("excludeId", excludeId);
      const res = await fetch(`/api/employees/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to search employees.");
      return res.json();
    },
    enabled: open,
  });

  // Resolve the label for the currently-selected value even before the
  // popup has been opened (same problem the systemic Select bug fixes,
  // solved here by fetching the selected employee's own search result).
  const { data: selectedData } = useQuery<{ items: EmployeeOption[] }>({
    queryKey: ["employee-search-selected", value],
    queryFn: async () => {
      const res = await fetch(`/api/employees/search?q=${encodeURIComponent(value ?? "")}`);
      if (!res.ok) throw new Error("Failed to load employee.");
      return res.json();
    },
    enabled: Boolean(value),
  });

  const selectedLabel =
    data?.items.find((i) => i.id === value)?.label ??
    selectedData?.items.find((i) => i.id === value)?.label ??
    null;

  const items = data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
              {selectedLabel ?? placeholder}
            </span>
            <span className="flex items-center gap-1">
              {value ? (
                <X
                  className="size-3.5 text-muted-foreground hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(null);
                  }}
                />
              ) : null}
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </span>
          </Button>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-border p-2">
          <Input
            autoFocus
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {isLoading ? (
            <p className="p-3 text-center text-xs text-muted-foreground">Searching…</p>
          ) : items.length === 0 ? (
            <p className="p-3 text-center text-xs text-muted-foreground">No employees found.</p>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange(item.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Check className={cn("size-3.5 shrink-0", item.id === value ? "opacity-100" : "opacity-0")} />
                <span className="truncate">{item.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
