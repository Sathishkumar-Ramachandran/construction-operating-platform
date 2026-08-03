"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createCompanySchema, type CreateCompanyInput } from "@/lib/validation/platform-admin";
import { createCompanyAction } from "@/actions/platform-admin-actions";

export function CreateCompanyDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { name: "", slug: "", code: "" },
  });

  async function onSubmit(values: CreateCompanyInput) {
    const result = await createCompanyAction(values);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`${values.name} created.`);
    reset();
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>New company</DialogTitle>
            <DialogDescription>
              Creates the company and seeds its default roles, permissions, and master
              data — the same defaults every company starts with.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Company name</Label>
              <Input id="name" {...register("name")} placeholder="Acme Builders Pte Ltd" />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" {...register("slug")} placeholder="acme-builders" />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
              {errors.slug ? (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="code">Code (optional)</Label>
              <Input id="code" {...register("code")} placeholder="ACME" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create company"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
