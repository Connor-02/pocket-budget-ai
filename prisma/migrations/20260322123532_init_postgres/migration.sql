-- CreateTable
CREATE TABLE "BudgetProfile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "monthlyIncome" DOUBLE PRECISION NOT NULL,
    "recurringIncome" DOUBLE PRECISION NOT NULL,
    "savingsGoal" DOUBLE PRECISION NOT NULL,
    "fixedExpenses" DOUBLE PRECISION NOT NULL,
    "variableExpenses" DOUBLE PRECISION NOT NULL,
    "debtRepayments" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "BudgetProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budgetProfileId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChartConfig" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "budgetProfileId" TEXT NOT NULL,
    "chartKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "configJson" TEXT NOT NULL,

    CONSTRAINT "ChartConfig_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_budgetProfileId_fkey" FOREIGN KEY ("budgetProfileId") REFERENCES "BudgetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChartConfig" ADD CONSTRAINT "ChartConfig_budgetProfileId_fkey" FOREIGN KEY ("budgetProfileId") REFERENCES "BudgetProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
