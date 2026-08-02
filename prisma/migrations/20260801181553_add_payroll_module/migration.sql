-- CreateTable
CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "basic_monthly_salary" DECIMAL(12,2) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "cpf_applicable" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compensation_components" (
    "id" TEXT NOT NULL,
    "salary_structure_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "is_recurring" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compensation_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL,
    "period_month" INTEGER NOT NULL,
    "period_year" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "cutoff_date" TIMESTAMP(3) NOT NULL,
    "pay_date" TIMESTAMP(3),
    "approval_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "payroll_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslips" (
    "id" TEXT NOT NULL,
    "payroll_period_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "basic_pay" DECIMAL(12,2) NOT NULL,
    "total_allowances" DECIMAL(12,2) NOT NULL,
    "total_deductions" DECIMAL(12,2) NOT NULL,
    "gross_pay" DECIMAL(12,2) NOT NULL,
    "employee_cpf_amount" DECIMAL(12,2) NOT NULL,
    "employer_cpf_amount" DECIMAL(12,2) NOT NULL,
    "sdl_amount" DECIMAL(12,2) NOT NULL,
    "net_pay" DECIMAL(12,2) NOT NULL,
    "paid_to_bank_account_id" TEXT,
    "disbursement_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payslip_line_items" (
    "id" TEXT NOT NULL,
    "payslip_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "payslip_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cpf_contribution_rates" (
    "id" TEXT NOT NULL,
    "age_band_label" TEXT NOT NULL,
    "min_age" INTEGER NOT NULL,
    "max_age" INTEGER,
    "wage_ceiling" DECIMAL(12,2) NOT NULL,
    "employee_rate" DECIMAL(5,4) NOT NULL,
    "employer_rate" DECIMAL(5,4) NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cpf_contribution_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salary_structures_employee_id_key" ON "salary_structures"("employee_id");

-- CreateIndex
CREATE UNIQUE INDEX "payroll_periods_period_year_period_month_key" ON "payroll_periods"("period_year", "period_month");

-- CreateIndex
CREATE UNIQUE INDEX "payslips_payroll_period_id_employee_id_key" ON "payslips"("payroll_period_id", "employee_id");

-- AddForeignKey
ALTER TABLE "salary_structures" ADD CONSTRAINT "salary_structures_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compensation_components" ADD CONSTRAINT "compensation_components_salary_structure_id_fkey" FOREIGN KEY ("salary_structure_id") REFERENCES "salary_structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_period_id_fkey" FOREIGN KEY ("payroll_period_id") REFERENCES "payroll_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payslip_line_items" ADD CONSTRAINT "payslip_line_items_payslip_id_fkey" FOREIGN KEY ("payslip_id") REFERENCES "payslips"("id") ON DELETE CASCADE ON UPDATE CASCADE;
