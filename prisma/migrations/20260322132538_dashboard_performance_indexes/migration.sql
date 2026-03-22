-- CreateIndex
CREATE INDEX "BudgetProfile_createdAt_idx" ON "BudgetProfile"("createdAt");

-- CreateIndex
CREATE INDEX "ChartConfig_budgetProfileId_createdAt_idx" ON "ChartConfig"("budgetProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_budgetProfileId_date_createdAt_idx" ON "Transaction"("budgetProfileId", "date" DESC, "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Transaction_budgetProfileId_type_category_idx" ON "Transaction"("budgetProfileId", "type", "category");
