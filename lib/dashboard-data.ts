import "server-only";
import { prisma } from "@/lib/prisma";
import type { DashboardData } from "@/lib/dashboard-types";
import { buildProjection } from "@/lib/projections";
import {
    applyDueRecurringTransactions,
    getUpcomingBills,
} from "@/lib/recurring-transactions";

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

    await applyDueRecurringTransactions(profile.id);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const nextMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const transactionWhere = {
        budgetProfileId: profile.id,
        date: {
            gte: monthStart,
            lt: nextMonthStart,
        },
    };

    const [incomeTotals, expenseTotals, groupedExpenses, categoryLimits, upcomingBills] = await Promise.all([
        prisma.transaction.aggregate({
            where: {
                ...transactionWhere,
                type: { equals: "income", mode: "insensitive" },
            },
            _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
            where: {
                ...transactionWhere,
                type: { equals: "expense", mode: "insensitive" },
            },
            _sum: { amount: true },
            _count: { _all: true },
        }),
        prisma.transaction.groupBy({
            by: ["category"],
            where: {
                ...transactionWhere,
                type: { equals: "expense", mode: "insensitive" },
            },
            _sum: { amount: true },
            orderBy: { _sum: { amount: "desc" } },
        }),
        prisma.categoryLimit.findMany({
            where: {
                budgetProfileId: profile.id,
            },
        }),
        getUpcomingBills(profile.id),
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

    const projection = buildProjection({
        monthIncomePlan: profile.monthlyIncome + profile.recurringIncome,
        savingsGoal: profile.savingsGoal,
        fixedCostsPlan: profile.fixedExpenses + profile.debtRepayments,
        actualIncome: trackedIncome,
        actualExpenses: trackedExpenses,
        now,
    });

    const actualByCategory = new Map(byCategory.map((item) => [item.name, item.value]));
    const categoryProgressFromLimits = categoryLimits.map((limit) => {
        const actual = actualByCategory.get(limit.category) ?? 0;
        const usedPercentage = limit.monthlyLimit > 0
            ? (actual / limit.monthlyLimit) * 100
            : actual > 0
                ? 999
                : 0;
        const variance = actual - limit.monthlyLimit;
        const status: "under" | "near" | "over" =
            usedPercentage > 100 ? "over" : usedPercentage >= 85 ? "near" : "under";

        return {
            category: limit.category,
            budget: limit.monthlyLimit,
            actual,
            usedPercentage,
            variance,
            status,
        };
    });

    const uncappedCategories = byCategory
        .filter((item) => !categoryProgressFromLimits.some((limit) => limit.category === item.name))
        .map((item) => ({
            category: item.name,
            budget: 0,
            actual: item.value,
            usedPercentage: 999,
            variance: item.value,
            status: "over" as const,
        }));

    const categoryProgress = [...categoryProgressFromLimits, ...uncappedCategories]
        .sort((a, b) => b.actual - a.actual)
        .slice(0, 8);

    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    await prisma.monthlySnapshot.upsert({
        where: {
            budgetProfileId_monthKey: {
                budgetProfileId: profile.id,
                monthKey,
            },
        },
        update: {
            totalIncome,
            totalExpenses,
            remainingThisMonth: projection.remainingThisMonth,
            projectedEndOfMonth: projection.projectedEndOfMonth,
            safeToSpendToday: projection.safeToSpendToday,
            budgetUsedPercentage: projection.budgetUsedPercentage,
            savingsGap,
        },
        create: {
            budgetProfileId: profile.id,
            monthKey,
            totalIncome,
            totalExpenses,
            remainingThisMonth: projection.remainingThisMonth,
            projectedEndOfMonth: projection.projectedEndOfMonth,
            safeToSpendToday: projection.safeToSpendToday,
            budgetUsedPercentage: projection.budgetUsedPercentage,
            savingsGap,
        },
    });

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
            remainingThisMonth: projection.remainingThisMonth,
            budgetUsedPercentage: projection.budgetUsedPercentage,
            projectedEndOfMonth: projection.projectedEndOfMonth,
            monthlyBurnRate: projection.monthlyBurnRate,
            safeToSpendToday: projection.safeToSpendToday,
            daysRemaining: projection.daysRemaining,
            monthlyStatus: projection.monthlyStatus,
        },
        transactionMetrics: {
            trackedIncome,
            trackedExpenses,
            trackedNet: trackedIncome - trackedExpenses,
            averageExpense: expenseCount > 0 ? trackedExpenses / expenseCount : 0,
            largestExpenseCategory: byCategory[0]?.name ?? null,
            byCategory,
        },
        categoryProgress,
        upcomingBills: upcomingBills.map((bill) => ({
            id: bill.id,
            name: bill.name,
            amount: bill.amount,
            category: bill.category,
            nextRunDate: bill.nextRunDate.toISOString(),
            cadence: bill.cadence,
        })),
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
