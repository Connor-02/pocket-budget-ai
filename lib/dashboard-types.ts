export type TransactionRecord = {
    id: string;
    date: string;
    amount: number;
    type: string;
    category: string;
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
};
