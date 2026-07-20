import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  Users2,
  ListChecks,
  ClipboardCheck,
  UserRound,
  CalendarClock,
  CalendarOff,
  Boxes,
  BarChart3,
  ShieldCheck,
  Settings,
  UserCircle,
  Compass,
  Settings2,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/authorization/permissions";
import { UserRole } from "@/lib/authorization/roles";

export type NavigationItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Item is visible if the user holds ANY of these permissions. */
  permissions?: string[];
  /** Falls back to a role allow-list when no permission code exists yet. */
  roles?: UserRole[];
};

export type NavigationGroup = {
  title: string | null;
  items: NavigationItem[];
};

/**
 * Single source of truth for the sidebar/mobile navigation tree.
 * SUPER_ADMIN always sees every item (enforced in the components that
 * consume this config, mirroring the server-side Super Admin bypass).
 */
export const NAVIGATION: NavigationGroup[] = [
  {
    title: null,
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    title: "My Things",
    items: [
      {
        title: "My Tasks",
        href: "/tasks",
        icon: ListChecks,
        permissions: [PERMISSIONS.PROJECTS_VIEW.code],
      },
      { title: "My Profile", href: "/profile", icon: UserCircle },
    ],
  },
  {
    title: "Management",
    items: [
      {
        title: "Team",
        href: "/team",
        icon: Users2,
        permissions: [PERMISSIONS.TEAM_VIEW.code],
      },
      {
        title: "Approvals",
        href: "/approvals",
        icon: ClipboardCheck,
        permissions: [PERMISSIONS.APPROVALS_VIEW.code],
      },
    ],
  },
  {
    title: "Project Management",
    items: [
      {
        title: "Projects",
        href: "/projects",
        icon: FolderKanban,
        permissions: [PERMISSIONS.PROJECTS_VIEW.code],
      },
    ],
  },
  {
    title: "HRMS",
    items: [
      {
        title: "Employees",
        href: "/employees",
        icon: UserRound,
        permissions: [PERMISSIONS.HR_EMPLOYEE_VIEW.code],
      },
      {
        title: "Availability",
        href: "/employees/availability",
        icon: Compass,
        permissions: [PERMISSIONS.HR_ALLOCATION_VIEW.code],
      },
      {
        title: "Attendance",
        href: "/attendance",
        icon: CalendarClock,
        permissions: [PERMISSIONS.HR_ATTENDANCE_VIEW.code],
      },
      {
        title: "Leave",
        href: "/leave",
        icon: CalendarOff,
        permissions: [PERMISSIONS.HR_LEAVE_VIEW.code],
      },
      {
        title: "HR Settings",
        href: "/hr-settings",
        icon: Settings2,
        permissions: [PERMISSIONS.HR_MASTER_DATA_MANAGE.code, PERMISSIONS.HR_ALLOCATION_MANAGE.code],
      },
    ],
  },
  {
    title: "ERP",
    items: [
      {
        title: "Materials & Suppliers",
        href: "/erp",
        icon: Boxes,
        permissions: [PERMISSIONS.INVENTORY_MANAGE.code],
      },
    ],
  },
  {
    title: "Insights",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        permissions: [PERMISSIONS.REPORTS_VIEW.code],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Users",
        href: "/administration/users",
        icon: Users2,
        permissions: [PERMISSIONS.USERS_VIEW.code],
      },
      {
        title: "Roles",
        href: "/administration/roles",
        icon: ShieldCheck,
        permissions: [PERMISSIONS.ROLES_VIEW.code],
      },
      {
        title: "Settings",
        href: "/administration/settings",
        icon: Settings,
        permissions: [PERMISSIONS.SETTINGS_VIEW.code],
      },
    ],
  },
];
