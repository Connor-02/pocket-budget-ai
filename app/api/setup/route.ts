import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestBudgetDashboardForUser } from "@/lib/dashboard-data";
import { budgetProfileSchema, formatZodError } from "@/lib/transactions";
import { getAuthenticatedUserFromRequest } from "@/lib/auth";

const AUTO_SETUP_NOTE = "Auto setup baseline";
const DEFAULT_RECURRING_NOTE = "Auto recurring baseline";

function getSetupTransactions(
    budgetProfileId: string,
    data: {
        monthlyIncome: number;
        recurringIncome: number;
        fixedExpenses: number;
        variableExpenses: number;
        debtRepayments: number;
    }
) {
    const date = new Date();

    return [
        {
            budgetProfileId,
            date,
            amount: data.monthlyIncome,
            type: "income",
            category: "Salary",
            note: AUTO_SETUP_NOTE,
        },
        {
            budgetProfileId,
            date,
            amount: data.recurringIncome,
            type: "income",
            category: "Recurring Income",
            note: AUTO_SETUP_NOTE,
        },
        {
            budgetProfileId,
            date,
            amount: data.fixedExpenses,
            type: "expense",
            category: "Fixed Expenses",
            note: AUTO_SETUP_NOTE,
        },
        {
            budgetProfileId,
            date,
            amount: data.variableExpenses,
            type: "expense",
            category: "Variable Expenses",
            note: AUTO_SETUP_NOTE,
        },
        {
            budgetProfileId,
            date,
            amount: data.debtRepayments,
            type: "expense",
            category: "Debt Repayments",
            note: AUTO_SETUP_NOTE,
        },
    ].filter((transaction) => transaction.amount > 0);
}

function getDefaultCategoryLimits(data: {
    fixedExpenses: number;
    variableExpenses: number;
    debtRepayments: number;
}) {
    const variable = data.variableExpenses;

    return [
        { category: "Rent", monthlyLimit: data.fixedExpenses * 0.65 },
        { category: "Bills", monthlyLimit: data.fixedExpenses * 0.35 },
        { category: "Debt", monthlyLimit: data.debtRepayments },
        { category: "Groceries", monthlyLimit: variable * 0.35 },
        { category: "Transport", monthlyLimit: variable * 0.15 },
        { category: "Takeaway", monthlyLimit: variable * 0.15 },
        { category: "Entertainment", monthlyLimit: variable * 0.12 },
        { category: "Shopping", monthlyLimit: variable * 0.15 },
        { category: "Health", monthlyLimit: variable * 0.08 },
    ].filter((item) => item.monthlyLimit > 0);
}

function getDefaultRecurringRules(
    budgetProfileId: string,
    data: {
        fixedExpenses: number;
        debtRepayments: number;
    }
) {
    const today = new Date();
    const dayOfMonth = Math.max(1, Math.min(today.getDate(), 28));
    const nextRunDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), dayOfMonth));

    return [
        {
            budgetProfileId,
            name: "Rent + Bills",
            amount: data.fixedExpenses,
            type: "expense",
            category: "Rent",
            note: DEFAULT_RECURRING_NOTE,
            cadence: "MONTHLY",
            dayOfMonth,
            weekday: null,
            nextRunDate,
            isActive: true,
        },
        {
            budgetProfileId,
            name: "Debt repayment",
            amount: data.debtRepayments,
            type: "expense",
            category: "Debt",
            note: DEFAULT_RECURRING_NOTE,
            cadence: "MONTHLY",
            dayOfMonth,
            weekday: null,
            nextRunDate,
            isActive: true,
        },
    ].filter((item) => item.amount > 0);
}

export async function POST(req: Request) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsed = budgetProfileSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }

        const profile = await prisma.budgetProfile.create({
            data: {
                ...parsed.data,
                userId: user.id,
            },
        });

        const setupTransactions = getSetupTransactions(
            profile.id,
            parsed.data
        );
        const categoryLimits = getDefaultCategoryLimits(parsed.data);
        const recurringRules = getDefaultRecurringRules(profile.id, parsed.data);

        if (setupTransactions.length) {
            await prisma.transaction.createMany({
                data: setupTransactions,
            });
        }

        if (categoryLimits.length) {
            await prisma.categoryLimit.createMany({
                data: categoryLimits.map((limit) => ({
                    budgetProfileId: profile.id,
                    category: limit.category,
                    monthlyLimit: limit.monthlyLimit,
                })),
            });
        }

        if (recurringRules.length) {
            await prisma.recurringTransaction.createMany({
                data: recurringRules,
            });
        }

        const dashboard = await getLatestBudgetDashboardForUser(user.id);
        return NextResponse.json(dashboard ?? profile);
    } catch (error) {
        console.error("SETUP ROUTE ERROR:", error);

        return NextResponse.json(
            {
                error: "Failed to create budget profile",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const user = await getAuthenticatedUserFromRequest(req);
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const parsed = budgetProfileSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }

        const profile = await prisma.budgetProfile.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
        });

        if (!profile) {
            return NextResponse.json({ error: "No budget profile found" }, { status: 404 });
        }

        const setupTransactions = getSetupTransactions(profile.id, parsed.data);
        const categoryLimits = getDefaultCategoryLimits(parsed.data);
        const recurringRules = getDefaultRecurringRules(profile.id, parsed.data);

        await prisma.$transaction([
            prisma.budgetProfile.update({
                where: { id: profile.id },
                data: parsed.data,
            }),
            prisma.transaction.deleteMany({
                where: {
                    budgetProfileId: profile.id,
                    note: AUTO_SETUP_NOTE,
                },
            }),
            prisma.categoryLimit.deleteMany({
                where: {
                    budgetProfileId: profile.id,
                },
            }),
            ...(categoryLimits.length
                ? [
                    prisma.categoryLimit.createMany({
                        data: categoryLimits.map((limit) => ({
                            budgetProfileId: profile.id,
                            category: limit.category,
                            monthlyLimit: limit.monthlyLimit,
                        })),
                    }),
                ]
                : []),
            prisma.recurringTransaction.deleteMany({
                where: {
                    budgetProfileId: profile.id,
                    note: DEFAULT_RECURRING_NOTE,
                },
            }),
            ...(recurringRules.length
                ? [
                    prisma.recurringTransaction.createMany({
                        data: recurringRules,
                    }),
                ]
                : []),
            ...(setupTransactions.length
                ? [
                    prisma.transaction.createMany({
                        data: setupTransactions,
                    }),
                ]
                : []),
        ]);

        const dashboard = await getLatestBudgetDashboardForUser(user.id);
        return NextResponse.json(dashboard);
    } catch (error) {
        console.error("SETUP UPDATE ROUTE ERROR:", error);

        return NextResponse.json(
            {
                error: "Failed to update budget profile",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
