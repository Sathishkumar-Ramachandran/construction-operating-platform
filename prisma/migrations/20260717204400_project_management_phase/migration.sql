-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "address" TEXT,
ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "closed_by" TEXT,
ADD COLUMN     "created_by" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimated_budget" DECIMAL(12,2),
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "sites" ADD COLUMN     "current_stage" TEXT NOT NULL DEFAULT 'PRE_START_PLANNING',
ADD COLUMN     "current_stage_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "handover_approval_request_id" TEXT;

-- CreateTable
CREATE TABLE "site_stage_history" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "previous_stage" TEXT,
    "new_stage" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'SELF_ADVANCE',
    "notes" TEXT,
    "changed_by" TEXT,
    "approval_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_resource_requests" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "site_id" TEXT,
    "item_description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "needed_by_date" TIMESTAMP(3),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requested_by_user_id" TEXT NOT NULL,
    "requested_by_employee_id" TEXT,
    "approval_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_resource_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "site_stage_history_site_id_created_at_idx" ON "site_stage_history"("site_id", "created_at");

-- CreateIndex
CREATE INDEX "project_resource_requests_project_id_status_idx" ON "project_resource_requests"("project_id", "status");

-- AddForeignKey
ALTER TABLE "site_stage_history" ADD CONSTRAINT "site_stage_history_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resource_requests" ADD CONSTRAINT "project_resource_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_resource_requests" ADD CONSTRAINT "project_resource_requests_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
