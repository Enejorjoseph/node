"use client";

import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  subtitle: string;
  action: (formData: FormData) => void;
  pending: boolean;
  submitLabel: string;
  error?: string | null;
  success?: string;
  children: ReactNode;
};

export function AuthCard({
  title,
  subtitle,
  action,
  pending,
  submitLabel,
  error,
  success,
  children,
}: AuthCardProps) {
  return (
    <div className="min-h-full bg-slate-950 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.05fr_0.95fr]">
        <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="relative">
            <div className="mb-16 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
                ₦
              </div>
              <span className="text-sm font-semibold tracking-wide text-slate-200">
                Personal finance
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
              A clearer view of your money
            </p>
            <h2 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight">
              Make every naira count.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
              Keep your spending organized, simple, and easy to understand.
            </p>
          </div>
          <div className="relative">
            <div className="mb-4 h-px bg-white/15" />
            <p className="text-sm text-slate-400">
              One dashboard for the moments that matter.
            </p>
          </div>
        </aside>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-12 sm:py-14">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                ₦
              </div>
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Personal finance
              </span>
            </div>

            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                {subtitle}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
                {title}
              </h1>
            </div>

            <form action={action} className="flex flex-col gap-5">
              {children}
              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
                >
                  {error}
                </p>
              )}
              {success && (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {success}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="mt-1 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
              >
                {submitLabel}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
