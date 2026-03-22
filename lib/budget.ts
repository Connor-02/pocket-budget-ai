export type BudgetMetricsInput = {
    monthlyIncome: number;
    recurringIncome: number;
    savingsGoal: number;
    fixedExpenses: number;
    variableExpenses: number;
    debtRepayments: number;
};

export function calculateMetrics(data: BudgetMetricsInput) {
    const totalIncome = data.monthlyIncome + data.recurringIncome;
    const totalExpenses =
        data.fixedExpenses + data.variableExpenses + data.debtRepayments;
    const margin = totalIncome - totalExpenses;
    const savingsGap = margin - data.savingsGoal;

    return {
        totalIncome,
        totalExpenses,
        margin,
        savingsGap,
    };
}