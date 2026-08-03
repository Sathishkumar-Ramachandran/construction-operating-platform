-- DropIndex
DROP INDEX "certification_types_code_key";

-- DropIndex
DROP INDEX "departments_code_key";

-- DropIndex
DROP INDEX "designations_code_key";

-- DropIndex
DROP INDEX "document_types_code_key";

-- DropIndex
DROP INDEX "employees_employee_number_key";

-- DropIndex
DROP INDEX "employees_work_email_key";

-- DropIndex
DROP INDEX "employment_grades_code_key";

-- DropIndex
DROP INDEX "employment_types_code_key";

-- DropIndex
DROP INDEX "holidays_date_key";

-- DropIndex
DROP INDEX "leads_code_key";

-- DropIndex
DROP INDEX "leave_types_code_key";

-- DropIndex
DROP INDEX "material_categories_code_key";

-- DropIndex
DROP INDEX "materials_code_key";

-- DropIndex
DROP INDEX "payroll_periods_period_year_period_month_key";

-- DropIndex
DROP INDEX "permissions_code_key";

-- DropIndex
DROP INDEX "project_roles_code_key";

-- DropIndex
DROP INDEX "projects_code_key";

-- DropIndex
DROP INDEX "purchase_orders_po_number_key";

-- DropIndex
DROP INDEX "roles_code_key";

-- DropIndex
DROP INDEX "shift_types_code_key";

-- DropIndex
DROP INDEX "suppliers_code_key";

-- DropIndex
DROP INDEX "users_email_key";

-- DropIndex
DROP INDEX "warehouses_code_key";

-- AlterTable
ALTER TABLE "approval_requests" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "approval_steps" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "attendance_records" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "certification_types" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "compensation_components" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "cpf_contribution_rates" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "defect_items" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "designation_required_documents" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "designations" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "document_types" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "emergency_contacts" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_addresses" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_availability_overrides" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_bank_accounts" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_certifications" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_documents" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_project_assignments" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employee_status_history" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employees" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employment_grades" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "employment_types" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "goods_receipt_lines" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "goods_receipts" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "holidays" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "leads" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "leave_balances" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "leave_requests" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "leave_types" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "material_categories" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "materials" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payroll_periods" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payslip_line_items" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "payslips" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "permissions" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "pricing_lines" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "progress_claims" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "project_budget_lines" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "project_documents" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "project_resource_requests" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "project_roles" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "projects" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "purchase_order_lines" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "purchase_orders" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "quotations" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "role_permissions" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "roles" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "salary_structures" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "shift_types" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "site_stage_checklist_items" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "site_stage_history" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "sites" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_levels" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_transactions" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "stock_transfers" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "supplier_documents" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "suppliers" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "tenders" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "warehouses" ALTER COLUMN "company_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "work_passes" ALTER COLUMN "company_id" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "certification_types_company_id_code_key" ON "certification_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "departments_company_id_code_key" ON "departments"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "designations_company_id_code_key" ON "designations"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_company_id_code_key" ON "document_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_company_id_employee_number_key" ON "employees"("company_id", "employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_company_id_work_email_key" ON "employees"("company_id", "work_email");

-- CreateIndex
CREATE UNIQUE INDEX "employment_grades_company_id_code_key" ON "employment_grades"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "employment_types_company_id_code_key" ON "employment_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "holidays_company_id_date_key" ON "holidays"("company_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "leads_company_id_code_key" ON "leads"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_company_id_code_key" ON "leave_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "material_categories_company_id_code_key" ON "material_categories"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "materials_company_id_code_key" ON "materials"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_company_id_period_year_period_month_key" ON "payroll_periods"("company_id", "period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_company_id_code_key" ON "permissions"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "project_roles_company_id_code_key" ON "project_roles"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "projects_company_id_code_key" ON "projects"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_company_id_po_number_key" ON "purchase_orders"("company_id", "po_number");

-- CreateIndex
CREATE UNIQUE INDEX "roles_company_id_code_key" ON "roles"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "shift_types_company_id_code_key" ON "shift_types"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_company_id_code_key" ON "suppliers"("company_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_id_email_key" ON "users"("company_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_company_id_code_key" ON "warehouses"("company_id", "code");

