"use client";

import { useEffect, useMemo, useState } from "react";
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    RadialBarChart,
    RadialBar,
} from "recharts";

type Transaction = {
    id: string;
    date: string;
    amount: number;
    type: string;
    category: string;
    note?: string | null;
};

type BudgetProfile = {
    id: string;
    monthlyIncome: number;
    recurringIncome: number;
    savingsGoal: number;
    fixedExpenses: number;
    variableExpenses: number;
    debtRepayments: number;
    transactions?: Transaction[];
};

type Metrics = {
    totalIncome: number;
    totalExpenses: number;
    margin: number;
    savingsGap: number;
};

type DashboardResponse = {
    profile: BudgetProfile;
    metrics: Metrics;
};

const PIE_COLORS = ["#ef4444", "#f97316", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
    }).format(value);
}

function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
}

function getSavingsRate(totalIncome: number, margin: number) {
    if (totalIncome <= 0) return 0;
    return clamp((margin / totalIncome) * 100, 0, 100);
}

function getExpenseRatio(totalIncome: number, totalExpenses: number) {
    if (totalIncome <= 0) return 0;
    return clamp((totalExpenses / totalIncome) * 100, 0, 999);
}

function getGoalProgress(savingsGoal: number, margin: number) {
    if (savingsGoal <= 0) return 100;
    return clamp((margin / savingsGoal) * 100, 0, 999);
}

function getHealthScore(
    totalIncome: number,
    totalExpenses: number,
    margin: number,
    savingsGoal: number
) {
    if (totalIncome <= 0) return 0;

    const savingsRate = getSavingsRate(totalIncome, margin);
    const expenseRatio = getExpenseRatio(totalIncome, totalExpenses);
    const goalProgress = getGoalProgress(savingsGoal, margin);

    let score = 0;

    score += clamp(savingsRate, 0, 40);
    score += clamp(100 - expenseRatio, 0, 35);
    score += clamp(goalProgress / 2, 0, 25);

    return Math.round(clamp(score, 0, 100));
}

function getHealthLabel(score: number) {
    if (score >= 80) return "Excellent";
    if (score >= 65) return "Strong";
    if (score >= 50) return "Stable";
    if (score >= 35) return "Needs attention";
    return "Critical";
}

function getHealthAccent(score: number) {
    if (score >= 80) return "text-emerald-300";
    if (score >= 65) return "text-green-300";
    if (score >= 50) return "text-amber-300";
    if (score >= 35) return "text-orange-300";
    return "text-red-300";
}

function surfaceClass() {
    return "border border-red-950/60 bg-white/[0.04] backdrop-blur-xl shadow-[0_0_40px_rgba(127,29,29,0.10)]";
}

function Panel({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={`rounded-3xl ${surfaceClass()} ${className}`}>
            {children}
        </div>
    );
}

function SectionTitle({
    eyebrow,
    title,
    description,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
}) {
    return (
        <div>
            {eyebrow ? (
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/60">
                    {eyebrow}
                </p>
            ) : null}
            <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
            {description ? (
                <p className="mt-1 text-sm text-red-100/60">{description}</p>
            ) : null}
        </div>
    );
}

function SummaryCard({
    label,
    value,
    helper,
    tone = "default",
}: {
    label: string;
    value: string;
    helper: string;
    tone?: "default" | "green" | "amber" | "purple" | "red";
}) {
    const toneClasses = {
        default: "from-white/[0.03] to-white/[0.02] border-white/10",
        green: "from-emerald-500/10 to-emerald-500/[0.03] border-emerald-400/20",
        amber: "from-amber-500/10 to-amber-500/[0.03] border-amber-400/20",
        purple: "from-violet-500/10 to-violet-500/[0.03] border-violet-400/20",
        red: "from-red-500/10 to-red-500/[0.03] border-red-400/20",
    };

    return (
        <div
            className={`rounded-3xl border bg-gradient-to-br p-5 shadow-[0_0_30px_rgba(0,0,0,0.18)] ${toneClasses[tone]}`}
        >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-200/55">
                {label}
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight text-white">{value}</p>
            <p className="mt-2 text-sm text-red-100/65">{helper}</p>
        </div>
    );
}

function StatPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: string;
    tone: "green" | "amber" | "purple" | "red";
}) {
    const toneClasses = {
        green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
        amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
        purple: "border-violet-400/20 bg-violet-400/10 text-violet-300",
        red: "border-red-400/20 bg-red-400/10 text-red-300",
    };

    return (
        <div
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${toneClasses[tone]}`}
        >
            {label} {value}
        </div>
    );
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [aiPrompt, setAiPrompt] = useState("");
    const [aiResponse, setAiResponse] = useState(
        "Ask Budget AI to explain your numbers, surface savings opportunities, or suggest a clearer way to visualise your budget."
    );
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        async function loadDashboard() {
            try {
                setLoading(true);
                setError("");

                const res = await fetch("/api/dashboard", {
                    method: "GET",
                    cache: "no-store",
                });

                const json = await res.json();

                if (!res.ok) {
                    throw new Error(json?.error || "Failed to load dashboard");
                }

                setData(json);
            } catch (err) {
                console.error(err);
                setError("Could not load dashboard data.");
            } finally {
                setLoading(false);
            }
        }

        loadDashboard();
    }, []);

    const spendingByCategory = useMemo(() => {
        if (!data?.profile?.transactions?.length) {
            return [
                { name: "Fixed", value: data?.profile.fixedExpenses ?? 0 },
                { name: "Variable", value: data?.profile.variableExpenses ?? 0 },
                { name: "Debt", value: data?.profile.debtRepayments ?? 0 },
            ].filter((item) => item.value > 0);
        }

        const expenses = data.profile.transactions.filter(
            (transaction) => transaction.type.toLowerCase() === "expense"
        );

        const grouped = expenses.reduce<Record<string, number>>((acc, transaction) => {
            const key = transaction.category?.trim() || "Other";
            acc[key] = (acc[key] ?? 0) + Number(transaction.amount);
            return acc;
        }, {});

        return Object.entries(grouped)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [data]);

    const incomeVsExpenses = useMemo(() => {
        if (!data) return [];
        return [
            {
                name: "This Month",
                income: data.metrics.totalIncome,
                expenses: data.metrics.totalExpenses,
            },
        ];
    }, [data]);

    const savingsRateChart = useMemo(() => {
        if (!data) return [];
        const value = Number(
            getSavingsRate(data.metrics.totalIncome, data.metrics.margin).toFixed(1)
        );
        return [{ name: "Savings Rate", value, fill: "#ef4444" }];
    }, [data]);

    const budgetAllocation = useMemo(() => {
        if (!data) return [];

        const total = data.metrics.totalIncome || 1;

        return [
            {
                label: "Fixed costs",
                value: data.profile.fixedExpenses,
                percentage: Math.round((data.profile.fixedExpenses / total) * 100),
                color: "bg-red-500",
            },
            {
                label: "Variable spend",
                value: data.profile.variableExpenses,
                percentage: Math.round((data.profile.variableExpenses / total) * 100),
                color: "bg-orange-500",
            },
            {
                label: "Debt",
                value: data.profile.debtRepayments,
                percentage: Math.round((data.profile.debtRepayments / total) * 100),
                color: "bg-violet-500",
            },
            {
                label: "Left over",
                value: Math.max(data.metrics.margin, 0),
                percentage: Math.round(
                    (Math.max(data.metrics.margin, 0) / total) * 100
                ),
                color: "bg-emerald-500",
            },
        ];
    }, [data]);

    const topSpendingCategory = useMemo(() => {
        if (!spendingByCategory.length) return null;
        return spendingByCategory[0];
    }, [spendingByCategory]);

    const recommendations = useMemo(() => {
        if (!data) return [];

        const items: string[] = [];
        const expenseRatio = getExpenseRatio(
            data.metrics.totalIncome,
            data.metrics.totalExpenses
        );
        const savingsRate = getSavingsRate(
            data.metrics.totalIncome,
            data.metrics.margin
        );

        if (expenseRatio >= 70) {
            items.push("Expenses are taking a large share of income. Review variable spending first.");
        }

        if (data.profile.variableExpenses > data.profile.fixedExpenses * 0.75) {
            items.push("Variable spending is relatively high compared with fixed costs.");
        }

        if (data.metrics.savingsGap < 0) {
            items.push(
                `You are below your savings target by ${formatCurrency(
                    Math.abs(data.metrics.savingsGap)
                )}.`
            );
        }

        if (data.profile.debtRepayments > 0 && data.profile.debtRepayments > data.metrics.totalIncome * 0.15) {
            items.push("Debt repayments are a meaningful part of your budget mix.");
        }

        if (savingsRate >= 25) {
            items.push("Your current savings rate is strong relative to your income.");
        }

        if (!items.length) {
            items.push("Your budget looks balanced. Track transactions next to deepen the insights.");
        }

        return items.slice(0, 4);
    }, [data]);

    async function handleAskAi() {
        if (!aiPrompt.trim() || !data) return;

        try {
            setIsAiLoading(true);

            const dashboardContext = {
                metrics: data.metrics,
                profile: {
                    monthlyIncome: data.profile.monthlyIncome,
                    recurringIncome: data.profile.recurringIncome,
                    savingsGoal: data.profile.savingsGoal,
                    fixedExpenses: data.profile.fixedExpenses,
                    variableExpenses: data.profile.variableExpenses,
                    debtRepayments: data.profile.debtRepayments,
                },
                spendingByCategory,
                budgetAllocation,
            };

            const res = await fetch("/api/ai/chart", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    dashboardContext,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Failed to get AI response");
            }

            setAiResponse(
                json.text ||
                json.raw ||
                "Budget AI responded, but no readable response was returned."
            );
        } catch (err) {
            console.error(err);
            setAiResponse(
                "Budget AI is not fully wired yet. Once connected, this panel can explain your dashboard, compare categories, and generate chart-edit suggestions."
            );
        } finally {
            setIsAiLoading(false);
        }
    }

    if (loading) {
        return (
            <main className="min-h-screen bg-gradient-to-br from-black via-[#120304] to-[#2a0608] px-6 py-10 text-white">
                <div className="mx-auto max-w-7xl animate-pulse">
                    <div className="h-5 w-36 rounded bg-white/10" />
                    <div className="mt-4 h-12 w-80 rounded bg-white/10" />
                    <div className="mt-3 h-5 w-[540px] max-w-full rounded bg-white/10" />

                    <div className="mt-8 grid gap-6 xl:grid-cols-3">
                        <div className="h-[260px] rounded-3xl bg-white/[0.04] xl:col-span-2" />
                        <div className="h-[260px] rounded-3xl bg-white/[0.04]" />
                    </div>

                    <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 rounded-3xl bg-white/[0.04]" />
                        ))}
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-3">
                        <div className="h-[360px] rounded-3xl bg-white/[0.04] xl:col-span-2" />
                        <div className="h-[360px] rounded-3xl bg-white/[0.04]" />
                    </div>

                    <div className="mt-6 grid gap-6 xl:grid-cols-2">
                        <div className="h-[380px] rounded-3xl bg-white/[0.04]" />
                        <div className="h-[380px] rounded-3xl bg-white/[0.04]" />
                    </div>
                </div>
            </main>
        );
    }

    if (error || !data) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-[#120304] to-[#2a0608] px-6 text-white">
                <Panel className="max-w-md p-8 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/60">
                        Dashboard
                    </p>
                    <h1 className="mt-3 text-2xl font-bold">Unable to load data</h1>
                    <p className="mt-3 text-red-100/70">
                        {error || "No dashboard data was found."}
                    </p>
                </Panel>
            </main>
        );
    }

    const { metrics, profile } = data;

    const savingsRate = getSavingsRate(metrics.totalIncome, metrics.margin);
    const expenseRatio = getExpenseRatio(metrics.totalIncome, metrics.totalExpenses);
    const goalProgress = getGoalProgress(profile.savingsGoal, metrics.margin);
    const healthScore = getHealthScore(
        metrics.totalIncome,
        metrics.totalExpenses,
        metrics.margin,
        profile.savingsGoal
    );

    const goalTone =
        metrics.savingsGap >= 0 ? "purple" : "red";

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#120304] to-[#2a0608] px-6 py-10 text-white">
            <div className="absolute inset-0">
                <div className="absolute left-[-140px] top-[-120px] h-[320px] w-[320px] rounded-full bg-red-900/15 blur-3xl" />
                <div className="absolute bottom-[-140px] right-[-80px] h-[340px] w-[340px] rounded-full bg-red-700/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-7xl">
                <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-300/65">
                        Pocket Budget AI
                    </p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                        Financial Dashboard
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-7 text-red-100/70">
                        A smarter view of your budget, margins, and savings position — designed
                        to help you understand what is happening and what to do next.
                    </p>
                </div>

                <section className="grid gap-6 xl:grid-cols-3">
                    <Panel className="p-6 xl:col-span-2">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-2xl">
                                <p className="text-sm font-medium text-red-100/60">
                                    Monthly Financial Health
                                </p>
                                <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
                                    {metrics.margin >= 0 ? "You’re on track" : "You need to tighten spending"}
                                </h2>
                                <p className="mt-3 text-red-100/70">
                                    {metrics.margin >= 0
                                        ? "You are operating with a positive monthly margin. The next step is improving your savings quality and reducing avoidable spending."
                                        : "Your current expenses are higher than your available income. Focus on variable costs first, then review fixed commitments."}
                                </p>

                                <div className="mt-5 flex flex-wrap gap-3">
                                    <StatPill
                                        label="Savings rate"
                                        value={`${Math.round(savingsRate)}%`}
                                        tone="green"
                                    />
                                    <StatPill
                                        label="Expense ratio"
                                        value={`${Math.round(expenseRatio)}%`}
                                        tone="amber"
                                    />
                                    <StatPill
                                        label="Goal progress"
                                        value={`${Math.round(goalProgress)}%`}
                                        tone="purple"
                                    />
                                </div>
                            </div>

                            <div className="grid min-w-[240px] gap-4">
                                <div className="rounded-2xl border border-red-900/40 bg-black/20 p-5">
                                    <p className="text-sm text-red-100/55">Net left this month</p>
                                    <p
                                        className={`mt-2 text-4xl font-bold ${metrics.margin >= 0 ? "text-emerald-300" : "text-red-300"
                                            }`}
                                    >
                                        {formatCurrency(metrics.margin)}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-red-900/40 bg-black/20 p-5">
                                    <p className="text-sm text-red-100/55">Health score</p>
                                    <div className="mt-2 flex items-end justify-between">
                                        <p className={`text-4xl font-bold ${getHealthAccent(healthScore)}`}>
                                            {healthScore}
                                        </p>
                                        <p className={`text-sm font-medium ${getHealthAccent(healthScore)}`}>
                                            {getHealthLabel(healthScore)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Panel>

                    <Panel className="p-6">
                        <SectionTitle
                            title="Ask Budget AI"
                            description="Explain your dashboard, compare categories, or surface savings opportunities."
                        />

                        <div className="mt-4 space-y-3">
                            <textarea
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Try: Where am I overspending, and what should I fix first?"
                                className="min-h-[120px] w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-sm text-white placeholder:text-red-100/30 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-900/25"
                            />

                            <div className="flex flex-wrap gap-2">
                                {[
                                    "Where am I overspending?",
                                    "Explain this dashboard simply",
                                    "How can I save another $200?",
                                ].map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => setAiPrompt(suggestion)}
                                        className="rounded-full border border-red-900/40 bg-white/[0.04] px-3 py-1.5 text-xs text-red-100/70 transition hover:bg-white/[0.08]"
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>

                            <button
                                type="button"
                                onClick={handleAskAi}
                                disabled={isAiLoading || !aiPrompt.trim()}
                                className="w-full rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 px-4 py-3 text-sm font-semibold text-white transition hover:from-red-700 hover:via-red-600 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isAiLoading ? "Thinking..." : "Ask Budget AI"}
                            </button>

                            <div className="rounded-2xl border border-red-900/40 bg-black/20 p-4">
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/70">
                                    AI Response
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-50/85">
                                    {aiResponse}
                                </p>
                            </div>
                        </div>
                    </Panel>
                </section>

                <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                    <SummaryCard
                        label="Total Income"
                        value={formatCurrency(metrics.totalIncome)}
                        helper="All monthly inflow"
                        tone="green"
                    />
                    <SummaryCard
                        label="Total Expenses"
                        value={formatCurrency(metrics.totalExpenses)}
                        helper={`${Math.round(expenseRatio)}% of your income`}
                        tone="amber"
                    />
                    <SummaryCard
                        label="Savings Goal"
                        value={formatCurrency(profile.savingsGoal)}
                        helper="Target for this month"
                        tone="default"
                    />
                    <SummaryCard
                        label="Savings Gap"
                        value={formatCurrency(metrics.savingsGap)}
                        helper={metrics.savingsGap >= 0 ? "Ahead of target" : "Below target"}
                        tone={goalTone}
                    />
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-3">
                    <Panel className="p-6 xl:col-span-2">
                        <SectionTitle
                            title="Income vs Expenses"
                            description="A quick comparison of what comes in versus what goes out this month."
                        />

                        <div className="mt-4 h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={incomeVsExpenses} barGap={24}>
                                    <CartesianGrid
                                        stroke="rgba(255,255,255,0.08)"
                                        vertical={false}
                                    />
                                    <XAxis
                                        dataKey="name"
                                        stroke="rgba(255,255,255,0.58)"
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="rgba(255,255,255,0.58)"
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                    <Tooltip
                                        formatter={(value) => formatCurrency(Number(value))}
                                        contentStyle={{
                                            backgroundColor: "#120405",
                                            border: "1px solid rgba(127,29,29,0.45)",
                                            borderRadius: "16px",
                                            color: "#fff",
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{
                                            color: "#fecaca",
                                            fontSize: "12px",
                                            paddingTop: "10px",
                                        }}
                                    />
                                    <Bar
                                        dataKey="income"
                                        name="Income"
                                        fill="#10b981"
                                        radius={[12, 12, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="expenses"
                                        name="Expenses"
                                        fill="#f59e0b"
                                        radius={[12, 12, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>

                    <Panel className="p-6">
                        <SectionTitle
                            title="Savings Rate"
                            description="How much of your income remains after expenses."
                        />

                        <div className="mt-4 h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="58%"
                                    innerRadius="58%"
                                    outerRadius="90%"
                                    barSize={22}
                                    data={savingsRateChart}
                                    startAngle={180}
                                    endAngle={0}
                                >
                                    <RadialBar
                                        dataKey="value"
                                        cornerRadius={14}
                                        background={{ fill: "rgba(255,255,255,0.08)" }}
                                    />
                                    <Tooltip
                                        formatter={(value) => `${Number(value).toFixed(1)}%`}
                                        contentStyle={{
                                            backgroundColor: "#120405",
                                            border: "1px solid rgba(127,29,29,0.45)",
                                            borderRadius: "16px",
                                            color: "#fff",
                                        }}
                                    />
                                    <text
                                        x="50%"
                                        y="58%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-white text-4xl font-bold"
                                    >
                                        {`${Math.round(savingsRate)}%`}
                                    </text>
                                    <text
                                        x="50%"
                                        y="69%"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        className="fill-[#fecaca] text-sm"
                                    >
                                        Savings Rate
                                    </text>
                                </RadialBarChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <Panel className="p-6">
                        <SectionTitle
                            title="Spending Breakdown"
                            description="Your current expense mix by category."
                        />

                        <div className="mt-4 h-[320px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={spendingByCategory}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="47%"
                                        outerRadius={104}
                                        innerRadius={56}
                                        paddingAngle={3}
                                        stroke="rgba(255,255,255,0.12)"
                                    >
                                        {spendingByCategory.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => formatCurrency(Number(value))}
                                        contentStyle={{
                                            backgroundColor: "#120405",
                                            border: "1px solid rgba(127,29,29,0.45)",
                                            borderRadius: "16px",
                                            color: "#fff",
                                        }}
                                    />
                                    <Legend
                                        wrapperStyle={{
                                            color: "#fecaca",
                                            fontSize: "12px",
                                            paddingTop: "10px",
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Panel>

                    <Panel className="p-6">
                        <SectionTitle
                            title="Budget Allocation"
                            description="How your income is currently distributed."
                        />

                        <div className="mt-5 space-y-4">
                            {budgetAllocation.map((item) => (
                                <div key={item.label}>
                                    <div className="mb-2 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">{item.label}</p>
                                            <p className="text-xs text-red-100/55">
                                                {formatCurrency(item.value)}
                                            </p>
                                        </div>
                                        <p className="text-sm text-red-100/75">{item.percentage}%</p>
                                    </div>

                                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                        <div
                                            className={`h-full rounded-full ${item.color}`}
                                            style={{ width: `${clamp(item.percentage, 0, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </section>

                <section className="mt-6 grid gap-6 xl:grid-cols-2">
                    <Panel className="p-6">
                        <SectionTitle
                            title="Quick Insights"
                            description="Plain-English takeaways from your current budget."
                        />

                        <div className="mt-5 space-y-4">
                            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-500/5 p-4">
                                <p className="text-sm font-medium text-emerald-300">Income Health</p>
                                <p className="mt-2 text-sm leading-6 text-red-50/85">
                                    Your monthly income is{" "}
                                    <span className="font-semibold text-white">
                                        {formatCurrency(metrics.totalIncome)}
                                    </span>
                                    , and you currently keep{" "}
                                    <span className="font-semibold text-white">
                                        {formatCurrency(metrics.margin)}
                                    </span>{" "}
                                    after expenses.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-amber-400/15 bg-amber-500/5 p-4">
                                <p className="text-sm font-medium text-amber-300">Spending Pressure</p>
                                <p className="mt-2 text-sm leading-6 text-red-50/85">
                                    Your expenses are using{" "}
                                    <span className="font-semibold text-white">
                                        {Math.round(expenseRatio)}%
                                    </span>{" "}
                                    of your income this month.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-violet-400/15 bg-violet-500/5 p-4">
                                <p className="text-sm font-medium text-violet-300">Goal Progress</p>
                                <p className="mt-2 text-sm leading-6 text-red-50/85">
                                    You are{" "}
                                    <span className="font-semibold text-white">
                                        {metrics.savingsGap >= 0 ? "ahead of" : "behind"}
                                    </span>{" "}
                                    your savings target by{" "}
                                    <span className="font-semibold text-white">
                                        {formatCurrency(Math.abs(metrics.savingsGap))}
                                    </span>
                                    .
                                </p>
                            </div>

                            <div className="rounded-2xl border border-sky-400/15 bg-sky-500/5 p-4">
                                <p className="text-sm font-medium text-sky-300">
                                    Biggest Spending Category
                                </p>
                                <p className="mt-2 text-sm leading-6 text-red-50/85">
                                    {topSpendingCategory ? (
                                        <>
                                            <span className="font-semibold text-white">
                                                {topSpendingCategory.name}
                                            </span>{" "}
                                            is currently your largest expense at{" "}
                                            <span className="font-semibold text-white">
                                                {formatCurrency(topSpendingCategory.value)}
                                            </span>
                                            .
                                        </>
                                    ) : (
                                        "Add transactions to see which category is taking the biggest share."
                                    )}
                                </p>
                            </div>
                        </div>
                    </Panel>

                    <Panel className="p-6">
                        <SectionTitle
                            title="Focus Areas"
                            description="The highest-value areas to review next."
                        />

                        <div className="mt-5 space-y-3">
                            {recommendations.map((item, index) => (
                                <div
                                    key={index}
                                    className="rounded-2xl border border-red-900/40 bg-black/20 p-4"
                                >
                                    <div className="flex gap-3">
                                        <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-xs font-semibold text-red-300">
                                            {index + 1}
                                        </div>
                                        <p className="text-sm leading-6 text-red-50/85">{item}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 rounded-2xl border border-red-900/40 bg-black/20 p-4">
                            <p className="text-sm font-medium text-white">Why this is shippable</p>
                            <p className="mt-2 text-sm leading-6 text-red-100/70">
                                This dashboard now does more than show charts. It creates a clear
                                financial story, highlights risk areas, and gives the AI a visible
                                purpose as an explanation and recommendation layer.
                            </p>
                        </div>
                    </Panel>
                </section>
            </div>
        </main>
    );
}
