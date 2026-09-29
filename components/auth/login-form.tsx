"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "@/app/actions/auth";
import { AuthCard } from "@/components/auth/auth-card";

const initialState: AuthState = undefined;

export function LoginForm({ notification }: { notification?: string }) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Log in to your account"
      action={formAction}
      pending={pending}
      submitLabel={pending ? "Logging in..." : "Log in"}
      error={state?.error}
    >
      {notification && (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
          {notification}
        </p>
      )}
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
        />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {"Don't have an account? "}
        <Link href="/register" className="font-semibold text-indigo-600 underline decoration-indigo-200 underline-offset-4 transition-colors hover:text-indigo-500 dark:text-indigo-400 dark:decoration-indigo-700">
          Register
        </Link>
      </p>
    </AuthCard>
  );
}