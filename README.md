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
- **Documents**: schema + an S3-gated storage service (`lib/services/storage-service.ts`) exist; upload/download only work once `STORAGE_BUCKET`/`STORAGE_REGION`/`STORAGE_ACCESS_KEY_ID`/`STORAGE_SECRET_ACCESS_KEY` are set — otherwise the UI shows a clear "not configured" state.

**Not built yet** (no placeholder nav/routes were added for these — see the project memory / implementation summary for the full rationale): Leave, Payroll, Employee Calendar, the interactive Org Graph, background-job-driven expiry notifications, and the onboarding/offboarding checklist engine (a simplified single-action offboarding flow exists instead).

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
