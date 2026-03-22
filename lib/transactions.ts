import { z } from "zod";
import type { TransactionRecord, TransactionMetrics } from "@/lib/dashboard-types";

const moneyField = z.coerce.number().finite().min(0);

export const budgetProfileSchema = z.object({
    monthlyIncome: moneyField,
    recurringIncome: moneyField,
    savingsGoal: moneyField,
    fixedExpenses: moneyField,
    variableExpenses: moneyField,
    debtRepayments: moneyField,
});

export const transactionCreateSchema = z.object({
    date: z.string().min(1),
    amount: moneyField.positive(),
    type: z.enum(["income", "expense"]),
    category: z.string().trim().min(1).max(60),
    note: z.string().trim().max(240).optional().or(z.literal("")),
});

export const transactionUpdateSchema = transactionCreateSchema.partial();

export function formatZodError(error: z.ZodError) {
    return error.issues.map((issue) => issue.message).join(", ");
}

export function summarizeTransactions(
    transactions: TransactionRecord[]
): TransactionMetrics {
    let trackedIncome = 0;
    let trackedExpenses = 0;
    let expenseCount = 0;
    const categoryTotals = new Map<string, number>();

    for (const transaction of transactions) {
        const amount = Number(transaction.amount) || 0;
        const normalizedType = transaction.type.toLowerCase();

        if (normalizedType === "income") {
            trackedIncome += amount;
            continue;
        }

        trackedExpenses += amount;
        expenseCount += 1;

        const category = transaction.category.trim() || "Other";
        categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);
    }

    const byCategory = [...categoryTotals.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    return {
        trackedIncome,
        trackedExpenses,
        trackedNet: trackedIncome - trackedExpenses,
        averageExpense: expenseCount > 0 ? trackedExpenses / expenseCount : 0,
        largestExpenseCategory: byCategory[0]?.name ?? null,
        byCategory,
    };
}
