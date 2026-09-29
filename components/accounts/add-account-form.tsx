"use client";

import { useActionState } from "react";
import { addAccount, type AccountActionState } from "@/app/actions/accounts";

const initialState: AccountActionState = undefined;

export function AddAccountForm() {
  const [state, formAction, pending] = useActionState(
    addAccount,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="account-name"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Name
          </label>
          <input
            id="account-name"
            name="name"
            type="text"
            placeholder="e.g. Ada Obi"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div className="sm:col-span-2">
          <label
            htmlFor="account-email"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Email
          </label>
          <input
            id="account-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="name@example.com"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div>
          <label
            htmlFor="account-password"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Password
          </label>
          <input
            id="account-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div>
          <label
            htmlFor="account-dob"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Date of birth
          </label>
          <input
            id="account-dob"
            name="date_of_birth"
            type="date"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
      </div>
      {state?.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-400">
          {state.success}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
      >
        {pending ? "Creating..." : "Add account"}
      </button>
    </form>
  );
}