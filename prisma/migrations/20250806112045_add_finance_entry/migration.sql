-- CreateTable
CREATE TABLE "FinanceEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "company" TEXT NOT NULL,
    "bdr" TEXT NOT NULL,
    "leadGen" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "invoiceDate" DATETIME,
    "dueDate" DATETIME,
    "soldAmount" REAL,
    "gbpAmount" REAL,
    "actualGbpReceived" REAL,
    "notes" TEXT,
    "commissionPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "FinanceEntry_bdr_idx" ON "FinanceEntry"("bdr");

-- CreateIndex
CREATE INDEX "FinanceEntry_status_idx" ON "FinanceEntry"("status");

-- CreateIndex
CREATE INDEX "FinanceEntry_invoiceDate_idx" ON "FinanceEntry"("invoiceDate");

-- CreateIndex
CREATE INDEX "FinanceEntry_dueDate_idx" ON "FinanceEntry"("dueDate");
