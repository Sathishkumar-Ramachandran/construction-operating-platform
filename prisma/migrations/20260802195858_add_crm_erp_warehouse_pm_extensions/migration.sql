-- DropIndex
DROP INDEX "stock_levels_material_id_key";

-- AlterTable
ALTER TABLE "project_resource_requests" ADD COLUMN     "fulfillment_warehouse_id" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "acquisition_path" TEXT,
ADD COLUMN     "commencement_date" TIMESTAMP(3),
ADD COLUMN     "contract_signed_at" TIMESTAMP(3),
ADD COLUMN     "defects_liability_period_months" INTEGER,
ADD COLUMN     "performance_bond_amount" DECIMAL(12,2),
ADD COLUMN     "performance_bond_expiry_date" TIMESTAMP(3),
ADD COLUMN     "practical_completion_date" TIMESTAMP(3),
ADD COLUMN     "retention_percentage" DECIMAL(5,2),
ADD COLUMN     "source_lead_id" TEXT;

-- AlterTable
ALTER TABLE "stock_levels" ADD COLUMN     "warehouse_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "stock_transactions" ADD COLUMN     "warehouse_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "parent_task_id" TEXT,
ADD COLUMN     "percent_complete" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "planned_end_date" TIMESTAMP(3),
ADD COLUMN     "planned_start_date" TIMESTAMP(3),
ADD COLUMN     "wbs_code" TEXT;

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "client_name" TEXT NOT NULL,
    "contact_person_name" TEXT,
    "contact_phone" TEXT,
    "contact_email" TEXT,
    "source" TEXT,
    "acquisition_path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "estimated_value" DECIMAL(12,2),
    "owner_user_id" TEXT NOT NULL,
    "lost_reason" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenders" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "tender_reference_no" TEXT,
    "issuing_body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DOCUMENT_COLLECTION',
    "notice_date" TIMESTAMP(3),
    "document_collection_deadline" TIMESTAMP(3),
    "site_visit_mandatory" BOOLEAN NOT NULL DEFAULT false,
    "site_visit_date" TIMESTAMP(3),
    "query_deadline" TIMESTAMP(3),
    "submission_deadline" TIMESTAMP(3),
    "tender_bond_amount" DECIMAL(12,2),
    "evaluation_method" TEXT,
    "boq_total" DECIMAL(14,2),
    "bid_amount" DECIMAL(14,2),
    "submitted_at" TIMESTAMP(3),
    "opened_at" TIMESTAMP(3),
    "awarded_at" TIMESTAMP(3),
    "outcome_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_lines" (
    "id" TEXT NOT NULL,
    "tender_id" TEXT,
    "quotation_id" TEXT,
    "item_no" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit_rate" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documents" (
    "id" TEXT NOT NULL,
    "project_id" TEXT,
    "lead_id" TEXT,
    "document_type_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "revision_of_id" TEXT,
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_budget_lines" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "budgeted_amount" DECIMAL(12,2) NOT NULL,
    "committed_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actual_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progress_claims" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "claim_number" INTEGER NOT NULL,
    "claim_period_to" TIMESTAMP(3) NOT NULL,
    "claimed_amount" DECIMAL(12,2) NOT NULL,
    "certified_amount" DECIMAL(12,2),
    "retention_percentage" DECIMAL(5,2) NOT NULL DEFAULT 5,
    "retention_held" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "approval_request_id" TEXT,
    "submitted_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progress_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "defect_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "site_id" TEXT,
    "description" TEXT NOT NULL,
    "reported_by" TEXT,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "rectified_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "defect_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "managed_by_employee_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "project_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expected_delivery_date" TIMESTAMP(3),
    "approval_request_id" TEXT,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "quantity_ordered" DECIMAL(12,2) NOT NULL,
    "quantity_received" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "received_by" TEXT NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" TEXT NOT NULL,
    "goods_receipt_id" TEXT NOT NULL,
    "purchase_order_line_id" TEXT NOT NULL,
    "quantity_received" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_documents" (
    "id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "purchase_order_id" TEXT,
    "document_type_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "checksum" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UPLOADED',
    "is_confidential" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_transfers" (
    "id" TEXT NOT NULL,
    "material_id" TEXT NOT NULL,
    "from_warehouse_id" TEXT NOT NULL,
    "to_warehouse_id" TEXT NOT NULL,
    "quantity" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_by" TEXT NOT NULL,
    "dispatched_at" TIMESTAMP(3),
    "received_by" TEXT,
    "received_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_code_key" ON "leads"("code");

-- CreateIndex
CREATE UNIQUE INDEX "tenders_lead_id_key" ON "tenders"("lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "progress_claims_project_id_claim_number_key" ON "progress_claims"("project_id", "claim_number");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE UNIQUE INDEX "projects_source_lead_id_key" ON "projects"("source_lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_levels_material_id_warehouse_id_key" ON "stock_levels"("material_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "stock_transactions_warehouse_id_created_at_idx" ON "stock_transactions"("warehouse_id", "created_at");

-- CreateIndex
CREATE INDEX "tasks_parent_task_id_idx" ON "tasks"("parent_task_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_source_lead_id_fkey" FOREIGN KEY ("source_lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resource_requests" ADD CONSTRAINT "project_resource_requests_fulfillment_warehouse_id_fkey" FOREIGN KEY ("fulfillment_warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parent_task_id_fkey" FOREIGN KEY ("parent_task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenders" ADD CONSTRAINT "tenders_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_lines" ADD CONSTRAINT "pricing_lines_tender_id_fkey" FOREIGN KEY ("tender_id") REFERENCES "tenders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_lines" ADD CONSTRAINT "pricing_lines_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_revision_of_id_fkey" FOREIGN KEY ("revision_of_id") REFERENCES "project_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_budget_lines" ADD CONSTRAINT "project_budget_lines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progress_claims" ADD CONSTRAINT "progress_claims_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_items" ADD CONSTRAINT "defect_items_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "defect_items" ADD CONSTRAINT "defect_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_managed_by_employee_id_fkey" FOREIGN KEY ("managed_by_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_levels" ADD CONSTRAINT "stock_levels_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transactions" ADD CONSTRAINT "stock_transactions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

