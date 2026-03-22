"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    function linkClass(path: string) {
        const isActive =
            pathname === path ||
            (path !== "/" && pathname.startsWith(`${path}/`));

        return `flex-1 whitespace-nowrap rounded-xl border px-2.5 py-2 text-center text-xs font-medium transition sm:flex-none sm:px-4 sm:text-sm ${isActive
            ? "border-red-400/40 bg-red-500/20 text-red-50 shadow-[0_0_30px_rgba(248,113,113,0.18)]"
            : "border-transparent text-red-100/70 hover:border-red-900/50 hover:bg-white/5 hover:text-white"
            }`;
    }

    return (
        <header className="sticky top-0 z-50 border-b border-red-950/60 bg-black/35 backdrop-blur-xl">
            <nav className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                <Link href="/dashboard" className="group block">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-300/60 transition group-hover:text-red-200/80 sm:text-[11px] sm:tracking-[0.3em]">
                        Pocket Budget AI
                    </p>
                    <p className="mt-1 text-xs text-red-100/70 transition group-hover:text-red-50 sm:text-sm">
                        Personal finance cockpit
                    </p>
                </Link>

                <div className="flex w-full items-center justify-between gap-1 overflow-x-auto rounded-2xl border border-red-950/70 bg-black/25 p-1 sm:w-auto sm:justify-start sm:gap-2">
                    <Link href="/dashboard" className={linkClass("/dashboard")}>
                        Dashboard
                    </Link>

                    <Link href="/transactions" className={linkClass("/transactions")}>
                        Transactions
                    </Link>

                    <Link href="/setup" className={linkClass("/setup")}>
                        Setup
                    </Link>
                </div>
            </nav>
        </header>
    );
}
