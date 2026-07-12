"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, UserCheck, UserX, KeyRound } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RoleBadge } from "@/components/shared/role-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { PasswordRevealDialog } from "@/components/shared/password-reveal-dialog";
import { EditUserDialog } from "@/app/(protected)/administration/users/edit-user-dialog";
import { setUserActiveAction, resetUserPasswordAction } from "@/actions/user-actions";
import { UserRole } from "@/lib/authorization/roles";
import type { AuthenticatedUser } from "@/types/auth";
import type { SafeUserListItem } from "@/types/user-admin";

export function UserTable({
  users,
  actor,
  canResetPassword,
  activeSuperAdminCount,
  onChanged,
}: {
  users: SafeUserListItem[];
  actor: AuthenticatedUser;
  canResetPassword: boolean;
  activeSuperAdminCount: number;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<SafeUserListItem | null>(null);
  const [toggling, setToggling] = useState<SafeUserListItem | null>(null);
  const [resetting, setResetting] = useState<SafeUserListItem | null>(null);
  const [reveal, setReveal] = useState<{ name: string; password: string } | null>(
    null
  );

  function canModify(user: SafeUserListItem) {
    return !(user.role.code === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN);
  }

  function canToggleActive(user: SafeUserListItem) {
    if (!canModify(user)) return false;
    if (user.id === actor.id) return false;
    if (
      user.isActive &&
      user.role.code === UserRole.SUPER_ADMIN &&
      activeSuperAdminCount <= 1
    ) {
      return false;
    }
    return true;
  }

  function canResetFor(user: SafeUserListItem) {
    if (!canResetPassword) return false;
    if (user.id === actor.id) return false;
    return canModify(user);
  }

  return (
    <>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-hidden rounded-xl border border-border sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium text-foreground">
                  {user.name}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role.code} />
                </TableCell>
                <TableCell>
                  <StatusBadge isActive={user.isActive} />
                </TableCell>
                <TableCell>
                  <RowActions
                    user={user}
                    canModify={canModify(user)}
                    canToggleActive={canToggleActive(user)}
                    canReset={canResetFor(user)}
                    onEdit={() => setEditing(user)}
                    onToggle={() => setToggling(user)}
                    onReset={() => setResetting(user)}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 sm:hidden">
        {users.map((user) => (
          <div
            key={user.id}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              </div>
              <RowActions
                user={user}
                canModify={canModify(user)}
                canToggleActive={canToggleActive(user)}
                canReset={canResetFor(user)}
                onEdit={() => setEditing(user)}
                onToggle={() => setToggling(user)}
                onReset={() => setResetting(user)}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <RoleBadge role={user.role.code} />
              <StatusBadge isActive={user.isActive} />
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <EditUserDialog
          user={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
          canAssignSuperAdmin={actor.role === UserRole.SUPER_ADMIN}
          onSaved={onChanged}
        />
      ) : null}

      {toggling ? (
        <ConfirmationDialog
          open={!!toggling}
          onOpenChange={(open) => !open && setToggling(null)}
          title={toggling.isActive ? "Deactivate user" : "Activate user"}
          description={
            toggling.isActive
              ? `${toggling.name} will no longer be able to sign in.`
              : `${toggling.name} will be able to sign in again.`
          }
          confirmLabel={toggling.isActive ? "Deactivate" : "Activate"}
          destructive={toggling.isActive}
          onConfirm={async () => {
            const result = await setUserActiveAction({
              userId: toggling.id,
              isActive: !toggling.isActive,
            });
            if (!result.ok) throw new Error(result.message);
            onChanged();
          }}
        />
      ) : null}

      {resetting ? (
        <ResetPasswordDialog
          user={resetting}
          onOpenChange={(open) => !open && setResetting(null)}
          onReset={(password) => {
            setResetting(null);
            onChanged();
            setReveal({ name: resetting.name, password });
          }}
        />
      ) : null}

      {reveal ? (
        <PasswordRevealDialog
          open={!!reveal}
          title="Password reset"
          description={`New temporary password for ${reveal.name}. All of their existing sessions have been signed out.`}
          password={reveal.password}
          onDone={() => setReveal(null)}
        />
      ) : null}
    </>
  );
}

function ResetPasswordDialog({
  user,
  onOpenChange,
  onReset,
}: {
  user: SafeUserListItem;
  onOpenChange: (open: boolean) => void;
  onReset: (temporaryPassword: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (reason.trim().length < 3) {
      setError("A reason is required.");
      return;
    }
    setSubmitting(true);
    const result = await resetUserPasswordAction({ userId: user.id, reason });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onReset(result.data.temporaryPassword);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            This generates a new temporary password for {user.name} and signs
            them out of every device. This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="reset-reason">Reason</Label>
          <Textarea
            id="reset-reason"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              setError(null);
            }}
            placeholder="e.g. User forgot their password and requested a reset."
            rows={3}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
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

function RowActions({
  user,
  canModify,
  canToggleActive,
  canReset,
  onEdit,
  onToggle,
  onReset,
}: {
  user: SafeUserListItem;
  canModify: boolean;
  canToggleActive: boolean;
  canReset: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
      >
        <MoreHorizontal className="size-4" aria-hidden />
        <span className="sr-only">Actions for {user.name}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!canModify} onClick={onEdit}>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canToggleActive} onClick={onToggle}>
          {user.isActive ? <UserX /> : <UserCheck />}
          {user.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canReset} onClick={onReset}>
          <KeyRound /> Reset password
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
