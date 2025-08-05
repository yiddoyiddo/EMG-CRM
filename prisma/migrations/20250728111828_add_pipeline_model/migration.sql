-- CreateTable
CREATE TABLE "PipelineItem" (
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
    "leadId" INTEGER
);
