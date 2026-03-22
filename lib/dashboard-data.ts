import "server-only";
import type { Transaction } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calculateMetrics } from "@/lib/budget";
import { summarizeTransactions } from "@/lib/transactions";
import type { DashboardData, TransactionRecord } from "@/lib/dashboard-types";

export async function getLatestBudgetDashboard(): Promise<DashboardData | null> {
    const profile = await prisma.budgetProfile.findFirst({
        orderBy: { createdAt: "desc" },
        include: {
            transactions: {
                orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            },
        },
    });

    if (!profile) {
        return null;
    }

    const transactions: TransactionRecord[] = profile.transactions.map((transaction: Transaction) => ({
        id: transaction.id,
        date: transaction.date.toISOString(),
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        note: transaction.note,
    }));

    return {
        profile: {
            id: profile.id,
            monthlyIncome: profile.monthlyIncome,
            recurringIncome: profile.recurringIncome,
            savingsGoal: profile.savingsGoal,
            fixedExpenses: profile.fixedExpenses,
            variableExpenses: profile.variableExpenses,
            debtRepayments: profile.debtRepayments,
            transactions,
        },
        metrics: calculateMetrics(profile),
        transactionMetrics: summarizeTransactions(transactions),
    };
}

export async function requireLatestBudgetProfile() {
    const profile = await prisma.budgetProfile.findFirst({
        orderBy: { createdAt: "desc" },
    });

    if (!profile) {
        throw new Error("No budget profile found");
    }

    return profile;
}
