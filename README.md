# Excell Enterprises — Construction Operating Platform

A mobile-first, premium operating platform unifying HRMS, Project Management, Inventory, Procurement, Attendance, Approvals, and Reporting for Excell Enterprises. This repository currently contains the **platform foundation**: authentication, role-based authorization, the application shell, and user administration. Business modules (HRMS, Projects, Inventory, etc.) are placeholders pending future work.

## Tech stack

- **Next.js 16** (App Router, Turbopack, Node.js runtime)
- **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Prisma 7** ORM + **PostgreSQL** (via `@prisma/adapter-pg`)
- Custom **database-backed session authentication** (bcrypt password hashing, httpOnly cookies)
- **Zod** validation, **React Hook Form**, **TanStack Query**, **Zustand** (UI-only state)
- **shadcn/ui** (Base UI primitives) + **Lucide** icons
- **Vitest** for unit and integration tests

## Prerequisites

- Node.js 20.9+ (Node 24 recommended)
- A PostgreSQL database (this project was built against a [Neon](https://neon.tech) Postgres instance)

## Environment setup

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Runtime connection string (pooled, if your provider supports it) |
| `DIRECT_URL` | Direct/non-pooled connection string, used only for migrations. If your database isn't behind a connection pooler, this can equal `DATABASE_URL`. |
| `AUTH_SECRET` | Long random secret (`openssl rand -base64 32`), used to pepper session-token hashes |
| `AUTH_URL` | Canonical app URL, e.g. `http://localhost:3000` |
| `SEED_SUPER_ADMIN_NAME` / `_EMAIL` / `_PASSWORD` | Used once by `db:seed` to create the initial Super Admin if one doesn't already exist |

The app validates these at boot (`lib/env.ts` + `instrumentation.ts`) and fails fast with a clear error if anything is missing or malformed.

> **Neon / PgBouncer users:** Prisma Migrate needs a direct (non-pooled) connection. If `DATABASE_URL` points at a pooler host (commonly containing `-pooler`), set `DIRECT_URL` to the same database's direct host.

## Install, migrate, seed, run

```bash
npm install
npm run db:generate     # generate the Prisma client
npm run db:migrate      # apply migrations (interactive, dev)
npm run db:seed         # idempotent: seeds roles, permissions, role-permissions, and the Super Admin
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` you configured. **Change that password immediately after first login** — the seed script never overwrites an existing Super Admin's password.

### Production migrations

```bash
npm run db:migrate:deploy
```

### Other scripts

```bash
npm run db:studio   # Prisma Studio — inspect the database
npm run lint         # ESLint
npm run test         # Vitest (unit + DB integration tests)
npm run build         # Production build (also type-checks)
```

> The integration tests connect to the real `DATABASE_URL` and exercise the auth/authorization/user-administration service layer directly. They only touch rows they create themselves (all tagged with a `test.excell.internal` email domain and a per-run UUID) and clean up after themselves — they never modify the seeded Super Admin.

## Roles

`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `HR`, `TEAM_MEMBER` — see `lib/authorization/roles.ts` and `lib/authorization/permissions.ts` for the full role/permission matrix, and `AGENTS.md` for the complete specification this foundation implements.

## HRMS module

Beyond the platform foundation, this repo includes an HRMS foundation phase:

- **User security**: server-generated initial passwords (shown once), administrator password reset (`/administration/users`), self-service password change (`/profile/security`). A forgot-password domain model exists (`lib/services/password-reset-service.ts`) but has no public route yet — no email provider is configured.
- **Employee Master**: `/employees` directory, `/employees/[id]` tabbed profile (personal, contact, employment, bank, documents, work passes/licences, allocation, attendance, lifecycle, user access, audit), `/employees/new` and `/employees/[id]/edit`.
- **HR master data**: `/hr-settings` — a single tabbed console (Projects & Sites, Departments, Designations, Employment Grades, Employment Types, Project Roles, Document Types, Certification Types, Shift Types, Holidays), configurable, not hard-coded. Designations can declare which Document Types they require (e.g. "Foreman" requires a Safety Certificate); the employee profile's Documents tab shows a missing-vs-uploaded checklist derived from that.
- **Allocation & availability**: `/employees/availability` shows real-time Free/In-Project/Partially-Allocated status derived from project assignments (`lib/services/employee-availability-service.ts`), not a stored flag.
- **Attendance**: `/attendance` — self-service check-in/check-out (everyone with a linked employee record) plus, for HR/Admin/Manager, a daily Attendance Board (mirrors the Availability Board: date picker, summary tiles, per-employee status). Daily status (Present/Late/Absent/Holiday/Weekend) is derived on read from check-in time vs. the employee's Shift Type and the Holiday calendar (`lib/services/attendance-service.ts`) — Half-Day/On-Leave only ever come from an explicit HR correction, which is fully audited. No background jobs: absence is computed when the data is viewed, not swept nightly.
- **Documents**: schema + an S3-gated storage service (`lib/services/storage-service.ts`) exist; upload/download only work once `STORAGE_BUCKET`/`STORAGE_REGION`/`STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY` are set — otherwise the UI shows a clear "not configured" state. Creating an employee redirects to a guided onboarding view (`/employees/[id]?onboarding=1`) that pre-selects the Documents tab and shows a "X of Y required documents uploaded" banner.
- **Reporting-manager / department-manager pickers**: `employee-form.tsx`'s Reporting Manager field and `hr-settings`'s Department "Manager" field both use a searchable `EmployeePicker` combobox (`components/hr/employee-picker.tsx`, backed by `/api/employees/search`) rather than a flat dropdown.
- **HR master-data settings** support edit (not just create + toggle-active) for every tab except Holidays (date-keyed, delete/recreate by design) — `components/hr/master-data-page.tsx`'s `renderRowActions` slot.
- **Work location**: `Employee.workLocation` (Office/Site) is a filterable attribute on the directory and profile — office staff and site workers share the same role, distinguished only by this field.
- **Leave**: `/leave` — self-service leave requests (leave type, date range with half-day support on either boundary, optional reason) riding the generic Approval Engine (below) rather than bespoke approval logic; a per-employee balance summary (`entitled + carriedForward - used`, "used" always computed live from approved requests, never stored, to avoid drift); a "Leave Types" tab in `/hr-settings` (Annual, Sick, Hospitalization, Maternity, Paternity, Shared Parental, Childcare, Compassionate, Unpaid seeded by default — NS/Reservist leave is deliberately excluded, deferred to Payroll since it involves make-up-pay claims); and, for HR/Admin/Manager, a team leave board. Approval routes to the requester's reporting manager, falling back to any `HR.LEAVE.MANAGE` holder if none is set. On approval, `ON_LEAVE` `AttendanceRecord` rows are written for the request's working days only (weekends/holidays inside the range are skipped) — the existing Attendance history/board/today-view already prefer a real record over derivation, so no Attendance code needed to change.

**Not built yet** (no placeholder nav/routes were added for these — see the project memory / implementation summary for the full rationale): Payroll (on hold), Employee Calendar, the interactive Org Graph, background-job-driven expiry notifications, and a template-driven onboarding/offboarding checklist engine (a simplified single-action offboarding flow exists instead).

## Approvals

A generic, module-agnostic approval-request engine (`lib/services/approval-service.ts` + `lib/services/approval-registry.ts`) backs `/approvals`. It is not tied to any one feature: a consuming module (Leave, Project stage-gates, and Equipment/resource requests today) registers itself once — supplying `resolveApprovers`/`onApproved`/`onRejected` — and everything else (step sequencing, permission gating, audit logging, in-app notification on decision, and the invariant that nobody can decide their own request) is handled centrally. `ApprovalRequest`/`ApprovalStep` support multi-step chains even though every consumer today only needs one step. A minimal in-app `Notification` model/bell (`components/layout/notification-bell.tsx`) is fed by the approval engine's decision hook; email delivery is not wired up.

This is deliberately built *before* the modules that need approve/reject flows exist, so each new module rides this engine instead of building its own.

## Project Management module

`/projects` (its own "Project Management" nav section) — a project table (filterable by status, gated `PROJECTS.VIEW`) and a per-project workspace (`/projects/[id]`), extending the previously-minimal `Project`/`Site`/`EmployeeProjectAssignment` schema rather than replacing it. Visibility and the workspace itself are both role-scoped (see RBAC below), not just permission-gated. `/tasks` ("My Tasks") lives in a separate personal **"My Things"** nav section alongside "My Profile" — it's cross-project self-service, not project administration, so it doesn't belong under Project Management.

- **Overview ("Project Information")**: project details (client, description, address, estimated budget, dates) **and site management** — sites are created and listed here (code, name, current-stage badge), not in Phases. Only **Admin/Super Admin** (`PROJECTS.MANAGE`) can create/edit projects, add sites, and progress the lifecycle `DRAFT → ACTIVE → CLOSED` — **there is no delete**, matching the platform-wide convention that business entities are only ever created/updated/status-transitioned. HR does not hold `PROJECTS.MANAGE`/`PROJECTS.VIEW` at all — HR's separate `/hr-settings` "Projects & Sites" allocation tooling (`HR.ALLOCATION.MANAGE`) is untouched. Team Management, Phases, Inventory Requests, and Tasks are all usable throughout `ACTIVE`, not gated behind one another — Creation/Closure are the only real lifecycle gates.
- **Team**: project-scoped view of `EmployeeProjectAssignment` (reusing the existing allocation engine's 100%-cap validation), assign/end employees against a project and optionally a site or project role. Managers get this via a narrowly-scoped `PROJECTS.TEAM.MANAGE` permission rather than being granted the broader `HR.ALLOCATION.MANAGE` (which also gates `/hr-settings`) — `lib/auth/guards.ts`'s `requireAnyPermission` helper lets an action accept either. A "Mark attendance" action per row reuses the existing HR `CorrectAttendanceDialog` unmodified, letting a Manager record attendance for their own project's Team Members (not fellow Managers/Admins/HR — "for Managers, HR will put attendance") without holding the org-wide `HR.ATTENDANCE.MANAGE` permission; the write is scoped by a new `assertCanMarkAttendanceForEmployee` check (project-membership, not reporting-chain) and tagged `source: MANAGER_MANUAL` for audit clarity.
- **Phases**: purely per-site stage progression now (site creation moved to Overview, above — a fresh project's Phases tab used to show only an "Add site" button, which read as broken; it wasn't, just poor IA). Each site progresses independently through an 8-stage construction/repainting execution workflow (Pre-Start/Planning → Site Setup & Protection → Surface Preparation → Repair Works → Painting System Application → Inspection & Touch-Up → Cleaning & Dismantling → Handover & Documentation; `lib/projects/constants.ts`), rendered as a vertical click-to-expand stepper — done stages show a checkmark, locked future stages show a lock icon and are inert, and only the current stage expands (inline, no modal) to reveal the advance action. The first 7 stages are **self-advanced** by a Manager/Admin or by any Employee with an active assignment to that exact site — a relationship-scoped check (`isActivelyAssignedToSite`, `assertCanAdvanceSiteStage`), not a permission code. Only the final transition into **Handover & Documentation requires Admin approval**, riding the Approval Engine's `PROJECT_STAGE_GATE` module — decided from the `/approvals` inbox like every other module, no bespoke approve/reject UI. A full `SiteStageHistory` audit trail backs future per-stage duration reporting.
- **Inventory Requests**: a lightweight equipment/material request (`ProjectResourceRequest` — free-text item, quantity, unit, needed-by date; no catalog or stock tracking) a Manager files and an Admin approves/rejects, riding the Approval Engine's `EQUIPMENT_REQUEST` module. **This is scheduled to change**: requests must come from a real ERP material catalog rather than free text — tracked as the next phase (see Roadmap).
- **Tasks**: a lightweight `Task` model (title, description, assignee, optional site, due date, status `TODO → IN_PROGRESS → DONE`/`CANCELLED`) scoped per project. Admin/Manager (`PROJECTS.TASK.MANAGE`) create and assign tasks to the project's active team members; the assignee self-advances their own task (not to `CANCELLED` — only a manager/admin can cancel). `/tasks` ("My Things" nav section) is a real cross-project "My Tasks" view for the signed-in user, and each project workspace also has its own Tasks tab.

**RBAC scoping** — this is enforced server-side, not just hidden in the UI:
- **Admin/Super Admin**: see and manage every project.
- **HR**: no access to `/projects` or `/tasks` at all (nav links hidden); their project/site work happens entirely through `/hr-settings`.
- **Manager**: sees only projects they're actively assigned to, both in the `/projects` list and by direct URL — a new `assertActorCanAccessProject` check (`lib/services/project-service.ts`) closes this at the service layer for every project-scoped write (assignments, resource requests, tasks), not only at the page boundary.
- **Team Member**: sees only their assigned project(s), and within one gets a stripped-down workspace — just the Phases (their own site) and Tasks (their own tasks) tabs, no Overview/Team/Inventory Requests. Confidential fields (client name, address, estimated budget) and other team members' data are stripped **server-side** before the page's props are sent to the browser — not merely hidden by the UI — since anything passed as a prop to a client component ships in the page's data payload regardless of whether it's rendered.

## ERP module (in progress)

`/erp` (its own "ERP" nav section, gated `INVENTORY.MANAGE`) — a tabbed console (Materials & Equipment / Categories / Suppliers), same "one console instead of many URLs" pattern as `/hr-settings`, reusing the generic `MasterDataPage`/`SimpleMasterDataSettings` components (now generalized with an optional `apiBasePath`/`queryKeyPrefix` so non-HR modules can reuse them without duplicating the list/toggle table).

- **Materials & Equipment**: a unified `Material` catalog (`type: MATERIAL | EQUIPMENT | SERVICE` — one model instead of near-duplicate tables) with code/name/category/unit/reference cost/reorder level. Every material gets a `StockLevel` row (starts at 0) the moment it's created.
- **Categories**: simple `MaterialCategory` lookup (code + name), identical shape to every other HR lookup type.
- **Suppliers**: `Supplier` master data (contact, phone, email, address).
- **Stock**: a `StockLevel` (current balance) + `StockTransaction` (immutable ledger — RECEIPT/ISSUE/ADJUSTMENT, never updated/deleted, same audit-trail-not-just-current-state precedent as `SiteStageHistory`) exist in the schema now, **central pool only** (no per-warehouse/per-site dimension, per an explicit scope decision) — the service/UI to actually move stock (Purchase Order receipts, resource-request issues) is the next phase.

**Not yet built** (tracked as the next phases in sequence, see project memory for the full locked domain model): Purchase Orders (riding the existing generic Approval Engine, same as `ProjectResourceRequest` does today), and the integration point that started this — `ProjectResourceRequest.itemDescription` becoming a real `materialId` reference into this catalog instead of free text.

## Roadmap

The build-out order was revised 2026-07-19: the user asked for ERP and CRM to be built now, fully, together — not deferred as originally planned — with the whole app integrated end to end (Materials/Inventory requests must come from a real ERP catalog, not free text; Projects must link to a real CRM Client, not a free-text name). Updated order: HRMS hardening → Approvals engine → Leave → Project Management → **ERP (core catalog done, Purchase Orders + stock movement + PM integration next) + CRM (not started)** → Payroll (on hold) → Onboarding/Offboarding checklists. Tracked as project memory (`project-hrms-phase1`, `project-platform-roadmap`, `project-foundation-stack`) rather than in this file — each phase gets its own detailed plan when picked up.

## Project structure

```
app/                    Routes (App Router) — (auth), (protected) route groups
actions/                Server Actions (auth, user administration, employees, allocation, HR documents, HR master data, projects)
lib/
  auth/                 Session cookies, current-user resolution, requireUser/requireRole/requirePermission guards
  authorization/        Role/permission constants, navigation config
  hr/                   HR domain constants (employment status, workforce availability, etc.) and pure display helpers
  security/             AES-256-GCM field encryption for sensitive HR data
  services/             Service layer — all business logic and DB transactions live here
  validation/           Zod schemas
components/
  hr/                   Shared HR master-data settings table/dialog components
  layout/               App shell (sidebar, mobile nav, top header)
  shared/                Reusable page-level UI (PageHeader, EmptyState, etc.)
  ui/                    shadcn/ui primitives
prisma/                 Schema, migrations, seed script
tests/
  unit/                  Pure-logic tests (no DB)
  integration/            Service-layer tests against the real database
  helpers/                Shared test fixtures (actors, HR master data)
proxy.ts                Next.js 16 proxy (formerly "middleware") — optimistic route protection only
```
