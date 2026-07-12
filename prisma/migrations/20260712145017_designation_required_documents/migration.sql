-- CreateTable
CREATE TABLE "designation_required_documents" (
    "id" TEXT NOT NULL,
    "designation_id" TEXT NOT NULL,
    "document_type_id" TEXT NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "designation_required_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "designation_required_documents_designation_id_document_type_key" ON "designation_required_documents"("designation_id", "document_type_id");

-- AddForeignKey
ALTER TABLE "designation_required_documents" ADD CONSTRAINT "designation_required_documents_designation_id_fkey" FOREIGN KEY ("designation_id") REFERENCES "designations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designation_required_documents" ADD CONSTRAINT "designation_required_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
