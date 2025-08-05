-- CreateIndex
CREATE INDEX "ActivityLog_bdr_idx" ON "ActivityLog"("bdr");

-- CreateIndex
CREATE INDEX "ActivityLog_activityType_timestamp_idx" ON "ActivityLog"("activityType", "timestamp");

-- CreateIndex
CREATE INDEX "PipelineItem_bdr_idx" ON "PipelineItem"("bdr");

-- CreateIndex
CREATE INDEX "PipelineItem_callDate_idx" ON "PipelineItem"("callDate");

-- CreateIndex
CREATE INDEX "PipelineItem_agreementDate_idx" ON "PipelineItem"("agreementDate");

-- CreateIndex
CREATE INDEX "PipelineItem_partnerListSentDate_idx" ON "PipelineItem"("partnerListSentDate");

-- CreateIndex
CREATE INDEX "PipelineItem_firstSaleDate_idx" ON "PipelineItem"("firstSaleDate");
