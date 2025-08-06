-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FinanceEntry" (
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
    "month" TEXT NOT NULL DEFAULT '2025-01',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FinanceEntry" ("actualGbpReceived", "bdr", "commissionPaid", "company", "createdAt", "dueDate", "gbpAmount", "id", "invoiceDate", "leadGen", "notes", "soldAmount", "status", "updatedAt") SELECT "actualGbpReceived", "bdr", "commissionPaid", "company", "createdAt", "dueDate", "gbpAmount", "id", "invoiceDate", "leadGen", "notes", "soldAmount", "status", "updatedAt" FROM "FinanceEntry";
DROP TABLE "FinanceEntry";
ALTER TABLE "new_FinanceEntry" RENAME TO "FinanceEntry";
CREATE INDEX "FinanceEntry_bdr_idx" ON "FinanceEntry"("bdr");
CREATE INDEX "FinanceEntry_status_idx" ON "FinanceEntry"("status");
CREATE INDEX "FinanceEntry_invoiceDate_idx" ON "FinanceEntry"("invoiceDate");
CREATE INDEX "FinanceEntry_dueDate_idx" ON "FinanceEntry"("dueDate");
CREATE INDEX "FinanceEntry_month_idx" ON "FinanceEntry"("month");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
