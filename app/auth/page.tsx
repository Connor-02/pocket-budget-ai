"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (mode === "signup" ? "Create your account" : "Sign in to continue"),
    [mode]
  );

  useEffect(() => {
    const queryMode = new URLSearchParams(window.location.search).get("mode");
    if (queryMode === "signin") {
      setMode("signin");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/signin";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName: mode === "signup" ? displayName : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Authentication failed");
      }

      const profileRes = await fetch("/api/dashboard", { method: "GET", cache: "no-store" });
      if (profileRes.status === 404) {
        router.push("/setup");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-black via-[#120304] to-[#2a0608] px-4 py-10 text-white sm:px-6">
      <div className="absolute inset-0">
        <div className="absolute left-[-120px] top-[-110px] h-[300px] w-[300px] rounded-full bg-red-900/20 blur-3xl" />
        <div className="absolute bottom-[-120px] right-[-80px] h-[300px] w-[300px] rounded-full bg-red-700/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-md rounded-3xl border border-red-950/60 bg-white/[0.04] p-6 shadow-[0_0_40px_rgba(127,29,29,0.15)] backdrop-blur-xl sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-red-300/65">
            Pocket Budget AI
          </p>
          <h1 className="mt-3 text-3xl font-bold">{title}</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-red-900/50 bg-black/25 p-1">
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === "signup" ? "bg-red-500/20 text-white" : "text-red-100/70"}`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${mode === "signin" ? "bg-red-500/20 text-white" : "text-red-100/70"}`}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" ? (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name"
              className="w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white placeholder:text-red-100/35 outline-none focus:border-red-500/70"
            />
          ) : null}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white placeholder:text-red-100/35 outline-none focus:border-red-500/70"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={8}
            className="w-full rounded-2xl border border-red-900/50 bg-black/25 px-4 py-3 text-white placeholder:text-red-100/35 outline-none focus:border-red-500/70"
          />

          {error ? (
            <div className="rounded-2xl border border-red-800/60 bg-red-950/30 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-red-800 via-red-700 to-red-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:from-red-700 hover:via-red-600 hover:to-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
