"use client";

import { useQuery } from "@tanstack/react-query";
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
import { StatusBadge } from "@/components/shared/status-badge";
import { LoadingState } from "@/components/shared/loading-state";
import { EmptyState } from "@/components/shared/empty-state";
import { Switch } from "@/components/ui/switch";

export type MasterDataRow = {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  [key: string]: unknown;
};

/** Shared list+toggle table for a single HR master-data entity type. Each
 * settings page supplies its own create dialog (fields differ per type) and
 * mounts it via `renderCreateAction`. */
export function MasterDataPage({
  apiType,
  extraColumns,
  onToggleActive,
  renderCreateAction,
}: {
  apiType: string;
  extraColumns?: { header: string; render: (row: MasterDataRow) => React.ReactNode }[];
  onToggleActive?: (row: MasterDataRow, isActive: boolean) => Promise<void>;
  renderCreateAction: (onCreated: () => void) => React.ReactNode;
}) {
  // Cached under the same ["hr-settings", apiType] key as useMasterDataOptions,
  // so this must resolve to the identical shape (a plain array) — see the
  // warning in components/hr/use-master-data-options.ts.
  const { data, isLoading, refetch } = useQuery<MasterDataRow[]>({
    queryKey: ["hr-settings", apiType],
    queryFn: async () => {
      const res = await fetch(`/api/hr-settings/${apiType}`);
      if (!res.ok) throw new Error("Failed to load.");
      const { items } = await res.json();
      return items;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">{renderCreateAction(() => refetch())}</div>

      {isLoading ? (
        <LoadingState rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={Plus} title="Nothing here yet" description="Add the first entry to get started." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                {(extraColumns ?? []).map((col) => (
                  <TableHead key={col.header}>{col.header}</TableHead>
                ))}
                {onToggleActive ? <TableHead>Active</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{row.code}</TableCell>
                  <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                  {(extraColumns ?? []).map((col) => (
                    <TableCell key={col.header}>{col.render(row)}</TableCell>
                  ))}
                  {onToggleActive ? (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={row.isActive !== false}
                          onCheckedChange={async (checked) => {
                            try {
                              await onToggleActive(row, checked);
                              refetch();
                            } catch {
                              toast.error("Failed to update.");
                            }
                          }}
                        />
                        <StatusBadge isActive={row.isActive !== false} />
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

