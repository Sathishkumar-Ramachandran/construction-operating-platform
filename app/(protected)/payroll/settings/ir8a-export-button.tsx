"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { exportIr8aAction } from "@/actions/payroll-actions";

export function Ir8aExportButton() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [submitting, setSubmitting] = useState(false);

  async function handleExport() {
    setSubmitting(true);
    const result = await exportIr8aAction(Number(year));
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    const blob = new Blob([result.data.content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1.5">
        <label className="text-sm text-muted-foreground">Year</label>
        <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} className="w-28" />
      </div>
      <Button className="gap-1.5" disabled={submitting} onClick={handleExport}>
        <Download className="size-3.5" aria-hidden /> {submitting ? "Exporting…" : "Export IR8A draft"}
      </Button>
    </div>
  );
}
