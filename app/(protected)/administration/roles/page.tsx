import { ShieldCheck, Lock } from "lucide-react";
import { withTenantPermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { getRolesWithPermissions } from "@/lib/services/role-service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";

export default async function AdministrationRolesPage() {
  return withTenantPermission(PERMISSIONS.ROLES_VIEW.code, async () => {
    const roles = await getRolesWithPermissions();

    return (
      <div className="space-y-6">
        <PageHeader
          title="Roles"
          description="Roles and the permissions granted to them. The Super Admin role always bypasses permission checks and cannot be edited here."
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-accent">
                    <ShieldCheck className="size-4 text-accent-foreground" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {role.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {role._count.users} user{role._count.users === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                {role.isSystemRole ? (
                  <Badge variant="outline" className="gap-1">
                    <Lock className="size-3" aria-hidden /> System role
                  </Badge>
                ) : null}
              </div>

              {role.description ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {role.description}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-1.5">
                {role.code === "SUPER_ADMIN" ? (
                  <Badge variant="secondary">All permissions (bypass)</Badge>
                ) : role.rolePermissions.length === 0 ? (
                  <span className="text-xs text-muted-foreground">
                    No permissions granted.
                  </span>
                ) : (
                  role.rolePermissions.map((rp) => (
                    <Badge key={rp.id} variant="outline" className="font-normal">
                      {rp.permission.code}
                    </Badge>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  });
}
