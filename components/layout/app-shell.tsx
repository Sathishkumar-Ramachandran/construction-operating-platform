"use client";

import { AuthProvider } from "@/components/providers/auth-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import type { AuthenticatedUser } from "@/types/auth";

export function AppShell({
  visibleHrefs,
  user,
  children,
}: {
  visibleHrefs: string[];
  user: AuthenticatedUser;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider user={user}>
      <div className="flex min-h-svh w-full">
        <Sidebar visibleHrefs={visibleHrefs} user={user} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopHeader visibleHrefs={visibleHrefs} user={user} />
          <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </AuthProvider>
  );
}
