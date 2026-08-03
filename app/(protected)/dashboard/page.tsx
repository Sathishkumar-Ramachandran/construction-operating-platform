import {
  Users2,
  ShieldCheck,
  Settings,
  FolderKanban,
  Boxes,
  BarChart3,
  UserRound,
  CalendarClock,
  CalendarOff,
  ListChecks,
  ClipboardCheck,
  UserCircle,
  Activity,
  LogIn,
  Building2,
  UserPlus,
  Compass,
  ShieldAlert,
} from "lucide-react";
import { withTenantUser } from "@/lib/auth/guards";
import { hasPermission } from "@/lib/services/authorization-service";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole, ROLE_LABELS } from "@/lib/authorization/roles";
import { getUserAdminSummary, getHrDashboardSummary } from "@/lib/services/dashboard-service";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardCard } from "@/components/shared/dashboard-card";
import { QuickAction } from "@/components/shared/quick-action";
import { EmptyState } from "@/components/shared/empty-state";
import { RoleBadge } from "@/components/shared/role-badge";
import type { AuthenticatedUser } from "@/types/auth";

const today = () =>
  new Date().toLocaleDateString("en-SG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default async function DashboardPage() {
  return withTenantUser(async (user) => {
    const isSuperAdminOrAdmin =
      user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;

    // Called directly (not left as nested JSX) and awaited here so their
    // db calls run while still inside withTenantUser's AsyncLocalStorage
    // context — React defers execution of JSX-referenced async components
    // until after this callback's own promise has already resolved, which
    // would unwind the tenant context before they ever ran.
    const overview = isSuperAdminOrAdmin
      ? await AdminOverview({ role: user.role })
      : await RoleOverview({ user });

    return (
      <div className="space-y-8">
        <PageHeader
          title={`Welcome back, ${user.name.split(" ")[0]}`}
          description={`${today()} · Signed in as`}
          actions={<RoleBadge role={user.role} />}
        />

        {overview}
      </div>
    );
  });
}

