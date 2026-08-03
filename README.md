# Construction Operating Platform

A mobile-first, premium **multi-tenant** operating platform unifying HRMS, Payroll, CRM (Lead-to-Delivery), Project Management, and ERP (materials, warehouses, procurement). Each company using the platform (a "tenant") gets fully isolated data — its own employees, projects, leads, materials, and users — behind one shared application.

> **Looking for how to use the app day-to-day?** See the [User Guide](docs/USER_GUIDE.md) — it covers every module, role, and the end-to-end lead-to-delivery workflow. This README is developer/setup-focused.

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
| `SEED_SUPER_ADMIN_NAME` / `_EMAIL` / `_PASSWORD` | `_PASSWORD` is used by `db:seed` as the shared initial password for every seeded per-company user (see [Companies & seeded users](#companies--seeded-users)); `_NAME`/`_EMAIL` are unused by the current seed data but still validated at boot. |
| `SEED_PLATFORM_ADMIN_NAME` / `_EMAIL` / `_PASSWORD` | Used once by `db:seed` to create the initial [Platform Admin](#multi-tenancy--platform-admin) if one doesn't already exist |

The app validates these at boot (`lib/env.ts` + `instrumentation.ts`) and fails fast with a clear error if anything is missing or malformed.

> **Neon / PgBouncer users:** Prisma Migrate needs a direct (non-pooled) connection. If `DATABASE_URL` points at a pooler host (commonly containing `-pooler`), set `DIRECT_URL` to the same database's direct host.

## Install, migrate, seed, run

```bash
npm install
npm run db:generate     # generate the Prisma client
npm run db:migrate      # apply migrations (interactive, dev)
npm run db:seed         # idempotent: seeds companies, roles, permissions, and users — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with one of the [seeded users](#companies--seeded-users) below. **Change that password immediately after first login.**

### Production migrations

```bash
npm run db:migrate:deploy
```

### Companies & seeded users

`prisma/seed.ts` is idempotent and creates two companies, each with a Super Admin and an HR user, all sharing `SEED_SUPER_ADMIN_PASSWORD` as their initial password:

| Company | Slug | Super Admin | HR |
|---|---|---|---|
| Excell Enterprise | `excell-enterprise` | `krish@excellenterprise.com.sg` | `hr@excellenterprise.com.sg` |
| Accessplus | `accessplus` | `krish@accessplus.com.sg` | `hr@accessplus.com.sg` |

Every model in the schema (except `Company`/`PlatformAdmin`/`PlatformAdminSession`) is scoped by `companyId`, enforced centrally — see [Multi-tenancy & Platform Admin](#multi-tenancy--platform-admin). To add another company, sign in to `/platform-admin` (below) rather than hand-editing `prisma/seed.ts`; the seed file is meant to describe this fixed starter set, not every tenant that will ever exist.

## Multi-tenancy & Platform Admin

This is a single application instance serving multiple companies ("tenants"), each with fully isolated data:

- **Tenant scoping**: `lib/db.ts` wraps Prisma in an `AsyncLocalStorage`-based extension. Every `db.<model>.<op>()` call automatically gets `companyId` injected into its `where`/`data` — a call site that isn't wrapped in `withTenant(companyId, fn)` (see the `withTenant*` guards in `lib/auth/guards.ts`) throws loudly instead of silently leaking or returning cross-tenant data. `rawDb` is the deliberate, narrowly-used escape hatch for genuinely cross-tenant code (auth bootstrap, `prisma/seed.ts`, the Platform Admin panel).
- **Company resolution**: single domain, no subdomains/path prefixes. A user's session is pinned to the one company their account belongs to at login.
- **Deactivation**: a company can be deactivated by a Platform Admin — this is checked on every request (not just at login), so it takes effect immediately even for an already-signed-in session.
- **Platform Admin** (`/platform-admin`): a separate identity/table from any per-company `User` (own login, own session cookie, own `requirePlatformAdmin()` guard) — the internal, admin-only control panel used to create new companies, activate/deactivate them, and provision each one's first Admin user. There is no public signup and no per-tenant billing; provisioning is deliberately internal-only.

### Other scripts

```bash
npm run db:studio   # Prisma Studio — inspect the database
npm run lint         # ESLint
npm run test         # Vitest (unit + DB integration tests)
npm run build         # Production build (also type-checks)
```

> The integration tests connect to the real `DATABASE_URL` and exercise the auth/authorization/user-administration service layer directly. They only touch rows they create themselves (all tagged with a `test.excell.internal` email domain and a per-run UUID) and clean up after themselves — they never modify the seeded Super Admin.

## Roles

`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `HR`, `SALES`, `WAREHOUSE_KEEPER`, `TEAM_MEMBER` — see `lib/authorization/roles.ts` and `lib/authorization/permissions.ts` for the full role/permission matrix, and the [User Guide](docs/USER_GUIDE.md#2-roles--what-each-one-can-see) for what each one can see. Every role is scoped per-company — see [Multi-tenancy & Platform Admin](#multi-tenancy--platform-admin).

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

Payroll itself now has its own module (below) — HRMS feeds it via Attendance/Leave. **Not built yet** (no placeholder nav/routes were added for these): Employee Calendar, the interactive Org Graph, background-job-driven expiry notifications, and a template-driven onboarding/offboarding checklist engine (a simplified single-action offboarding flow exists instead).

## Payroll module

`/payroll` — visible to HR/Admin/Super Admin. See the [User Guide](docs/USER_GUIDE.md#5-payroll) for the full monthly Open → Processing → Pending Approval → Approved → Paid → Closed cycle. Highlights for developers:

- **CPF computation** is isolated in `lib/services/cpf-computation-service.ts`, driven by an admin-editable `CpfContributionRate` table (age-banded, effective-dated) rather than hardcoded constants — MOM/CPF rates change periodically.
- **Payroll runs** ride the same generic Approval Engine as everything else (registered as `"PAYROLL_RUN"` in `lib/services/approval-registry.ts`) — preparer (HR) and approver (Admin/Super Admin) are always different people.
- **IR8A export** (`lib/services/iras-export-service.ts`) generates an IRAS-format file for manual upload — no live CPF/IRAS API integration.
- Every employee with a linked account can view their own payslips; only HR/Admin/Super Admin can view everyone's.

## CRM module

`/crm/leads` — visible to Sales/Admin/Super Admin. See the [User Guide](docs/USER_GUIDE.md#6-crm--leads-tenders--quotations) for the full lead lifecycle. A `Lead` forks by `acquisitionPath` into a **Tender** checklist (public-sector BOQ/bid workflow) or a **Quotation** flow (direct/negotiated deals); only Admin/Super Admin can convert a `WON` lead into a real `Project` (`lib/services/lead-conversion-service.ts`), which seeds the project's budget from the tender/quotation and carries over its documents.

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

## ERP module

`/erp` (its own "ERP" nav section) — a tabbed console (Materials & Equipment / Categories / Suppliers), same "one console instead of many URLs" pattern as `/hr-settings`, reusing the generic `MasterDataPage`/`SimpleMasterDataSettings` components (generalized with an optional `apiBasePath`/`queryKeyPrefix` so non-HR modules can reuse them without duplicating the list/toggle table). See the [User Guide](docs/USER_GUIDE.md#8-erp--materials-warehouses-purchase-orders) for the full Warehouse/Purchase Order/Goods Receipt/Stock Transfer workflow.

- **Materials & Equipment**: a unified `Material` catalog (`type: MATERIAL | EQUIPMENT | SERVICE` — one model instead of near-duplicate tables) with code/name/category/unit/reference cost/reorder level. Every material gets a `StockLevel` row per warehouse.
- **Warehouses** (`/erp/warehouses`): stock is tracked **per warehouse** (`[materialId, warehouseId]`), each with an assigned Warehouse Keeper — not one central pool.
- **Purchase Orders** (`/erp/purchase-orders`): `Draft → Submitted → Approved → Partially Received / Received` (or `Cancelled`), riding the same generic Approval Engine (preparer ≠ approver). Goods Receipts write real stock-in `StockTransaction` rows.
- **Stock Transfers** (`/erp/stock-transfers`): `Pending → In Transit → Received`, with two distinct ledger writes (dispatch deducts the source warehouse, receipt credits the destination) matching real goods-in-transit timing.
- **Suppliers/Categories**: simple master-data lookups, identical shape to every other HR/ERP lookup type.

## Roadmap

Phases 0–3 of the original build-out plan (RBAC hardening, Payroll, CRM/Lead-to-Delivery Project Management, ERP + Warehouses) and the multi-tenancy foundation (Company/Platform Admin, `companyId` scoping on every model — see [Multi-tenancy & Platform Admin](#multi-tenancy--platform-admin)) are all complete and verified end-to-end. Deferred, tracked items (not started): a real CRM Client/Account/Contact entity, an Invoice/Payment/AR model beyond Progress Claims, a task-dependency/Change-Order model, ERP 3-way supplier-invoice matching, automatic Budget `actualAmount` population from Payroll/Progress Claims, and proactive expiry-notification jobs. Navigation/IA reorganization into a more integrated feel is deferred until those modules exist to organize around.

## Project structure

```
app/
  (auth)/               Login, change-password (unauthenticated-reachable)
  (protected)/           Every per-company module — dashboard, employees, attendance, leave,
                          payroll, crm, projects, erp, approvals, reports, administration
  platform-admin/         Separate, cross-tenant control panel (its own login/session) — not
                          nested inside (protected); creates/activates companies
actions/                Server Actions, one file per module (auth, employees, payroll, crm, erp, projects, ...)
lib/
  auth/                 Session cookies, current-user resolution, withTenant*/requireUser guards
  authorization/        Role/permission constants, navigation config
  db.ts                 Tenant-scoped Prisma client (AsyncLocalStorage extension) — see
                        Multi-tenancy & Platform Admin, above
  hr/, payroll/, erp/, projects/   Per-module domain constants and pure display helpers
  security/             AES-256-GCM field encryption for sensitive HR data
  services/             Service layer — all business logic and DB transactions live here
  validation/           Zod schemas
components/
  hr/                   Shared HR master-data settings table/dialog components
  layout/               App shell (sidebar, mobile nav, top header)
  shared/                Reusable page-level UI (PageHeader, EmptyState, DocumentManagerPanel, etc.)
  ui/                    shadcn/ui primitives
prisma/                 Schema, migrations, seed script (two companies + their users — see above)
scripts/                One-off/maintenance scripts (drift audit, smoke-test session)
tests/
  unit/                  Pure-logic tests (no DB)
  integration/            Service-layer tests against the real database
  helpers/                Shared test fixtures (actors, HR master data)
proxy.ts                Next.js 16 proxy (formerly "middleware") — optimistic route protection only
```
