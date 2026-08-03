-- AlterTable
ALTER TABLE "document_types" ADD COLUMN     "applies_to" TEXT[] DEFAULT ARRAY[]::TEXT[];
