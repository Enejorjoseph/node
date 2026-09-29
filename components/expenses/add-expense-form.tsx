"use client";

import { useEffect, useActionState, useRef } from "react";
import { addExpense, type ExpenseState } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES, toLocalISODate } from "@/lib/expenses";

const initialState: ExpenseState = undefined;

export function AddExpenseForm() {
  const [state, formAction, pending] = useActionState(addExpense, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  function fillToday() {
    const input = dateRef.current;
    if (input && !input.value) input.value = toLocalISODate();
  }

  useEffect(() => {
    fillToday();
  }, []);

  useEffect(() => {
    if (pending) {
      submittedRef.current = true;
      return;
    }

    if (submittedRef.current) {
      submittedRef.current = false;
      if (!state?.error) {
        formRef.current?.reset();
        fillToday();
      }
    }
  }, [pending, state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor="expense-title"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Title
          </label>
          <input
            id="expense-title"
            name="title"
            type="text"
            placeholder="e.g. Groceries"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div>
          <label
            htmlFor="expense-amount"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Amount (₦)
          </label>
          <input
            id="expense-amount"
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            placeholder="0.00"
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div>
          <label
            htmlFor="expense-category"
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Category
          </label>
          <select
            id="expense-category"
            name="category"
            defaultValue="Food"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          >
            {EXPENSE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label
          htmlFor="expense-date"
          className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Date
        </label>
        <input
          ref={dateRef}
          id="expense-date"
          name="expense_date"
          type="date"
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
        />
      </div>
      {state?.error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
        >
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
      >
        {pending ? "Saving..." : "Add expense"}
      </button>
    </form>
  );
}