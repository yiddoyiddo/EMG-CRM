-- AlterTable
ALTER TABLE "PipelineItem" ADD COLUMN "agreementDate" DATETIME;
ALTER TABLE "PipelineItem" ADD COLUMN "firstSaleDate" DATETIME;
ALTER TABLE "PipelineItem" ADD COLUMN "partnerListDueDate" DATETIME;
ALTER TABLE "PipelineItem" ADD COLUMN "partnerListSentDate" DATETIME;
ALTER TABLE "PipelineItem" ADD COLUMN "partnerListSize" INTEGER;
ALTER TABLE "PipelineItem" ADD COLUMN "totalSalesFromList" INTEGER;

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_name_key" ON "KpiTarget"("name");
