"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { PasswordRevealDialog } from "@/components/shared/password-reveal-dialog";
import { createUserSchema, type CreateUserInput } from "@/lib/validation/users";
import { createUserAction, resetUserPasswordAction } from "@/actions/user-actions";
import { ALL_ROLES, ROLE_LABELS, UserRole } from "@/lib/authorization/roles";

export function UserAccessPanel({
  employeeId,
  employeeName,
  linkedUser,
  canCreateUser,
  canResetPassword,
}: {
  employeeId: string;
  employeeName: string;
  linkedUser: { id: string; name: string; email: string; isActive: boolean; lastLoginAt: Date | null } | null;
  canCreateUser: boolean;
  canResetPassword: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [reveal, setReveal] = useState<{ title: string; description: string; password: string } | null>(null);

  if (linkedUser) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">{linkedUser.name}</p>
              <p className="text-xs text-muted-foreground">{linkedUser.email}</p>
            </div>
            <StatusBadge isActive={linkedUser.isActive} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Last login: {linkedUser.lastLoginAt ? new Date(linkedUser.lastLoginAt).toLocaleString() : "Never"}
          </p>
          {canResetPassword ? (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => setResetOpen(true)}>
              Reset password
            </Button>
          ) : null}
        </div>

        {resetOpen ? (
          <ResetDialog
            userId={linkedUser.id}
            userName={linkedUser.name}
            onOpenChange={setResetOpen}
            onDone={(password) =>
              setReveal({
                title: "Password reset",
                description: `New temporary password for ${linkedUser.name}.`,
                password,
              })
            }
          />
        ) : null}

        {reveal ? (
          <PasswordRevealDialog
            open={!!reveal}
            title={reveal.title}
            description={reveal.description}
            password={reveal.password}
            onDone={() => setReveal(null)}
          />
        ) : null}
      </div>
    );
  }

  if (!canCreateUser) {
    return <p className="text-sm text-muted-foreground">This employee doesn&apos;t have a login account.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">This employee doesn&apos;t have a login account yet.</p>
      <Button onClick={() => setCreateOpen(true)}>Create login</Button>

      {createOpen ? (
        <CreateUserForEmployeeDialog
          employeeId={employeeId}
          employeeName={employeeName}
          onOpenChange={setCreateOpen}
          onDone={(name, password) =>
            setReveal({
              title: "User created",
              description: `Temporary password for ${name}. They must change it on first login.`,
              password,
            })
          }
        />
      ) : null}

      {reveal ? (
        <PasswordRevealDialog
          open={!!reveal}
          title={reveal.title}
          description={reveal.description}
          password={reveal.password}
          onDone={() => setReveal(null)}
        />
      ) : null}
    </div>
  );
}

function CreateUserForEmployeeDialog({
  employeeId,
  employeeName,
  onOpenChange,
  onDone,
}: {
  employeeId: string;
  employeeName: string;
  onOpenChange: (open: boolean) => void;
  onDone: (name: string, password: string) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: employeeName, email: "", roleCode: UserRole.TEAM_MEMBER, employeeId },
  });
  const roleCode = watch("roleCode");

  async function onSubmit(values: CreateUserInput) {
    const result = await createUserAction(values);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onOpenChange(false);
    onDone(result.data.user.name, result.data.temporaryPassword);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Create login for {employeeName}</DialogTitle>
            <DialogDescription>
              A secure temporary password is generated automatically and shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Display name</Label>
              <Input {...register("name")} />
              {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Login email</Label>
              <Input type="email" {...register("email")} />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={roleCode} onValueChange={(v) => v && setValue("roleCode", v as UserRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.filter((r) => r !== UserRole.SUPER_ADMIN).map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create login"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ResetDialog({
  userId,
  userName,
  onOpenChange,
  onDone,
}: {
  userId: string;
  userName: string;
  onOpenChange: (open: boolean) => void;
  onDone: (password: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (reason.trim().length < 3) {
      toast.error("A reason is required.");
      return;
    }
    setSubmitting(true);
    const result = await resetUserPasswordAction({ userId, reason });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    onOpenChange(false);
    onDone(result.data.temporaryPassword);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Generates a new temporary password for {userName} and signs them out of every device.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 py-2">
          <Label>Reason</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={submitting}>
            {submitting ? "Resetting…" : "Reset password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
