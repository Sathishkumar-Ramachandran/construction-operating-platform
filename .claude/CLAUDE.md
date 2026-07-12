@AGENTS.md

## Project Overview

You are working on a full-stack web application built with **Next.js 16** for **Excell Enterprises**, a Singapore-based construction company.

## Development Guidelines
1. Always Plan first with existing `claude directory`
2. Architect as a Software Architect with mobile first & premium mindset
3. Then apply the design
4. Update the documentation & Claude Memory.

The product is a **Construction Operating Platform** designed to unify and digitize the company's core business operations across:

- Human Resource Management System (HRMS)
- Project Management
- Inventory and Material Management
- Procurement
- Attendance and Workforce Management
- Reporting and Management Dashboards
- Approval Workflows
- Construction Operations

This is a **single-client, single-tenant application**. Do not introduce SaaS multi-tenancy, tenant billing, tenant onboarding, cross-tenant isolation, or platform-level tenant administration unless explicitly requested.

The application must be:

- Mobile-first
- Premium in visual quality, Blue White and Gold Based color pattern.
- Highly usable for both office and construction-site users
- Responsive across mobile, tablet, laptop, and desktop
- Modular and maintainable
- Production-grade
- Secure and auditable
- Optimized for unreliable construction-site connectivity where applicable
- `Docs` to updated by following Software Engineering Best practices.
- Use `public\Logo.png` for logo of the company.

---

# 1. Core Product Vision

The platform should connect:

→ People
→ Projects
→ Sites
→ Tasks
→ Attendance
→ Materials
→ Suppliers
→ Costs
→ Progress
→ Approvals
→ Reports


# 2. Tech Stack 
Frontend

Use:

Next.js 16
React
TypeScript
App Router
Server Components where appropriate
Client Components only when interactivity requires them
Tailwind CSS
shadcn/ui where useful
Lucide icons
TanStack Query for server-state management
React Hook Form for forms
Zod for validation
Zustand only for lightweight client-side state where necessary
Backend

Preferred architecture:

Next.js 16 application
Route Handlers and Server Actions for application APIs where suitable
A clean service layer
PostgreSQL as the primary transactional database
Prisma or Drizzle ORM, based on the existing repository choice
Redis only where caching, sessions, locks, or queues are justified
Object storage for files and images
Background jobs for reports, notifications, imports, exports, and long-running processes

Do not introduce microservices unless explicitly requested.

Deployment Model

(Entire NextJS App is gonna be deployed in AWS Amplify)

Use a modular monolith:

Next.js Web Application
        │
        ▼
Application Services
        │
        ▼
PostgreSQL
        │
        ├── Object Storage (S3)
        └── Background Jobs

Do not introduce the following by default:

Kubernetes
Kafka
Event sourcing
Graph databases
Multiple databases per module
Multi-tenant architecture
Data lake
Complex distributed systems