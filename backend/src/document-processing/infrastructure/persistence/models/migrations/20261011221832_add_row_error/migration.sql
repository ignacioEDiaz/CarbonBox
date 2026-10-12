-- CreateTable
CREATE TABLE "RowError" (
    "id" SERIAL NOT NULL,
    "uploadId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RowError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RowError_uploadId_idx" ON "RowError"("uploadId");

-- AddForeignKey
ALTER TABLE "RowError" ADD CONSTRAINT "RowError_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "Upload"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

