/*
  Warnings:

  - You are about to drop the column `lastUpdated` on the `Lead` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Lead" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "addedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bdr" TEXT,
    "company" TEXT,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "link" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "email" TEXT
);
INSERT INTO "new_Lead" ("addedDate", "bdr", "company", "email", "id", "link", "name", "notes", "phone", "source", "status", "title") SELECT "addedDate", "bdr", "company", "email", "id", "link", "name", "notes", "phone", "source", "status", "title" FROM "Lead";
DROP TABLE "Lead";
ALTER TABLE "new_Lead" RENAME TO "Lead";
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
CREATE TABLE "new_PipelineItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "addedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    "callDate" DATETIME,
    "parentId" INTEGER,
    "isSublist" BOOLEAN NOT NULL DEFAULT false,
    "sublistName" TEXT,
    "sortOrder" INTEGER,
    CONSTRAINT "PipelineItem_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PipelineItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PipelineItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PipelineItem" ("addedDate", "bdr", "category", "company", "email", "expectedCloseDate", "id", "lastUpdated", "leadId", "link", "name", "notes", "phone", "probability", "status", "title", "value") SELECT "addedDate", "bdr", "category", "company", "email", "expectedCloseDate", "id", "lastUpdated", "leadId", "link", "name", "notes", "phone", "probability", "status", "title", "value" FROM "PipelineItem";
DROP TABLE "PipelineItem";
ALTER TABLE "new_PipelineItem" RENAME TO "PipelineItem";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
