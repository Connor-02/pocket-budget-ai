import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserFromCookies } from "@/lib/auth";

export default async function HomePage() {
  const user = await getAuthenticatedUserFromCookies();

  if (user) {
    const profile = await prisma.budgetProfile.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    redirect(profile ? "/dashboard" : "/setup");
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#120304] to-[#2a0608] px-4 py-10 text-white sm:px-6">
      <div className="absolute inset-0">
        <div className="absolute left-[-120px] top-[-100px] h-[280px] w-[280px] rounded-full bg-red-900/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-90px] h-[320px] w-[320px] rounded-full bg-red-700/10 blur-3xl" />
      </div>
      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-red-300/70">
          Pocket Budget AI
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          Budget Smarter, Not Harder
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-red-100/75">
          Create your account to keep your financial data private, track monthly progress, and
          unlock safe-to-spend insights.
        </p>

        <div className="mt-8 grid w-full max-w-md gap-3">
          <Link
            href="/auth?mode=signup"
            className="rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-red-700 hover:via-red-600 hover:to-red-800"
          >
            Create Account
          </Link>
          <Link
            href="/auth?mode=signin"
            className="rounded-2xl border border-red-900/50 bg-black/25 px-5 py-3.5 text-sm font-semibold text-red-100/85 transition hover:bg-black/35"
          >
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
