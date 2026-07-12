"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordRevealDialog } from "@/components/shared/password-reveal-dialog";
import { createUserSchema, type CreateUserInput } from "@/lib/validation/users";
import { createUserAction } from "@/actions/user-actions";
import { ALL_ROLES, ROLE_LABELS, UserRole } from "@/lib/authorization/roles";

export function CreateUserDialog({
  open,
  onOpenChange,
  canAssignSuperAdmin,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAssignSuperAdmin: boolean;
  onCreated: () => void;
}) {
  const [reveal, setReveal] = useState<{ name: string; password: string } | null>(
    null
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", roleCode: UserRole.TEAM_MEMBER },
  });

  const roleCode = watch("roleCode");
  const assignableRoles = ALL_ROLES.filter(
    (role) => role !== UserRole.SUPER_ADMIN || canAssignSuperAdmin
  );

  async function onSubmit(values: CreateUserInput) {
    const result = await createUserAction(values);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    reset();
    onOpenChange(false);
    onCreated();
    setReveal({ name: result.data.user.name, password: result.data.temporaryPassword });
  }

  return (
    <>
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
              <DialogTitle>Create user</DialogTitle>
              <DialogDescription>
                A secure temporary password is generated automatically and
                shown once after creation. The user must change it on first
                login.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-name">Name</Label>
                <Input id="create-name" {...register("name")} />
                {errors.name ? (
                  <p className="text-xs text-destructive">{errors.name.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-email">Email</Label>
                <Input id="create-email" type="email" {...register("email")} />
                {errors.email ? (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-role">Role</Label>
                <Select
                  value={roleCode}
                  onValueChange={(value) =>
                    value &&
                    setValue("roleCode", value as UserRole, { shouldValidate: true })
                  }
                >
                  <SelectTrigger id="create-role" className="w-full">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create user"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {reveal ? (
        <PasswordRevealDialog
          open={!!reveal}
          title="User created"
          description={`Temporary password for ${reveal.name}. They must change it on first login.`}
          password={reveal.password}
          onDone={() => setReveal(null)}
        />
      ) : null}
    </>
  );
}
