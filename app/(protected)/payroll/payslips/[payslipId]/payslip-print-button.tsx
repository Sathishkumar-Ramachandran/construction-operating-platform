"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PayslipPrintButton() {
  return (
    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => window.print()}>
      <Printer className="size-3.5" aria-hidden /> Print / Save as PDF
    </Button>
  );
}
