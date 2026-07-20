-- AlterTable
ALTER TABLE "project_resource_requests" ADD COLUMN     "material_id" TEXT;

-- AddForeignKey
ALTER TABLE "project_resource_requests" ADD CONSTRAINT "project_resource_requests_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
