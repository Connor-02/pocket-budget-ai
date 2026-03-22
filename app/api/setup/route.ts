import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLatestBudgetDashboard } from "@/lib/dashboard-data";
import { budgetProfileSchema, formatZodError } from "@/lib/transactions";

const AUTO_SETUP_NOTE = "Auto setup baseline";

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

export async function POST(req: Request) {
    try {
        const parsed = budgetProfileSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }

        const profile = await prisma.budgetProfile.create({
            data: parsed.data,
        });

        const setupTransactions = getSetupTransactions(
            profile.id,
            parsed.data
        );

        if (setupTransactions.length) {
            await prisma.transaction.createMany({
                data: setupTransactions,
            });
        }

        const dashboard = await getLatestBudgetDashboard();
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
        const parsed = budgetProfileSchema.safeParse(await req.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: formatZodError(parsed.error) },
                { status: 400 }
            );
        }

        const profile = await prisma.budgetProfile.findFirst({
            orderBy: { createdAt: "desc" },
        });

        if (!profile) {
            return NextResponse.json({ error: "No budget profile found" }, { status: 404 });
        }

        const setupTransactions = getSetupTransactions(profile.id, parsed.data);

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
            ...(setupTransactions.length
                ? [
                    prisma.transaction.createMany({
                        data: setupTransactions,
                    }),
                ]
                : []),
        ]);

        const dashboard = await getLatestBudgetDashboard();
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
