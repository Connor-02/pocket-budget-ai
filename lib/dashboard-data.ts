import "server-only";
import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/lib/dashboard-types";

export async function getLatestBudgetDashboard(): Promise<DashboardData | null> {
    const profile = await prisma.budgetProfile.findFirst({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            monthlyIncome: true,
            recurringIncome: true,
            savingsGoal: true,
            fixedExpenses: true,
            variableExpenses: true,
            debtRepayments: true,
        },
    });

    if (!profile) {
        return null;
    }

    const [incomeTotals, expenseTotals, groupedExpenses] = await Promise.all([
        prisma.transaction.aggregate({
            where: {
                budgetProfileId: profile.id,
                type: { equals: "income", mode: "insensitive" },
            },
            _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
            where: {
                budgetProfileId: profile.id,
                type: { equals: "expense", mode: "insensitive" },
            },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        prisma.transaction.groupBy({
            by: ["category"],
            where: {
                budgetProfileId: profile.id,
                type: { equals: "expense", mode: "insensitive" },
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: "desc" } },
        }),
    ]);

    const trackedIncome = Number(incomeTotals._sum.amount ?? 0);
    const trackedExpenses = Number(expenseTotals._sum.amount ?? 0);
    const hasTrackedTransactions = trackedIncome > 0 || trackedExpenses > 0;
    const totalIncome = hasTrackedTransactions
        ? trackedIncome
        : profile.monthlyIncome + profile.recurringIncome;
    const totalExpenses = hasTrackedTransactions
        ? trackedExpenses
        : profile.fixedExpenses + profile.variableExpenses + profile.debtRepayments;
    const margin = totalIncome - totalExpenses;
    const savingsGap = margin - profile.savingsGoal;
    const expenseCount = expenseTotals._count._all;
    const byCategory = groupedExpenses.map((entry) => ({
        name: entry.category?.trim() || "Other",
        value: Number(entry._sum.amount ?? 0),
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
            transactions: [],
        },
        metrics: {
            totalIncome,
            totalExpenses,
            margin,
            savingsGap,
        },
        transactionMetrics: {
            trackedIncome,
            trackedExpenses,
            trackedNet: trackedIncome - trackedExpenses,
            averageExpense: expenseCount > 0 ? trackedExpenses / expenseCount : 0,
            largestExpenseCategory: byCategory[0]?.name ?? null,
            byCategory,
        },
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
