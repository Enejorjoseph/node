"use client";

import { useEffect, useActionState } from "react";
import { updateExpense, type ExpenseState } from "@/app/actions/expenses";
import { EXPENSE_CATEGORIES, toLocalISODate, type Expense } from "@/lib/expenses";

const initialState: ExpenseState = undefined;

export function EditExpenseForm({
  expense,
  onSaved,
}: {
  expense: Expense;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateExpense, initialState);

  useEffect(() => {
    if (state && !state.error) onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="id" value={expense.id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label
            htmlFor={`edit-title-${expense.id}`}
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Title
          </label>
          <input
            id={`edit-title-${expense.id}`}
            name="title"
            type="text"
            defaultValue={expense.title}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-amount-${expense.id}`}
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Amount (₦)
          </label>
          <input
            id={`edit-amount-${expense.id}`}
            name="amount"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            defaultValue={expense.amount}
            required
            className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
          />
        </div>
        <div>
          <label
            htmlFor={`edit-category-${expense.id}`}
            className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            Category
          </label>
          <select
            id={`edit-category-${expense.id}`}
            name="category"
            defaultValue={expense.category}
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
          htmlFor={`edit-date-${expense.id}`}
          className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200"
        >
          Date
        </label>
        <input
          id={`edit-date-${expense.id}`}
          name="expense_date"
          type="date"
          defaultValue={expense.expense_date}
          max={toLocalISODate()}
          required
          className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950"
        />
      </div>
      {state?.error && (
        <p
          role="alert"
          className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400"
        >
          {state.error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
        >
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          onClick={onSaved}
          disabled={pending}
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}