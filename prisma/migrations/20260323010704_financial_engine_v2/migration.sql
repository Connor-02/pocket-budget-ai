-- CreateTable
CREATE TABLE "CategoryLimit" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetProfileId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "monthlyLimit" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CategoryLimit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringTransaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "cadence" TEXT NOT NULL,
    "dayOfMonth" INTEGER,
    "weekday" INTEGER,
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastAppliedAt" TIMESTAMP(3),

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budgetProfileId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "totalIncome" DOUBLE PRECISION NOT NULL,
    "totalExpenses" DOUBLE PRECISION NOT NULL,
    "remainingThisMonth" DOUBLE PRECISION NOT NULL,
    "projectedEndOfMonth" DOUBLE PRECISION NOT NULL,
    "safeToSpendToday" DOUBLE PRECISION NOT NULL,
    "budgetUsedPercentage" DOUBLE PRECISION NOT NULL,
    "savingsGap" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryLimit_budgetProfileId_category_idx" ON "CategoryLimit"("budgetProfileId", "category");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryLimit_budgetProfileId_category_key" ON "CategoryLimit"("budgetProfileId", "category");

-- CreateIndex
CREATE INDEX "RecurringTransaction_budgetProfileId_nextRunDate_idx" ON "RecurringTransaction"("budgetProfileId", "nextRunDate");

-- CreateIndex
CREATE INDEX "RecurringTransaction_budgetProfileId_isActive_nextRunDate_idx" ON "RecurringTransaction"("budgetProfileId", "isActive", "nextRunDate");

-- CreateIndex
CREATE INDEX "MonthlySnapshot_budgetProfileId_monthKey_idx" ON "MonthlySnapshot"("budgetProfileId", "monthKey");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySnapshot_budgetProfileId_monthKey_key" ON "MonthlySnapshot"("budgetProfileId", "monthKey");

-- AddForeignKey
ALTER TABLE "CategoryLimit" ADD CONSTRAINT "CategoryLimit_budgetProfileId_fkey" FOREIGN KEY ("budgetProfileId") REFERENCES "BudgetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_budgetProfileId_fkey" FOREIGN KEY ("budgetProfileId") REFERENCES "BudgetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySnapshot" ADD CONSTRAINT "MonthlySnapshot_budgetProfileId_fkey" FOREIGN KEY ("budgetProfileId") REFERENCES "BudgetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
