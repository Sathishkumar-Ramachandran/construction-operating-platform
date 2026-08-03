import { redirect } from "next/navigation";
import { withTenantUser } from "@/lib/auth/guards";
import { getVisibleNavigationHrefs } from "@/lib/authorization/get-visible-navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return withTenantUser(async (user) => {
    if (user.mustChangePassword) {
      redirect("/change-password");
    }

    const visibleHrefs = await getVisibleNavigationHrefs(user);

    return (
      <AppShell visibleHrefs={visibleHrefs} user={user}>
        {children}
      </AppShell>
    );
  });
}
