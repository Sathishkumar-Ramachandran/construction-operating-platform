import Link from "next/link";
import { withTenantUser } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shared/page-header";
import { RoleBadge } from "@/components/shared/role-badge";
import { Button } from "@/components/ui/button";

export default async function ProfilePage() {
  return withTenantUser(async (user) => {
    return (
      <div className="space-y-6">
        <PageHeader title="My Profile" description="Your account details." />

        <div className="max-w-lg rounded-xl border border-border bg-card p-6">
          <dl className="divide-y divide-border">
            <div className="flex items-center justify-between py-3 first:pt-0">
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium text-foreground">
                {user.name}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm text-muted-foreground">Email</dt>
              <dd className="text-sm font-medium text-foreground">
                {user.email}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3 last:pb-0">
              <dt className="text-sm text-muted-foreground">Role</dt>
              <dd>
                <RoleBadge role={user.role} />
              </dd>
            </div>
          </dl>
        </div>

        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/profile/security">Change password</Link>}
        />
      </div>
    );
  });
}
