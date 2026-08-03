# Excell Enterprises Construction Operating Platform — User Guide

This guide explains how to use the platform day-to-day: what each module does, who can see and do what, and the step-by-step workflows that connect a sales lead all the way through to a delivered, paid project. It is written for end users (Admins, Managers, HR, Sales, Warehouse Keepers, and site Team Members), not for developers — for architecture and setup, see the root [`README.md`](../README.md).

## Contents

1. [Signing in & your profile](#1-signing-in--your-profile)
2. [Roles & what each one can see](#2-roles--what-each-one-can-see)
3. [Dashboard](#3-dashboard)
4. [HRMS — Employees, Attendance, Leave](#4-hrms--employees-attendance-leave)
5. [Payroll](#5-payroll)
6. [CRM — Leads, Tenders & Quotations](#6-crm--leads-tenders--quotations)
7. [Project Management](#7-project-management)
8. [ERP — Materials, Warehouses, Purchase Orders](#8-erp--materials-warehouses-purchase-orders)
9. [Approvals](#9-approvals)
10. [Reports](#10-reports)
11. [Administration](#11-administration)
12. [End-to-end walkthrough: Lead → Delivery](#12-end-to-end-walkthrough-lead--delivery)
13. [Glossary](#13-glossary)

---

## 1. Signing in & your profile

- The platform is **multi-tenant**: one shared application serves multiple companies, each with its own completely separate data (employees, projects, leads, materials, users). Your account belongs to exactly one company — you never choose a company at login, it's resolved automatically from your email, and everything you see is scoped to it alone. You cannot see or be confused with another company's data through any screen.
- Sign in at the app's login page with the email/password your Administrator gave you. A first-time (or reset) password must be changed at `/profile/security` before you can keep using it — the platform will prompt you.
- **My Profile** (`/profile`) shows your own personal/contact/employment details (whatever your role is allowed to see of itself) and links to **Security** for changing your password.
- The sidebar (desktop) or bottom/hamburger navigation (mobile) only shows the sections you have permission for — if a module you expect is missing, your role doesn't have access to it; ask an Administrator.

The whole app is mobile-first: every screen works on a phone at a site, not just at a desk. Tables collapse to cards, forms stack vertically, and the navigation becomes a bottom bar/drawer on small screens.

## 2. Roles & what each one can see

The platform uses **role-based access control** — every screen and every action checks a permission, and permissions are granted to roles centrally (not per-user). There are seven roles:

| Role | Purpose | Typical access |
|---|---|---|
| **Super Admin** | Owner-level. Full access to everything, always. | Every module, every project, every record. |
| **Admin** | Runs the business day-to-day. | Projects, HR, Payroll, CRM, ERP, Approvals, Administration — everything except being un-removable like Super Admin. |
| **Manager** | Runs specific projects. | Only projects they're assigned to; can manage that project's team, phases, tasks, budget, claims, defects, WBS, and documents; cannot see HR/Payroll/CRM/ERP admin screens. |
| **HR** | Runs people operations. | Employees, Attendance, Leave, Payroll, HR master data. No access to `/projects` or `/tasks` at all — project/site allocation is handled through the **Availability**/allocation tooling in HR Settings instead. |
| **Sales** | Runs the sales pipeline. | CRM Leads they own — can manage a lead's details, log tender progress, and prepare quotations. Cannot convert a lead into a project (that's Admin-only) and has no HR/Payroll/ERP access. |
| **Warehouse Keeper** | Runs a physical warehouse. | Confirms goods receipts against Purchase Orders and completes stock transfers for their assigned warehouse(s). Cannot see supplier pricing, create/approve POs, or touch any other module. |
| **Team Member** | Works on-site. | Only their own assigned project(s), with a stripped-down workspace (their site's Phases, their own Tasks) — no budget, no client contact details, no other team members' data, no confidential documents. |

Two important rules that apply everywhere:
- **Nothing is hard-deleted.** Projects, leads, purchase orders, etc. only ever move forward through a defined status lifecycle (e.g. `DRAFT → ACTIVE → CLOSED`). If something was created by mistake, it gets cancelled/closed, not deleted — this keeps the audit trail intact.
- **Confidential data is stripped server-side for restricted roles**, not just hidden in the UI. A Team Member's view of a project genuinely never receives the client's name, address, or budget in the page data — it isn't sent to their browser at all.

## 3. Dashboard

`/dashboard` is the landing page after login. It surfaces the numbers relevant to your role at a glance (e.g. active projects, pending approvals awaiting you, attendance/leave summaries, payroll status) so you don't have to open every module to see what needs attention.

## 4. HRMS — Employees, Attendance, Leave

### Employees (`/employees`)
The employee directory and each employee's tabbed profile (`/employees/[id]`):
- **Overview / Personal & Contact / Employment** — core record.
- **Bank** — visible only to those with sensitive-data access.
- **Documents** — upload/download employee documents (NRIC/passport, certificates, contracts). Each Designation can require specific document types; the tab shows a "X of Y required documents uploaded" checklist.
- **Work Passes & Licences** — work-pass numbers and expiry tracking for foreign employees.
- **Allocation** — which project(s)/site(s) the employee is currently assigned to (read-only here; assignment happens from the Project's **Team** tab).
- **Attendance** — the employee's attendance history.
- **Payroll** — the employee's salary structure and payslip history (visible to those with payroll access, or to the employee themself for their own record).
- **Lifecycle** — status changes (onboarding → active → offboarding), fully audited.
- **User Access** — the linked login account and role, if any.
- **Audit History** — a full change log for the record.

Creating a new employee (`/employees/new`) walks you through a guided onboarding flow that lands on the Documents tab with the required-documents checklist front and center.

### Availability (`/employees/availability`)
A live Free / In-Project / Partially-Allocated board — this is computed from actual project assignments in real time, not a manually-maintained flag, so it's always correct.

### Attendance (`/attendance`)
- Everyone with a linked employee record can **check in/check out** from this page.
- HR/Admin/Manager additionally see the **Attendance Board**: a date picker and a per-employee daily status (Present/Late/Absent/Holiday/Weekend), computed automatically from check-in time vs. the employee's shift and the holiday calendar. HR can apply manual corrections (e.g. Half-Day, On-Leave) when needed — these are always audited.

### Leave (`/leave`)
- Submit a leave request: leave type, date range (half-day supported on either end), optional reason. Your balance (`entitled + carried forward − used`) is shown live.
- Requests route through the **Approvals** engine to your reporting manager (or any HR user if you have none set).
- HR/Admin/Manager also see the **Team Leave Board** — who's on leave and when, across their team/organisation.
- Leave *types* (Annual, Sick, Hospitalisation, Maternity, Paternity, Shared Parental, Childcare, Compassionate, Unpaid) are configured in HR Settings.

### HR Settings (`/hr-settings`)
A single tabbed console for HR master data: Projects & Sites (allocation view), Departments, Designations, Employment Grades, Employment Types, Project Roles, Document Types, Certification Types, Shift Types, Holidays, Leave Types. Every list supports add/edit/deactivate (not delete) so historical records referencing them stay intact.

## 5. Payroll

`/payroll` — visible to HR/Admin/Super Admin. Payroll runs monthly, in one **Payroll Period** per month, and always follows the same segregation-of-duties cycle so the person who prepares a run is never the only person who can approve it:

1. **Open** — a new period is created for a month. At this point salary structures and recurring allowances/deductions are already on file per employee (managed via each employee's Payroll tab / Payroll Settings).
2. **Processing** — HR runs the calculation: basic pay, allowances, deductions, unpaid-leave/absence adjustments (pulled from Attendance/Leave), employee & employer CPF contributions (Singapore CPF Board age-banded rates, editable in **Payroll Settings → CPF Rates**), and SDL (Skills Development Levy). This produces one **Payslip** per employee with a line-by-line breakdown.
3. **Pending Approval → Approved** — the run goes to an Admin/Super Admin (not the preparer) to review totals and approve, via the Approvals inbox.
4. **Paid → Closed** — once disbursed, the period is marked paid and then closed (terminal — no further edits).

Other things you can do:
- **View a payslip** (`/payroll/payslips/[payslipId]`) — itemised earnings/deductions/employer contributions, printable.
- **IR8A export** (`/payroll/settings`) — generates an IRAS-format file for manual upload to the IRAS portal at year-end. There is no live API integration with CPF/IRAS — exports are files you upload yourself.
- Every employee with a linked account can view **their own** payslips; only HR/Admin/Super Admin can view everyone's.

## 6. CRM — Leads, Tenders & Quotations

`/crm/leads` — this is where every new piece of business starts, **before** it becomes a Project. Visible to Sales/Admin/Super Admin.

### Creating and qualifying a lead
- **New lead**: client name, contact details, source (Referral, Website, Tender Board, Cold Outreach, Repeat Client, Other), and **acquisition path** — this is the key fork:
  - **Tender** — a public-sector (HDB/Town Council/MCST) tender you're bidding on.
  - **Normal** — a direct/negotiated deal, no tender process.
- A lead moves through a path-agnostic funnel: **New → Qualified → In Progress → Negotiation → Won / Lost**. A Sales user manages leads they own; only Admin/Super Admin can mark a lead **Won** as final and convert it.

### Tender path (`Tender` tab on a lead)
For HDB/Town Council tenders, the platform models the real public-sector tender lifecycle as an ordered checklist:

`Document Collection → Site Visit → Query/Clarification → Pricing (BOQ) → Submitted → Tender Opened → Under Evaluation → Awarded / Not Awarded` (or `Withdrawn` at any point before submission).

- **Pricing** is where you build the Bill of Quantities (BOQ) — itemised description/unit/quantity/unit rate lines that roll up to your bid amount.
- You cannot mark a tender **Submitted** without a bid amount set, and you cannot mark it **Awarded/Not Awarded** without having gone through Submitted first — these gates are enforced by the system, not just convention.

### Quotation path (`Quotation` tab on a lead)
For Normal (non-tender) leads, or as a follow-up to a tender award: prepare a versioned **Quotation** (total amount, valid-until date). Status moves `Draft → Sent → Negotiating ⇄ Sent → Accepted/Rejected/Expired`.

### Converting a Won lead into a Project
Once a lead is **Won** (tender awarded, or quotation accepted), an **Admin/Super Admin** converts it into a real Project — a distinct, deliberately gated action (`CRM.LEADS.CONVERT`) separate from day-to-day lead management, since it creates a real financial/operational commitment. Conversion:
- Creates the Project in `DRAFT` status, tagged with its acquisition path (Tender/Normal) and linked back to the source lead.
- Seeds the project's estimated budget from the tender bid amount or accepted quotation total.
- Carries over any documents already uploaded against the lead (BOQ, tender documents, contract) — there's no re-upload step.
- Marks the lead **Converted** (terminal).

## 7. Project Management

`/projects` — the project list (filterable by status) and each project's workspace at `/projects/[id]`. Who sees which projects:
- **Admin/Super Admin**: every project.
- **Manager**: only projects they're actively assigned to.
- **Team Member**: only their assigned project(s), with a reduced set of tabs (see below).
- **HR**: no access here at all — HR's project/site work happens through HR Settings' allocation tooling.

A project's lifecycle is simply `DRAFT → ACTIVE → CLOSED` (Admin/Super Admin only, no delete). Every tab below except Phases/Tasks is hidden entirely for Team Members.

### Overview
Project details (client, description, address, estimated budget, dates) and **site management** — sites (each with a code, name, and current construction-stage badge) are created here.

### Team
Who's assigned to the project (and optionally which site/project role). Managers can assign/end assignments for their own project without needing the org-wide HR allocation permission. A "Mark attendance" action lets a Manager record attendance for their own Team Members directly from this tab.

### Phases
Each **site** progresses independently through Excell's 8-stage repainting/repair execution workflow, shown as a click-to-expand vertical stepper:

1. **Pre-Start / Planning** — site survey, before-photos, method statement, RA/SWP, permits.
2. **Site Setup & Protection** — barricades, protective covering, scaffold/gondola setup, toolbox meeting.
3. **Surface Preparation** — hacking, crack repair, paint removal, pressure-wash.
4. **Repair Works** — plastering, spalling concrete repair, skim coat, sealant.
5. **Painting System Application** — primer + finishing coats, confirm approved paint brand.
6. **Inspection & Touch-Up** — defect rectification, joint inspection with consultant/TC officer.
7. **Cleaning & Dismantling** — remove protection, dismantle scaffold, clear debris.
8. **Handover & Documentation** — final inspection, completion report, warranty, before/after photos, client handover.

Each stage has its own SOP checklist that must be fully checked off before advancing. Stages 1–7 are **self-advanced** by whoever is actively assigned to that site (Manager or Team Member) — no approval needed. The final step, into **Handover & Documentation**, requires **Admin approval** via the Approvals inbox, since that's the point of formal client handover.

### WBS (Work Breakdown Structure)
A hierarchical task tree per project — parent/child tasks with a WBS code, planned start/end dates, assignee, and percent-complete. This gives you planned-vs-actual scheduling on top of the simpler flat Tasks list. Progress can be updated inline by whoever manages WBS, or by the task's own assignee.

### Tasks
A flat, lightweight per-project task list (title, description, assignee, optional site, due date, status `To do → In Progress → Done`/`Cancelled`). Every user also has **My Tasks** (`/tasks`, under "My Things") — a cross-project view of everything assigned to them, regardless of which project it belongs to.

### Inventory Requests
A Manager requests materials/equipment for their project; an Admin approves or rejects it via Approvals. Once approved, fulfilment draws from the ERP warehouse stock (see §8).

### Budget
Budget lines by category (Labour, Material, Equipment, Subcontract, Overhead) with budgeted vs. committed vs. actual amounts — committed amounts populate automatically as Purchase Orders are raised against the project.

### Progress Claims
Monthly interim payment claims (the standard PSSCOC/SIA-style construction billing cycle):

`Draft → Pending Certification → Certified → Paid` (or `Rejected → back to Draft` to revise and resubmit).

A claim records the period, claimed amount, and a retention percentage (5% by default) held back from the certified amount. **Certification is not a dedicated button on this tab** — once you submit a claim, it appears in the **Approvals** inbox for an authorised certifier to certify or reject, keeping preparer and certifier separate.

### Defects (Defects Liability Period)
Log defects reported during the DLP against a project (and optionally a specific site), with due dates. Each defect moves through `Open → In Progress → Rectified → Closed` (or `Disputed` if contested), with the available next steps shown as buttons on each card.

### Documents
Project-level document storage (contracts, tender documents, drawings, BOQ, permits, supplier quotations/invoices/certificates) — the same document manager used for employee documents, scoped to this project. Confidential document types (e.g. Contract, Tender Document) are hidden from restricted viewers.

## 8. ERP — Materials, Warehouses, Purchase Orders

`/erp` — visible to Admin/Super Admin (and Warehouse Keeper for the two operational screens noted below).

### Materials & Suppliers (`/erp`)
A tabbed console, same pattern as HR Settings:
- **Materials & Equipment** — a unified catalog (Material / Equipment / Service) with code, name, category, unit, reference cost, and reorder level. Every material automatically gets a stock-level record.
- **Categories** — simple lookup for organising the catalog.
- **Suppliers** — supplier contact master data.

### Warehouses (`/erp/warehouses`)
Set up one or more physical warehouses (code, name, address), each with an assigned Warehouse Keeper. Stock is tracked **per warehouse**, not in one central pool — every material's on-hand quantity is `[material, warehouse]`-specific.

### Purchase Orders (`/erp/purchase-orders`)
The procurement cycle for restocking a warehouse or fulfilling a project's Inventory Request:

`Draft → Submitted → Approved → Partially Received / Received` (or `Cancelled` at any open stage; a rejected Submitted PO returns to Draft for revision).

1. **Draft** — Admin/Super Admin creates a PO against a supplier and a warehouse (optionally linked to a project), with line items (material, quantity, unit cost).
2. **Submitted → Approved** — goes through the Approvals inbox, same segregation-of-duties pattern as Payroll (preparer ≠ approver).
3. **Goods Receipt** — as deliveries arrive, the Warehouse Keeper (or Admin) records a **Goods Receipt** against the PO (`/erp/purchase-orders/[id]`), which writes real stock-in transactions to that warehouse and updates the PO's status to Partially Received or Received depending on quantities matched.

### Stock Transfers (`/erp/stock-transfers`)
Move stock between two warehouses:

`Pending → In Transit → Received` (or `Cancelled`). The stock is deducted from the source warehouse the moment it goes **In Transit** (dispatched) and only added to the destination warehouse once marked **Received** (confirmed arrival) — two distinct ledger writes, matching real goods-in-transit timing rather than one instantaneous move.

Warehouse Keepers use this screen and the Goods Receipt screen for their assigned warehouse(s) only — they cannot see supplier pricing or create/approve POs.

## 9. Approvals

`/approvals` is a single, unified inbox for every approval decision across the whole platform — Leave requests, Project stage-gate (Handover) approvals, Inventory/Equipment requests, Payroll run approvals, Purchase Order approvals, and Progress Claim certifications all land here. You never need to hunt through a specific module for an "approve" button; if something is waiting on you, it's in this inbox. A few consistent rules apply everywhere:
- You can never approve/reject your own request.
- Every decision is logged (who, when, what) for audit.
- You get an in-app notification (bell icon) the moment a request you submitted is decided.

## 10. Reports

`/reports` — role-appropriate summary reporting across the modules you have access to (project status, attendance/leave trends, payroll costs, ERP stock levels, CRM pipeline), for management visibility without having to open each module individually.

## 11. Administration

Visible to Super Admin/Admin only.

- **Users** (`/administration/users`) — create accounts, assign a role, reset passwords (a server-generated one-time password is shown once). Password changes/resets are always self-service or admin-triggered — there's no email-based reset flow configured yet. This only ever manages users **within your own company** — Admin/Super Admin here still cannot see or affect any other company.
- **Roles** (`/administration/roles`) — a read-only view of each role and the permissions it holds. Role-permission grants are defined in code and reviewed like any other change, not editable live in the UI — this is a deliberate guardrail against accidental privilege drift.
- **Settings** (`/administration/settings`) — application-wide configuration.

### Platform Admin (not a company role)
`/platform-admin` is a completely separate sign-in from everything above — it belongs to the people who run the platform itself, not to any one company. A Platform Admin cannot see any company's employees, projects, or other business data; their control panel only lets them create a new company, activate/deactivate one, and provision that company's very first Admin login (who then takes over from there using their own company's Administration section). If you're a regular user or even a company's Super Admin, this section doesn't apply to you.

## 12. End-to-end walkthrough: Lead → Delivery

This is how a single piece of business flows through every module, start to finish:

1. **Sales** logs a new **Lead** in CRM, picks its acquisition path (Tender or Normal), and works it through New → Qualified → In Progress → Negotiation.
2. **Tender path**: Sales runs the tender checklist (Document Collection → … → Pricing/BOQ → Submitted → Opened → Under Evaluation) and the lead is marked **Won** once **Awarded**.
   **Normal path**: Sales prepares a **Quotation**, sends it, and the lead is marked **Won** once the client **Accepts**.
3. **Admin/Super Admin converts** the Won lead into a real **Project** (`DRAFT`), with budget and documents carried over automatically.
4. Admin sets up the project's **Overview** (client/site details) and **sites**, moves the project to **Active**, and assigns a **Manager** and **Team** on the Team tab.
5. The Manager builds out the **WBS**/**Tasks** and sets **Budget** lines; each site works through the 8-stage **Phases** workflow, self-advancing through the first 7 stages and requiring Admin approval into **Handover & Documentation**.
6. Materials needed on site are requested via **Inventory Requests**, approved by Admin, and fulfilled from ERP **Warehouse** stock — replenished as needed via **Purchase Orders** → **Goods Receipt**.
7. Monthly, the Manager raises a **Progress Claim**; it's certified through **Approvals**, and marked **Paid** once payment is received.
8. Any snags found during the Defects Liability Period are logged on the **Defects** tab and tracked to closure.
9. Meanwhile, HR runs the monthly **Payroll** cycle for everyone working the project (and every other employee), and Reports gives management a running view of project health, cost, and workforce across the whole pipeline.

## 13. Glossary

| Term | Meaning |
|---|---|
| **BOQ** | Bill of Quantities — itemised list of tender/quotation work with quantities and rates. |
| **CPF** | Central Provident Fund — Singapore's mandatory employee/employer retirement savings contribution. |
| **DLP** | Defects Liability Period — the warranty window after handover during which defects are rectified. |
| **HDB** | Housing & Development Board — Singapore's public housing authority; a common tendering client. |
| **IR8A** | The annual IRAS income-reporting form; the platform generates an export file in this format. |
| **MCST** | Management Corporation Strata Title — the governing body of a private strata (condo) development. |
| **PSSCOC** | Public Sector Standard Conditions of Contract — the standard Singapore public-sector construction contract, the basis for the Progress Claim cycle. |
| **SDL** | Skills Development Levy — a small mandatory employer levy on wages. |
| **Town Council** | The body managing common property for HDB estates; a common tendering client alongside HDB itself. |
| **WBS** | Work Breakdown Structure — hierarchical decomposition of project work into schedulable items. |