async function AdminOverview({ role }: { role: UserRole }) {
  const summary = await getUserAdminSummary();
  const hrSummary = await getHrDashboardSummary();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          System overview
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            icon={Users2}
            label="Active users"
            value={summary.totalActive}
          />
          {summary.byRole.slice(0, 3).map((entry) => (
            <DashboardCard
              key={entry.role}
              icon={ShieldCheck}
              label={entry.label}
              value={entry.count}
              hint="users assigned"
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Workforce</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard icon={UserRound} label="Active employees" value={hrSummary.activeEmployees} />
          <DashboardCard icon={Building2} label="Departments" value={hrSummary.departmentCount} />
          <DashboardCard icon={Compass} label="In project" value={hrSummary.inProject} hint={`${hrSummary.free} free`} />
          <DashboardCard icon={UserPlus} label="New joiners" value={hrSummary.newJoinersThisMonth} hint="this month" />
          <DashboardCard icon={ShieldAlert} label="Work passes expiring" value={hrSummary.expiringWorkPasses} hint="next 90 days" />
          <DashboardCard icon={ShieldAlert} label="Certifications expiring" value={hrSummary.expiringCertifications} hint="next 90 days" />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction
            icon={Users2}
            title="Manage users"
            description="Create, edit, and assign roles"
            href="/administration/users"
          />
          {role === UserRole.SUPER_ADMIN ? (
            <QuickAction
              icon={ShieldCheck}
              title="Manage roles"
              description="Review role permissions"
              href="/administration/roles"
            />
          ) : null}
          <QuickAction
            icon={Settings}
            title="Company settings"
            description="Configuration (coming soon)"
            href="/administration/settings"
          />
          <QuickAction
            icon={FolderKanban}
            title="Projects"
            description="Project workspace (coming soon)"
            href="/projects"
          />
          <QuickAction
            icon={Boxes}
            title="Warehouses"
            description="Materials & stock by warehouse"
            href="/erp/warehouses"
          />
          <QuickAction
            icon={BarChart3}
            title="Reports"
            description="Operational reporting (coming soon)"
            href="/reports"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent login activity
          </h2>
          {summary.recentLogins.length === 0 ? (
            <EmptyState icon={LogIn} title="No login activity yet" />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {summary.recentLogins.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {entry.user?.name ?? entry.user?.email ?? "Unknown user"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.createdAt.toLocaleString("en-SG")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent administrative activity
          </h2>
          {summary.recentAdminActivity.length === 0 ? (
            <EmptyState icon={Activity} title="No administrative activity yet" />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {summary.recentAdminActivity.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-medium text-foreground">
                    {entry.action.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {entry.createdAt.toLocaleString("en-SG")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

const ROLE_QUICK_ACTIONS: Record<
  Exclude<UserRole, "SUPER_ADMIN" | "ADMIN">,
  { icon: typeof FolderKanban; title: string; description: string; href: string }[]
> = {
  MANAGER: [
    { icon: FolderKanban, title: "Projects", description: "Assigned project lifecycle", href: "/projects" },
    { icon: Users2, title: "Team", description: "Your team members", href: "/team" },
    { icon: ListChecks, title: "Tasks", description: "Project tasks", href: "/tasks" },
    { icon: ClipboardCheck, title: "Approvals", description: "Pending approvals", href: "/approvals" },
    { icon: BarChart3, title: "Reports", description: "Project reporting", href: "/reports" },
  ],
  HR: [
    { icon: UserRound, title: "Employees", description: "Employee directory", href: "/employees" },
    { icon: CalendarClock, title: "Attendance", description: "Workforce attendance", href: "/attendance" },
    { icon: CalendarOff, title: "Leave", description: "Leave requests", href: "/leave" },
    { icon: BarChart3, title: "HR reports", description: "HR reporting", href: "/reports" },
  ],
  TEAM_MEMBER: [
    { icon: CalendarClock, title: "My attendance", description: "Your attendance record", href: "/attendance" },
    { icon: ListChecks, title: "My tasks", description: "Your assigned tasks", href: "/tasks" },
    { icon: CalendarOff, title: "My leave", description: "Your leave requests", href: "/leave" },
    { icon: UserCircle, title: "My profile", description: "Account details", href: "/profile" },
  ],
  // No CRM/warehouse pages exist yet (see the platform expansion plan) —
  // quick links here are limited to routes that exist today.
  SALES: [
    { icon: UserCircle, title: "My profile", description: "Account details", href: "/profile" },
  ],
  WAREHOUSE_KEEPER: [
    { icon: UserCircle, title: "My profile", description: "Account details", href: "/profile" },
  ],
};

async function RoleOverview({ user }: { user: AuthenticatedUser }) {
  const role = user.role;
  const actions =
    ROLE_QUICK_ACTIONS[role as Exclude<UserRole, "SUPER_ADMIN" | "ADMIN">];

  const canViewHrSummary =
    role === UserRole.HR && (await hasPermission(user, PERMISSIONS.HR_EMPLOYEE_VIEW.code));
  const hrSummary = canViewHrSummary ? await getHrDashboardSummary() : null;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {ROLE_LABELS[role]} workspace
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <QuickAction key={action.href} {...action} />
          ))}
        </div>
      </section>

      {hrSummary ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">Workforce</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DashboardCard icon={UserRound} label="Active employees" value={hrSummary.activeEmployees} />
            <DashboardCard icon={Compass} label="In project" value={hrSummary.inProject} hint={`${hrSummary.free} free`} />
            <DashboardCard icon={UserPlus} label="New joiners" value={hrSummary.newJoinersThisMonth} hint="this month" />
            <DashboardCard icon={ShieldAlert} label="Expiring passes/certs" value={hrSummary.expiringWorkPasses + hrSummary.expiringCertifications} hint="next 90 days" />
          </div>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Pending work
          </h2>
          <EmptyState
            title="Nothing assigned yet"
            description="Pending tasks and approvals will show up here once project management is enabled."
          />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Recent activity
          </h2>
          <EmptyState
            icon={Activity}
            title="No recent activity"
            description="Your activity history will appear here."
          />
        </section>
      </div>
    </div>
  );
}
