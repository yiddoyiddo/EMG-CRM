-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'BDR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "hashedPassword" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'BDR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "addedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bdrId" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "link" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "email" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineItem" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "addedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bdrId" TEXT NOT NULL,
    "company" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "probability" INTEGER,
    "expectedCloseDate" TIMESTAMP(3),
    "link" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "email" TEXT,
    "leadId" INTEGER,
    "callDate" TIMESTAMP(3),
    "parentId" INTEGER,
    "isSublist" BOOLEAN NOT NULL DEFAULT false,
    "sublistName" TEXT,
    "sortOrder" INTEGER,
    "agreementDate" TIMESTAMP(3),
    "partnerListDueDate" TIMESTAMP(3),
    "partnerListSentDate" TIMESTAMP(3),
    "firstSaleDate" TIMESTAMP(3),
    "partnerListSize" INTEGER,
    "totalSalesFromList" INTEGER,

    CONSTRAINT "PipelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bdrId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "leadId" INTEGER,
    "pipelineItemId" INTEGER,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "previousCategory" TEXT,
    "newCategory" TEXT,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiTarget" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "value" INTEGER NOT NULL,

    CONSTRAINT "KpiTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" SERIAL NOT NULL,
    "company" TEXT NOT NULL,
    "bdrId" TEXT NOT NULL,
    "leadGen" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "soldAmount" DOUBLE PRECISION,
    "gbpAmount" DOUBLE PRECISION,
    "exchangeRate" DOUBLE PRECISION,
    "exchangeRateDate" TIMESTAMP(3),
    "actualGbpReceived" DOUBLE PRECISION,
    "notes" TEXT,
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "month" TEXT NOT NULL DEFAULT '2025-01',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_bdrId_idx" ON "Lead"("bdrId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_addedDate_idx" ON "Lead"("addedDate");

-- CreateIndex
CREATE INDEX "Lead_bdrId_status_idx" ON "Lead"("bdrId", "status");

-- CreateIndex
CREATE INDEX "Lead_bdrId_addedDate_idx" ON "Lead"("bdrId", "addedDate");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_idx" ON "PipelineItem"("bdrId");

-- CreateIndex
CREATE INDEX "PipelineItem_callDate_idx" ON "PipelineItem"("callDate");

-- CreateIndex
CREATE INDEX "PipelineItem_agreementDate_idx" ON "PipelineItem"("agreementDate");

-- CreateIndex
CREATE INDEX "PipelineItem_partnerListSentDate_idx" ON "PipelineItem"("partnerListSentDate");

-- CreateIndex
CREATE INDEX "PipelineItem_firstSaleDate_idx" ON "PipelineItem"("firstSaleDate");

-- CreateIndex
CREATE INDEX "PipelineItem_category_idx" ON "PipelineItem"("category");

-- CreateIndex
CREATE INDEX "PipelineItem_status_idx" ON "PipelineItem"("status");

-- CreateIndex
CREATE INDEX "PipelineItem_lastUpdated_idx" ON "PipelineItem"("lastUpdated");

-- CreateIndex
CREATE INDEX "PipelineItem_addedDate_idx" ON "PipelineItem"("addedDate");

-- CreateIndex
CREATE INDEX "PipelineItem_parentId_idx" ON "PipelineItem"("parentId");

-- CreateIndex
CREATE INDEX "PipelineItem_leadId_idx" ON "PipelineItem"("leadId");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_status_idx" ON "PipelineItem"("bdrId", "status");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_category_idx" ON "PipelineItem"("bdrId", "category");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_lastUpdated_idx" ON "PipelineItem"("bdrId", "lastUpdated");

-- CreateIndex
CREATE INDEX "PipelineItem_status_lastUpdated_idx" ON "PipelineItem"("status", "lastUpdated");

-- CreateIndex
CREATE INDEX "PipelineItem_category_status_idx" ON "PipelineItem"("category", "status");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_callDate_idx" ON "PipelineItem"("bdrId", "callDate");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_agreementDate_idx" ON "PipelineItem"("bdrId", "agreementDate");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_partnerListSentDate_idx" ON "PipelineItem"("bdrId", "partnerListSentDate");

-- CreateIndex
CREATE INDEX "PipelineItem_bdrId_firstSaleDate_idx" ON "PipelineItem"("bdrId", "firstSaleDate");

-- CreateIndex
CREATE INDEX "PipelineItem_parentId_sortOrder_idx" ON "PipelineItem"("parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "PipelineItem_isSublist_parentId_idx" ON "PipelineItem"("isSublist", "parentId");

-- CreateIndex
CREATE INDEX "ActivityLog_bdrId_idx" ON "ActivityLog"("bdrId");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_timestamp_idx" ON "ActivityLog"("activityType", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_idx" ON "ActivityLog"("activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_pipelineItemId_idx" ON "ActivityLog"("pipelineItemId");

-- CreateIndex
CREATE INDEX "ActivityLog_leadId_idx" ON "ActivityLog"("leadId");

-- CreateIndex
CREATE INDEX "ActivityLog_bdrId_timestamp_idx" ON "ActivityLog"("bdrId", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_bdrId_activityType_idx" ON "ActivityLog"("bdrId", "activityType");

-- CreateIndex
CREATE INDEX "ActivityLog_pipelineItemId_timestamp_idx" ON "ActivityLog"("pipelineItemId", "timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_bdrId_idx" ON "ActivityLog"("activityType", "bdrId");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_bdrId_idx" ON "ActivityLog"("timestamp", "bdrId");

-- CreateIndex
CREATE UNIQUE INDEX "KpiTarget_name_key" ON "KpiTarget"("name");

-- CreateIndex
CREATE INDEX "FinanceEntry_bdrId_idx" ON "FinanceEntry"("bdrId");

-- CreateIndex
CREATE INDEX "FinanceEntry_status_idx" ON "FinanceEntry"("status");

-- CreateIndex
CREATE INDEX "FinanceEntry_invoiceDate_idx" ON "FinanceEntry"("invoiceDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_dueDate_idx" ON "FinanceEntry"("dueDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_month_idx" ON "FinanceEntry"("month");

-- CreateIndex
CREATE INDEX "FinanceEntry_createdAt_idx" ON "FinanceEntry"("createdAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_bdrId_status_idx" ON "FinanceEntry"("bdrId", "status");

-- CreateIndex
CREATE INDEX "FinanceEntry_bdrId_month_idx" ON "FinanceEntry"("bdrId", "month");

-- CreateIndex
CREATE INDEX "FinanceEntry_status_month_idx" ON "FinanceEntry"("status", "month");

-- CreateIndex
CREATE INDEX "FinanceEntry_bdrId_createdAt_idx" ON "FinanceEntry"("bdrId", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_month_createdAt_idx" ON "FinanceEntry"("month", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_status_createdAt_idx" ON "FinanceEntry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FinanceEntry_bdrId_status_month_idx" ON "FinanceEntry"("bdrId", "status", "month");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineItem" ADD CONSTRAINT "PipelineItem_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineItem" ADD CONSTRAINT "PipelineItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineItem" ADD CONSTRAINT "PipelineItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PipelineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_pipelineItemId_fkey" FOREIGN KEY ("pipelineItemId") REFERENCES "PipelineItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceEntry" ADD CONSTRAINT "FinanceEntry_bdrId_fkey" FOREIGN KEY ("bdrId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
