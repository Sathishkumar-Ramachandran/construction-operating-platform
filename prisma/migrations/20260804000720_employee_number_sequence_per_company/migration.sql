-- The pre-tenancy singleton counter row (id=1) has no company to belong to;
-- per-company rows are lazily created by ensureEmployeeNumberSequenceSeeded.
DELETE FROM "employee_number_sequence" WHERE "company_id" IS NULL;

-- AlterTable
ALTER TABLE "employee_number_sequence" DROP CONSTRAINT "employee_number_sequence_pkey",
DROP COLUMN "id",
ALTER COLUMN "company_id" SET NOT NULL,
ADD CONSTRAINT "employee_number_sequence_pkey" PRIMARY KEY ("company_id");

