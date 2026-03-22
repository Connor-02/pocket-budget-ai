"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { href: "/dashboard", label: "Dashboard", short: "DB" },
        { href: "/transactions", label: "Transactions", short: "TX" },
        { href: "/setup", label: "Setup", short: "SU" },
    ];

    function linkClass(path: string) {
        const isActive =
            pathname === path ||
            (path !== "/" && pathname.startsWith(`${path}/`));

        return `group relative flex w-full items-center justify-center gap-2 rounded-xl border px-2.5 py-2.5 text-center text-xs font-medium transition sm:px-4 sm:text-sm ${isActive
            ? "border-red-300/55 bg-gradient-to-r from-red-500/30 to-red-400/10 text-white shadow-[0_0_24px_rgba(248,113,113,0.28)]"
            : "border-transparent text-red-100/75 hover:border-red-900/60 hover:bg-white/[0.04] hover:text-white"
            }`;
    }

    return (
        <header className="sticky top-0 z-50 border-b border-red-900/50 bg-[linear-gradient(180deg,rgba(10,10,12,0.9),rgba(16,3,4,0.82))] shadow-[0_10px_40px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <nav className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
                <Link href="/dashboard" className="group flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-400/35 bg-red-500/15 text-[11px] font-bold tracking-[0.12em] text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
                        PB
                    </div>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-red-300/70 transition group-hover:text-red-200/90 sm:text-[11px] sm:tracking-[0.3em]">
                            Pocket Budget AI
                        </p>
                        <p className="mt-0.5 text-xs text-red-100/75 transition group-hover:text-red-50 sm:text-sm">
                            Personal finance cockpit
                        </p>
                    </div>
                </Link>

                <div className="rounded-2xl border border-red-900/70 bg-black/30 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/55 sm:hidden">
                        Navigation
                    </p>
                    <div className="grid w-full grid-cols-3 gap-1 sm:w-auto">
                        {navItems.map((item) => {
                            const isActive =
                                pathname === item.href ||
                                (item.href !== "/" && pathname.startsWith(`${item.href}/`));

                            return (
                                <Link key={item.href} href={item.href} className={linkClass(item.href)}>
                                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md border text-[9px] font-semibold tracking-[0.05em] ${isActive
                                        ? "border-red-200/45 bg-red-200/15 text-red-50"
                                        : "border-red-900/60 bg-black/25 text-red-100/65 group-hover:text-red-100"
                                        }`}>
                                        {item.short}
                                    </span>
                                    <span className="truncate">{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>
        </header>
    );
}
