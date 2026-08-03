"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordRevealDialog } from "@/components/shared/password-reveal-dialog";
import { provisionFirstAdminAction } from "@/actions/platform-admin-actions";

const formSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(200),
  email: z.email("Enter a valid email address.").max(255).trim(),
});

type FormValues = z.infer<typeof formSchema>;

export function ProvisionAdminCard({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [reveal, setReveal] = useState<{ email: string; password: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  async function onSubmit(values: FormValues) {
    const result = await provisionFirstAdminAction({ companyId, ...values });
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    reset();
    router.refresh();
    setReveal({ email: result.data.email, password: result.data.temporaryPassword });
  }

  return (
    <>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground">Provision an Admin user</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Creates a company Admin with a temporary password shown once. Hand it to
          the company through a secure channel — they&apos;ll be required to change it on
          first login.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="admin-name">Name</Label>
            <Input id="admin-name" {...register("name")} placeholder="Jane Tan" />
            {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
          </div>
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="admin-email">Email</Label>
            <Input
              id="admin-email"
              type="email"
              {...register("email")}
              placeholder="admin@company.com"
            />
            {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating…" : "Provision Admin"}
          </Button>
        </form>
      </div>

      {reveal ? (
        <PasswordRevealDialog
          open
          title="Admin account created"
          description={`Temporary password for ${reveal.email}. It must change on first login.`}
          password={reveal.password}
          onDone={() => setReveal(null)}
        />
      ) : null}
    </>
  );
}
