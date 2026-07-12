-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "parent_department_id" TEXT,
    "manager_employee_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "designations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "grade_id" TEXT,
    "department_id" TEXT,
    "is_managerial" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "designations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_grades" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_roles" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "requires_expiry_date" BOOLEAN NOT NULL DEFAULT false,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "allowed_mime_types" TEXT[],
    "maximum_file_size_bytes" INTEGER NOT NULL,
    "retention_category" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuing_authority" TEXT,
    "requires_expiry_date" BOOLEAN NOT NULL DEFAULT true,
    "default_validity_months" INTEGER,
    "reminder_days" INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certification_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_number_sequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "last_number" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "employee_number_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "employee_number" TEXT NOT NULL,
    "user_id" TEXT,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "last_name" TEXT,
    "preferred_name" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "nationality_code" TEXT,
    "marital_status" TEXT,
    "national_id_ciphertext" TEXT,
    "national_id_last4" TEXT,
    "passport_ciphertext" TEXT,
    "passport_last4" TEXT,
    "personal_email" TEXT,
    "work_email" TEXT,
    "mobile_number" TEXT,
    "alternate_mobile_number" TEXT,
    "joining_date" TIMESTAMP(3) NOT NULL,
    "confirmation_date" TIMESTAMP(3),
    "termination_date" TIMESTAMP(3),
    "last_working_date" TIMESTAMP(3),
    "employment_status" TEXT NOT NULL DEFAULT 'DRAFT',
    "department_id" TEXT NOT NULL,
    "designation_id" TEXT NOT NULL,
    "grade_id" TEXT,
    "employment_type_id" TEXT NOT NULL,
    "reporting_manager_id" TEXT,
    "default_project_id" TEXT,
    "default_site_id" TEXT,
    "profile_photo_document_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_addresses" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "country_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alternate_phone" TEXT,
    "email" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_bank_accounts" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "account_number_ciphertext" TEXT NOT NULL,
    "account_number_last4" TEXT NOT NULL,
    "bank_code" TEXT,
    "branch_code" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_status_history" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "approved_by" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_name" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_project_assignments" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "site_id" TEXT,
    "project_role_id" TEXT,
    "allocation_percentage" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "assigned_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_project_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_availability_overrides" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_until" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_availability_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3),
    "expiry_date" TIMESTAMP(3),
    "document_number" TEXT,
    "issuing_authority" TEXT,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "revision_of_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_passes" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "pass_type" TEXT NOT NULL,
    "pass_number" TEXT NOT NULL,
    "issuing_country" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "document_id" TEXT,
    "notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_certifications" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "licence_number" TEXT NOT NULL,
    "issuing_authority" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "document_id" TEXT,
    "notes" TEXT,
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "designations_code_key" ON "designations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employment_grades_code_key" ON "employment_grades"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employment_types_code_key" ON "employment_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "project_roles_code_key" ON "project_roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_code_key" ON "document_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "certification_types_code_key" ON "certification_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "employees_employee_number_key" ON "employees"("employee_number");

-- CreateIndex
CREATE UNIQUE INDEX "employees_user_id_key" ON "employees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "employees_work_email_key" ON "employees"("work_email");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "employees_reporting_manager_id_idx" ON "employees"("reporting_manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "employee_addresses_employee_id_type_key" ON "employee_addresses"("employee_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "projects_code_key" ON "projects"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sites_project_id_code_key" ON "sites"("project_id", "code");

-- CreateIndex
CREATE INDEX "employee_project_assignments_employee_id_status_idx" ON "employee_project_assignments"("employee_id", "status");

-- CreateIndex
CREATE INDEX "employee_documents_employee_id_idx" ON "employee_documents"("employee_id");

-- CreateIndex
CREATE INDEX "work_passes_employee_id_idx" ON "work_passes"("employee_id");

-- CreateIndex
CREATE INDEX "employee_certifications_employee_id_idx" ON "employee_certifications"("employee_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_employee_id_fkey" FOREIGN KEY ("manager_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "employment_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_grade_id_fkey" FOREIGN KEY ("grade_id") REFERENCES "employment_grades"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_employment_type_id_fkey" FOREIGN KEY ("employment_type_id") REFERENCES "employment_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_reporting_manager_id_fkey" FOREIGN KEY ("reporting_manager_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_default_project_id_fkey" FOREIGN KEY ("default_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_default_site_id_fkey" FOREIGN KEY ("default_site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_addresses" ADD CONSTRAINT "employee_addresses_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_status_history" ADD CONSTRAINT "employee_status_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project_assignments" ADD CONSTRAINT "employee_project_assignments_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project_assignments" ADD CONSTRAINT "employee_project_assignments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project_assignments" ADD CONSTRAINT "employee_project_assignments_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_project_assignments" ADD CONSTRAINT "employee_project_assignments_project_role_id_fkey" FOREIGN KEY ("project_role_id") REFERENCES "project_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_availability_overrides" ADD CONSTRAINT "employee_availability_overrides_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_revision_of_id_fkey" FOREIGN KEY ("revision_of_id") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_passes" ADD CONSTRAINT "work_passes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_passes" ADD CONSTRAINT "work_passes_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "certification_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_certifications" ADD CONSTRAINT "employee_certifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "employee_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Manually added CHECK constraints (Prisma schema cannot express these).

ALTER TABLE "employees"
  ADD CONSTRAINT "employees_termination_after_joining_check"
    CHECK ("termination_date" IS NULL OR "termination_date" >= "joining_date"),
  ADD CONSTRAINT "employees_confirmation_after_joining_check"
    CHECK ("confirmation_date" IS NULL OR "confirmation_date" >= "joining_date"),
  ADD CONSTRAINT "employees_reporting_manager_not_self_check"
    CHECK ("reporting_manager_id" IS NULL OR "reporting_manager_id" <> "id");

ALTER TABLE "employee_project_assignments"
  ADD CONSTRAINT "assignments_allocation_percentage_range_check"
    CHECK ("allocation_percentage" > 0 AND "allocation_percentage" <= 100),
  ADD CONSTRAINT "assignments_end_after_start_check"
    CHECK ("end_date" IS NULL OR "end_date" >= "start_date");

ALTER TABLE "employee_bank_accounts"
  ADD CONSTRAINT "bank_accounts_effective_until_after_from_check"
    CHECK ("effective_until" IS NULL OR "effective_until" >= "effective_from");

ALTER TABLE "work_passes"
  ADD CONSTRAINT "work_passes_expiry_after_issue_check"
    CHECK ("expiry_date" >= "issue_date");

ALTER TABLE "employee_certifications"
  ADD CONSTRAINT "certifications_expiry_after_issue_check"
    CHECK ("expiry_date" IS NULL OR "expiry_date" >= "issue_date");

ALTER TABLE "departments"
  ADD CONSTRAINT "departments_parent_not_self_check"
    CHECK ("parent_department_id" IS NULL OR "parent_department_id" <> "id");

-- Seed the single-row employee number counter.
INSERT INTO "employee_number_sequence" ("id", "last_number") VALUES (1, 0)
  ON CONFLICT ("id") DO NOTHING;
