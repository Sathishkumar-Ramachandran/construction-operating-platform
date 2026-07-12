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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { updateUserAction, assignRoleAction } from "@/actions/user-actions";
import { ALL_ROLES, ROLE_LABELS, UserRole } from "@/lib/authorization/roles";
import type { SafeUserListItem } from "@/types/user-admin";

const editUserFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(120),
  roleCode: z.enum(ALL_ROLES as [string, ...string[]]),
});
type EditUserFormValues = z.infer<typeof editUserFormSchema>;

export function EditUserDialog({
  user,
  open,
  onOpenChange,
  canAssignSuperAdmin,
  onSaved,
}: {
  user: SafeUserListItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canAssignSuperAdmin: boolean;
  onSaved: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserFormSchema),
    defaultValues: { name: user.name, roleCode: user.role.code },
  });

  const roleCode = watch("roleCode");
  const assignableRoles = ALL_ROLES.filter(
    (role) =>
      role !== UserRole.SUPER_ADMIN ||
      canAssignSuperAdmin ||
      user.role.code === UserRole.SUPER_ADMIN
  );

  async function onSubmit(values: EditUserFormValues) {
    if (values.name.trim() !== user.name) {
      const result = await updateUserAction({ userId: user.id, name: values.name });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
    }

    if (values.roleCode !== user.role.code) {
      const result = await assignRoleAction({
        userId: user.id,
        roleCode: values.roleCode,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
    }

    toast.success("User updated.");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>{user.email}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" {...register("name")} />
              {errors.name ? (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Select
                value={roleCode}
                onValueChange={(value) =>
                  value && setValue("roleCode", value, { shouldValidate: true })
                }
                disabled={user.role.code === UserRole.SUPER_ADMIN && !canAssignSuperAdmin}
              >
                <SelectTrigger id="edit-role" className="w-full">
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
              {isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
