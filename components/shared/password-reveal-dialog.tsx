"use client";

import { useState } from "react";
import { Copy, Check, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Shows a generated/temporary password exactly once. The caller must clear
 * its own local copy of the password when `onDone` fires — this component
 * never persists it anywhere beyond its own render.
 */
export function PasswordRevealDialog({
  open,
  title,
  description,
  password,
  onDone,
}: {
  open: boolean;
  title: string;
  description: string;
  password: string;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDone()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
            <code className="select-all break-all font-mono text-sm text-foreground">
              {password}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={handleCopy}
              aria-label="Copy password"
            >
              {copied ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This password is shown only once and cannot be retrieved again.
              Copy it now and share it with the user through a secure
              channel.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onDone} className="w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
