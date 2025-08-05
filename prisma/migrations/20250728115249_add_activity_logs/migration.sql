-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bdr" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledDate" DATETIME,
    "completedDate" DATETIME,
    "notes" TEXT,
    "leadId" INTEGER,
    "pipelineItemId" INTEGER,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "previousCategory" TEXT,
    "newCategory" TEXT,
    CONSTRAINT "ActivityLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ActivityLog_pipelineItemId_fkey" FOREIGN KEY ("pipelineItemId") REFERENCES "PipelineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PipelineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "addedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bdr" TEXT NOT NULL,
    "company" TEXT,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "value" REAL,
    "probability" INTEGER,
    "expectedCloseDate" DATETIME,
    "link" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "email" TEXT,
    "leadId" INTEGER,
    CONSTRAINT "PipelineItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PipelineItem" ("addedDate", "bdr", "category", "company", "email", "expectedCloseDate", "id", "leadId", "link", "name", "notes", "phone", "probability", "status", "title", "value") SELECT "addedDate", "bdr", "category", "company", "email", "expectedCloseDate", "id", "leadId", "link", "name", "notes", "phone", "probability", "status", "title", "value" FROM "PipelineItem";
DROP TABLE "PipelineItem";
ALTER TABLE "new_PipelineItem" RENAME TO "PipelineItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
