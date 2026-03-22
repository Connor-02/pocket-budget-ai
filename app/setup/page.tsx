"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type FormData = {
    monthlyIncome: string;
    recurringIncome: string;
    savingsGoal: string;
    fixedExpenses: string;
    variableExpenses: string;
    debtRepayments: string;
};

function Field({
    id,
    label,
    placeholder,
    value,
    onChange,
    required = false,
}: {
    id: keyof FormData;
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) {
    return (
        <div className="space-y-2">
            <label
                htmlFor={id}
                className="block text-sm font-medium tracking-wide text-red-100/85"
            >
                {label}
            </label>

            <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-red-200/60">
                    $
                </span>

                <input
                    id={id}
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className="w-full rounded-2xl border border-red-900/60 bg-black/35 py-3 pl-10 pr-4 text-base text-white placeholder:text-red-200/25 outline-none transition duration-200 focus:border-red-500/80 focus:bg-black/50 focus:ring-4 focus:ring-red-900/30"
                />
            </div>
        </div>
    );
}

export default function SetupPage() {
    const router = useRouter();

    const [form, setForm] = useState<FormData>({
        monthlyIncome: "",
        recurringIncome: "",
        savingsGoal: "",
        fixedExpenses: "",
        variableExpenses: "",
        debtRepayments: "",
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");

    function updateField(field: keyof FormData, value: string) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/setup", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    monthlyIncome: Number(form.monthlyIncome || 0),
                    recurringIncome: Number(form.recurringIncome || 0),
                    savingsGoal: Number(form.savingsGoal || 0),
                    fixedExpenses: Number(form.fixedExpenses || 0),
                    variableExpenses: Number(form.variableExpenses || 0),
                    debtRepayments: Number(form.debtRepayments || 0),
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to save budget profile");
            }

            router.push("/dashboard");
        } catch (err) {
            console.error(err);
            setError("Something went wrong while saving your budget profile.");
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#140304] to-[#2a0608] px-4 py-10 text-white">
            <div className="absolute inset-0">
                <div className="absolute left-[-120px] top-[-120px] h-[280px] w-[280px] rounded-full bg-red-900/20 blur-3xl" />
                <div className="absolute bottom-[-120px] right-[-80px] h-[300px] w-[300px] rounded-full bg-red-700/10 blur-3xl" />
                <div className="absolute left-1/2 top-1/3 h-[220px] w-[220px] -translate-x-1/2 rounded-full bg-red-950/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-3xl">
                <div className="mb-8 text-center">
                    <p className="text-sm uppercase tracking-[0.3em] text-red-300/60">
                        Pocket Budget AI
                    </p>
                    <h1 className="mt-3 text-4xl font-bold tracking-tight md:text-5xl">
                        Set up your budget
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-red-100/70">
                        Add your key measurables to generate a personalised dashboard with
                        margins, spending insights, and smart budget visualisations.
                    </p>
                </div>

                <div className="rounded-[32px] border border-red-950/60 bg-white/5 p-6 shadow-[0_0_50px_rgba(127,29,29,0.18)] backdrop-blur-xl md:p-8">
                    <div className="mb-8 grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-red-950/50 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-red-200/55">
                                Goal
                            </p>
                            <p className="mt-2 text-sm text-red-50/85">
                                Build your financial baseline
                            </p>
                        </div>
                        <div className="rounded-2xl border border-red-950/50 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-red-200/55">
                                Output
                            </p>
                            <p className="mt-2 text-sm text-red-50/85">
                                Dashboard cards, charts, and margins
                            </p>
                        </div>
                        <div className="rounded-2xl border border-red-950/50 bg-black/20 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-red-200/55">
                                Next
                            </p>
                            <p className="mt-2 text-sm text-red-50/85">
                                Edit graphs with AI prompts
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field
                                id="monthlyIncome"
                                label="Monthly income"
                                placeholder="5000"
                                value={form.monthlyIncome}
                                onChange={(value) => updateField("monthlyIncome", value)}
                                required
                            />

                            <Field
                                id="recurringIncome"
                                label="Recurring side income"
                                placeholder="500"
                                value={form.recurringIncome}
                                onChange={(value) => updateField("recurringIncome", value)}
                            />

                            <Field
                                id="savingsGoal"
                                label="Monthly savings goal"
                                placeholder="1000"
                                value={form.savingsGoal}
                                onChange={(value) => updateField("savingsGoal", value)}
                                required
                            />

                            <Field
                                id="debtRepayments"
                                label="Debt repayments"
                                placeholder="300"
                                value={form.debtRepayments}
                                onChange={(value) => updateField("debtRepayments", value)}
                            />

                            <Field
                                id="fixedExpenses"
                                label="Fixed monthly expenses"
                                placeholder="1800"
                                value={form.fixedExpenses}
                                onChange={(value) => updateField("fixedExpenses", value)}
                                required
                            />

                            <Field
                                id="variableExpenses"
                                label="Variable monthly expenses"
                                placeholder="900"
                                value={form.variableExpenses}
                                onChange={(value) => updateField("variableExpenses", value)}
                                required
                            />
                        </div>

                        {error ? (
                            <div className="rounded-2xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                                {error}
                            </div>
                        ) : null}

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-950/30 transition duration-200 hover:scale-[1.01] hover:from-red-700 hover:via-red-600 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isSubmitting ? "Creating dashboard..." : "Create dashboard"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}