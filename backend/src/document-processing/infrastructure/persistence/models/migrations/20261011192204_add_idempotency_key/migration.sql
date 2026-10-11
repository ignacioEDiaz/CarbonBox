-- AlterTable
ALTER TABLE "Upload" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Upload_idempotencyKey_key" ON "Upload"("idempotencyKey");

