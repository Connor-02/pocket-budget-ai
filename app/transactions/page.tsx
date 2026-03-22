"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type Transaction = {
    id: string;
    date: string;
    amount: number;
    type: string;
    category: string;
    note?: string | null;
};

type FormState = {
    date: string;
    amount: string;
    type: "income" | "expense";
    category: string;
    note: string;
};

type SpeechRecognitionEvent = Event & {
    results: SpeechRecognitionResultList;
};

type SpeechRecognitionErrorEvent = Event & {
    error: string;
};

type SpeechRecognitionInstance = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start: () => void;
    stop: () => void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

const expenseCategories = [
    "Rent",
    "Bills",
    "Groceries",
    "Transport",
    "Takeaway",
    "Entertainment",
    "Shopping",
    "Debt",
    "Health",
    "Other",
];

const incomeCategories = [
    "Salary",
    "Side Income",
    "Freelance",
    "Gift",
    "Refund",
    "Other",
];

function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-AU", {
        style: "currency",
        currency: "AUD",
        maximumFractionDigits: 0,
    }).format(value);
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
    return <div className={`rounded-3xl ${surfaceClass()} ${className}`}>{children}</div>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <label className="mb-2 block text-sm font-medium text-red-100/85">
            {children}
        </label>
    );
}

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [aiSubmitting, setAiSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [aiError, setAiError] = useState("");
    const [aiSuccess, setAiSuccess] = useState("");
    const [aiInput, setAiInput] = useState("");
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

    const [form, setForm] = useState<FormState>({
        date: new Date().toISOString().slice(0, 10),
        amount: "",
        type: "expense",
        category: "Groceries",
        note: "",
    });

    const categories =
        form.type === "expense" ? expenseCategories : incomeCategories;

    useEffect(() => {
        void loadTransactions();
    }, []);

    useEffect(() => {
        setForm((prev) => ({
            ...prev,
            category:
                form.type === "expense"
                    ? expenseCategories[0]
                    : incomeCategories[0],
        }));
    }, [form.type]);

    useEffect(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            setVoiceSupported(false);
            return;
        }

        setVoiceSupported(true);
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-AU";

        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map((result) => result[0]?.transcript || "")
                .join(" ")
                .trim();

            if (!transcript) return;

            setAiInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
            setAiSuccess("Voice captured. Review and submit.");
            setAiError("");
        };

        recognition.onerror = () => {
            setAiError("Voice input failed. Try again or type your transaction.");
            setAiSuccess("");
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;

        return () => {
            recognition.stop();
            recognitionRef.current = null;
        };
    }, []);

    async function loadTransactions() {
        try {
            setLoading(true);
            setError("");

            const res = await fetch("/api/transactions", {
                method: "GET",
                cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Failed to load transactions");
            }

            setTransactions(json.transactions ?? []);
        } catch (err) {
            console.error(err);
            setError("Could not load transactions.");
        } finally {
            setLoading(false);
        }
    }

    function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
        setForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError("");
        setSuccess("");

        try {
            const res = await fetch("/api/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    date: form.date,
                    amount: Number(form.amount),
                    type: form.type,
                    category: form.category,
                    note: form.note.trim() || null,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Failed to save transaction");
            }

            setSuccess("Transaction added successfully.");
            setForm({
                date: new Date().toISOString().slice(0, 10),
                amount: "",
                type: "expense",
                category: "Groceries",
                note: "",
            });

            await loadTransactions();
        } catch (err) {
            console.error(err);
            setError("Something went wrong while saving the transaction.");
        } finally {
            setSubmitting(false);
        }
    }

    function toggleListening() {
        const recognition = recognitionRef.current;

        if (!recognition || !voiceSupported) {
            setAiError("Voice input is not supported in this browser.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
            return;
        }

        try {
            setAiError("");
            setAiSuccess("");
            recognition.start();
            setIsListening(true);
        } catch {
            setAiError("Could not start microphone. Check browser mic permission.");
            setIsListening(false);
        }
    }

    async function handleAiSubmit() {
        if (!aiInput.trim()) {
            setAiError("Say or type a transaction first.");
            return;
        }

        setAiSubmitting(true);
        setAiError("");
        setAiSuccess("");

        try {
            const res = await fetch("/api/ai/transactions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: aiInput.trim(),
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
            });

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.error || "Failed to create AI transaction");
            }

            setAiSuccess("AI transaction added.");
            setSuccess("Transaction added successfully.");
            setAiInput("");
            await loadTransactions();
        } catch (err) {
            console.error(err);
            setAiError("Could not create a transaction from that request.");
        } finally {
            setAiSubmitting(false);
        }
    }

    const totals = useMemo(() => {
        const income = transactions
            .filter((t) => t.type.toLowerCase() === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = transactions
            .filter((t) => t.type.toLowerCase() === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
            income,
            expenses,
            net: income - expenses,
        };
    }, [transactions]);

    const groupedByCategory = useMemo(() => {
        const map = new Map<string, number>();

        transactions
            .filter((t) => t.type.toLowerCase() === "expense")
            .forEach((t) => {
                map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
            });

        return Array.from(map.entries())
            .map(([category, amount]) => ({ category, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [transactions]);

    return (
        <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#120304] to-[#2a0608] px-4 py-8 text-white sm:px-6 sm:py-10">
            <div className="absolute inset-0">
                <div className="absolute left-[-140px] top-[-120px] h-[320px] w-[320px] rounded-full bg-red-900/15 blur-3xl" />
                <div className="absolute bottom-[-140px] right-[-80px] h-[340px] w-[340px] rounded-full bg-red-700/10 blur-3xl" />
            </div>

            <div className="relative mx-auto max-w-7xl">
                <div className="mb-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300/65 sm:tracking-[0.3em]">
                        Pocket Budget AI
                    </p>
                    <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                        Transactions
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-red-100/70 sm:text-base sm:leading-7">
                        Add real income and expense entries so your dashboard becomes more
                        accurate, more useful, and more intelligent.
                    </p>
                </div>

                <section className="grid gap-6 xl:grid-cols-3">
                    <Panel className="p-5 sm:p-6 xl:col-span-1">
                        <div className="mb-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/60">
                                Add Transaction
                            </p>
                            <h2 className="mt-2 text-2xl font-semibold text-white">
                                Log income or expenses
                            </h2>
                            <p className="mt-2 text-sm text-red-100/65">
                                This is what powers the more advanced dashboard insights.
                            </p>
                        </div>

                        <div className="mb-6 rounded-2xl border border-red-900/40 bg-black/20 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-300/70">
                                Voice + AI Assistant
                            </p>
                            <p className="mt-2 text-sm leading-6 text-red-100/70">
                                Say or type:
                                {" "}
                                <span className="text-red-50/90">
                                    &quot;I spent $40 on McDonalds.&quot;
                                </span>
                                {" "}
                                and AI will create the transaction.
                            </p>

                            <textarea
                                value={aiInput}
                                onChange={(e) => setAiInput(e.target.value)}
                                placeholder='Example: "I spent $40 on McDonalds."'
                                rows={3}
                                className="mt-4 w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white placeholder:text-red-100/35 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-900/25"
                            />

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={toggleListening}
                                    disabled={!voiceSupported}
                                    className="rounded-2xl border border-red-900/50 bg-black/20 px-4 py-3 text-sm font-medium text-red-100 transition hover:bg-black/35 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {isListening ? "Stop listening" : "Use voice"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void handleAiSubmit()}
                                    disabled={aiSubmitting || !aiInput.trim()}
                                    className="rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 px-4 py-3 text-sm font-semibold text-white transition hover:from-red-700 hover:via-red-600 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {aiSubmitting ? "Creating..." : "Create with AI"}
                                </button>
                            </div>

                            {!voiceSupported ? (
                                <p className="mt-3 text-xs text-red-200/60">
                                    Voice input is unavailable in this browser. You can still type.
                                </p>
                            ) : null}

                            {aiError ? (
                                <div className="mt-3 rounded-2xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                                    {aiError}
                                </div>
                            ) : null}

                            {aiSuccess ? (
                                <div className="mt-3 rounded-2xl border border-emerald-700/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
                                    {aiSuccess}
                                </div>
                            ) : null}
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <FieldLabel>Type</FieldLabel>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => updateField("type", "expense")}
                                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${form.type === "expense"
                                                ? "border-red-500/70 bg-red-500/15 text-red-100"
                                                : "border-red-900/40 bg-black/20 text-red-100/65"
                                            }`}
                                    >
                                        Expense
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => updateField("type", "income")}
                                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${form.type === "income"
                                                ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-100"
                                                : "border-red-900/40 bg-black/20 text-red-100/65"
                                            }`}
                                    >
                                        Income
                                    </button>
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Amount</FieldLabel>
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-red-100/55">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={form.amount}
                                        onChange={(e) => updateField("amount", e.target.value)}
                                        placeholder="0.00"
                                        className="w-full rounded-2xl border border-red-900/50 bg-black/25 py-3 pl-10 pr-4 text-white placeholder:text-red-100/30 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-900/25"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                <div>
                                    <FieldLabel>Date</FieldLabel>
                                    <input
                                        type="date"
                                        required
                                        value={form.date}
                                        onChange={(e) => updateField("date", e.target.value)}
                                        className="w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-900/25"
                                    />
                                </div>

                                <div>
                                    <FieldLabel>Category</FieldLabel>
                                    <select
                                        value={form.category}
                                        onChange={(e) => updateField("category", e.target.value)}
                                        className="w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-900/25"
                                    >
                                        {categories.map((category) => (
                                            <option key={category} value={category} className="bg-[#120304]">
                                                {category}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <FieldLabel>Note</FieldLabel>
                                <textarea
                                    value={form.note}
                                    onChange={(e) => updateField("note", e.target.value)}
                                    placeholder="Optional note"
                                    rows={4}
                                    className="w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white placeholder:text-red-100/30 outline-none transition focus:border-red-500/70 focus:ring-4 focus:ring-red-900/25"
                                />
                            </div>

                            {error ? (
                                <div className="rounded-2xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
                                    {error}
                                </div>
                            ) : null}

                            {success ? (
                                <div className="rounded-2xl border border-emerald-700/50 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">
                                    {success}
                                </div>
                            ) : null}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-red-700 hover:via-red-600 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {submitting ? "Saving transaction..." : "Add transaction"}
                            </button>
                        </form>
                    </Panel>

                    <div className="grid gap-6 xl:col-span-2">
                        <section className="grid gap-5 md:grid-cols-3">
                            <div className="rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.03] p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300/75">
                                    Total Income
                                </p>
                                <p className="mt-3 text-3xl font-bold text-white">
                                    {formatCurrency(totals.income)}
                                </p>
                                <p className="mt-2 text-sm text-red-100/65">Logged income entries</p>
                            </div>

                            <div className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-500/[0.03] p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300/75">
                                    Total Expenses
                                </p>
                                <p className="mt-3 text-3xl font-bold text-white">
                                    {formatCurrency(totals.expenses)}
                                </p>
                                <p className="mt-2 text-sm text-red-100/65">Logged expense entries</p>
                            </div>

                            <div className="rounded-3xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-violet-500/[0.03] p-5">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-300/75">
                                    Net Flow
                                </p>
                                <p className="mt-3 text-3xl font-bold text-white">
                                    {formatCurrency(totals.net)}
                                </p>
                                <p className="mt-2 text-sm text-red-100/65">
                                    Income minus expenses
                                </p>
                            </div>
                        </section>

                        <section className="grid gap-6 lg:grid-cols-2">
                            <Panel className="p-5 sm:p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/60">
                                    Top Expense Categories
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-white">
                                    Where your money is going
                                </h2>

                                <div className="mt-5 space-y-4">
                                    {groupedByCategory.length ? (
                                        groupedByCategory.map((item) => {
                                            const max = groupedByCategory[0]?.amount || 1;
                                            const width = Math.max(8, (item.amount / max) * 100);

                                            return (
                                                <div key={item.category}>
                                                    <div className="mb-2 flex items-center justify-between">
                                                        <p className="text-sm font-medium text-white">
                                                            {item.category}
                                                        </p>
                                                        <p className="text-sm text-red-100/70">
                                                            {formatCurrency(item.amount)}
                                                        </p>
                                                    </div>
                                                    <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-red-700 to-red-500"
                                                            style={{ width: `${width}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <p className="text-sm text-red-100/65">
                                            Add some expense transactions to see category breakdowns.
                                        </p>
                                    )}
                                </div>
                            </Panel>

                            <Panel className="p-5 sm:p-6">
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/60">
                                    Transaction Tips
                                </p>
                                <h2 className="mt-2 text-xl font-semibold text-white">
                                    Make the dashboard smarter
                                </h2>

                                <div className="mt-5 space-y-3">
                                    {[
                                        "Log groceries, takeaway, rent, and bills separately so your dashboard can identify real spending pressure.",
                                        "Add income entries too, not just expenses, so your net flow stays accurate.",
                                        "Use short notes for large purchases so later AI summaries can reference them.",
                                        "The more category detail you add here, the more useful your Budget AI insights become.",
                                    ].map((tip, index) => (
                                        <div
                                            key={index}
                                            className="rounded-2xl border border-red-900/40 bg-black/20 p-4"
                                        >
                                            <div className="flex gap-3">
                                                <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-xs font-semibold text-red-300">
                                                    {index + 1}
                                                </div>
                                                <p className="text-sm leading-6 text-red-50/85">{tip}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Panel>
                        </section>

                        <Panel className="p-5 sm:p-6">
                            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300/60">
                                        Recent Activity
                                    </p>
                                    <h2 className="mt-2 text-xl font-semibold text-white">
                                        Recent transactions
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => void loadTransactions()}
                                    className="rounded-2xl border border-red-900/40 bg-black/20 px-4 py-2 text-sm text-red-100/75 transition hover:bg-black/30"
                                >
                                    Refresh
                                </button>
                            </div>

                            {loading ? (
                                <p className="text-sm text-red-100/65">Loading transactions...</p>
                            ) : transactions.length === 0 ? (
                                <p className="text-sm text-red-100/65">
                                    No transactions yet. Add your first one using the form.
                                </p>
                            ) : (
                                <>
                                    <div className="space-y-3 md:hidden">
                                        {transactions.map((transaction) => {
                                            const isIncome =
                                                transaction.type.toLowerCase() === "income";

                                            return (
                                                <div
                                                    key={transaction.id}
                                                    className="rounded-2xl border border-red-900/40 bg-black/20 p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-white">
                                                                {transaction.note?.trim() || transaction.type}
                                                            </p>
                                                            <p
                                                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${isIncome
                                                                    ? "bg-emerald-500/10 text-emerald-300"
                                                                    : "bg-red-500/10 text-red-300"
                                                                    }`}
                                                            >
                                                                {transaction.type}
                                                            </p>
                                                        </div>
                                                        <p
                                                            className={`text-sm font-semibold ${isIncome ? "text-emerald-300" : "text-white"
                                                                }`}
                                                        >
                                                            {isIncome ? "+" : "-"}
                                                            {formatCurrency(Number(transaction.amount))}
                                                        </p>
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-2 gap-3 text-xs text-red-100/70">
                                                        <p>{new Date(transaction.date).toLocaleDateString("en-AU")}</p>
                                                        <p className="text-right text-red-100/80">{transaction.category}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="hidden overflow-hidden rounded-2xl border border-red-900/40 md:block">
                                        <div className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1fr] bg-black/25 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-red-200/55">
                                            <div>Transaction</div>
                                            <div>Date</div>
                                            <div>Category</div>
                                            <div className="text-right">Amount</div>
                                        </div>

                                        <div className="divide-y divide-red-950/50">
                                            {transactions.map((transaction) => {
                                                const isIncome =
                                                    transaction.type.toLowerCase() === "income";

                                                return (
                                                    <div
                                                        key={transaction.id}
                                                        className="grid grid-cols-[1.1fr_0.8fr_0.8fr_1fr] items-center px-4 py-4"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-medium text-white">
                                                                {transaction.note?.trim() || transaction.type}
                                                            </p>
                                                            <p
                                                                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs ${isIncome
                                                                    ? "bg-emerald-500/10 text-emerald-300"
                                                                    : "bg-red-500/10 text-red-300"
                                                                    }`}
                                                            >
                                                                {transaction.type}
                                                            </p>
                                                        </div>

                                                        <div className="text-sm text-red-100/70">
                                                            {new Date(transaction.date).toLocaleDateString("en-AU")}
                                                        </div>

                                                        <div className="text-sm text-red-100/80">
                                                            {transaction.category}
                                                        </div>

                                                        <div
                                                            className={`text-right text-sm font-semibold ${isIncome ? "text-emerald-300" : "text-white"
                                                                }`}
                                                        >
                                                            {isIncome ? "+" : "-"}
                                                            {formatCurrency(Number(transaction.amount))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </>
                            )}
                        </Panel>
                    </div>
                </section>
            </div>
        </main>
    );
}
