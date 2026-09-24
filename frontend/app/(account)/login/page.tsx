"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { login } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      const me = await api<{ email: string; role: string }>("/auth/me");
      setUser(me.email, me.role);
      router.push(me.role === "admin" ? "/dashboard" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-4 py-20">
      <h1 className="font-display text-3xl font-bold">Welcome Back</h1>
      <p className="mt-1 text-text-secondary">Sign in to your account</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 outline-none focus:border-accent-primary"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-border bg-surface px-4 py-3 outline-none focus:border-accent-primary"
          />
        </div>
        {error && <p className="text-sm text-accent-primary">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-accent-primary py-3.5 font-semibold text-white hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary">
        No account?{" "}
        <Link href="/register" className="text-accent-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
