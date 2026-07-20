-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "work_location" TEXT;

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "requested_by" TEXT NOT NULL,
    "requested_by_employee_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "current_step_order" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_steps" (
    "id" TEXT NOT NULL,
    "approval_request_id" TEXT NOT NULL,
    "step_order" INTEGER NOT NULL,
    "approver_user_id" TEXT,
    "approver_role" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decision_notes" TEXT,
    "decided_by" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_module_entity_type_entity_id_idx" ON "approval_requests"("module", "entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_requested_by_idx" ON "approval_requests"("requested_by");

-- CreateIndex
CREATE INDEX "approval_steps_approver_user_id_status_idx" ON "approval_steps"("approver_user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_approval_request_id_step_order_key" ON "approval_steps"("approval_request_id", "step_order");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_idx" ON "notifications"("user_id", "is_read");

-- AddForeignKey
ALTER TABLE "approval_steps" ADD CONSTRAINT "approval_steps_approval_request_id_fkey" FOREIGN KEY ("approval_request_id") REFERENCES "approval_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
