export type TransactionRecord = {
    id: string;
    date: string;
    amount: number;
    type: string;
    category: string;
    title?: string | null;
    note: string | null;
};

export type BudgetProfileRecord = {
    id: string;
    monthlyIncome: number;
    recurringIncome: number;
    savingsGoal: number;
    fixedExpenses: number;
    variableExpenses: number;
    debtRepayments: number;
    transactions: TransactionRecord[];
};

export type Metrics = {
    totalIncome: number;
    totalExpenses: number;
    margin: number;
    savingsGap: number;
    remainingThisMonth: number;
    budgetUsedPercentage: number;
    projectedEndOfMonth: number;
    monthlyBurnRate: number;
    safeToSpendToday: number;
    daysRemaining: number;
    monthlyStatus: "on_track" | "at_risk" | "critical";
};

export type TransactionMetrics = {
    trackedIncome: number;
    trackedExpenses: number;
    trackedNet: number;
    averageExpense: number;
    largestExpenseCategory: string | null;
    byCategory: Array<{
        name: string;
        value: number;
    }>;
};

export type DashboardData = {
    profile: BudgetProfileRecord;
    metrics: Metrics;
    transactionMetrics: TransactionMetrics;
    categoryProgress: Array<{
        category: string;
        budget: number;
        actual: number;
        usedPercentage: number;
        variance: number;
        status: "under" | "near" | "over";
    }>;
    upcomingBills: Array<{
        id: string;
        name: string;
        amount: number;
        category: string;
        nextRunDate: string;
        cadence: string;
    }>;
};
