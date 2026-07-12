import { requirePermission } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { hasPermission } from "@/lib/services/authorization-service";
import { PageHeader } from "@/components/shared/page-header";
import { UsersAdministration } from "@/app/(protected)/administration/users/users-administration";

export default async function AdministrationUsersPage() {
  const actor = await requirePermission(PERMISSIONS.USERS_VIEW.code);
  const canResetPassword = await hasPermission(
    actor,
    PERMISSIONS.USERS_RESET_PASSWORD.code
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage platform users, roles, and account status."
      />
      <UsersAdministration actor={actor} canResetPassword={canResetPassword} />
    </div>
  );
}
