-- CreateTable
CREATE TABLE "site_stage_checklist_items" (
    "id" TEXT NOT NULL,
    "site_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "item_index" INTEGER NOT NULL,
    "is_checked" BOOLEAN NOT NULL DEFAULT false,
    "checked_by" TEXT,
    "checked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_stage_checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "site_stage_checklist_items_site_id_stage_item_index_key" ON "site_stage_checklist_items"("site_id", "stage", "item_index");

-- AddForeignKey
ALTER TABLE "site_stage_checklist_items" ADD CONSTRAINT "site_stage_checklist_items_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
