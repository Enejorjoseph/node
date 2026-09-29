"use client";

import { useCallback, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteExpense } from "@/app/actions/expenses";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  formatNaira,
  formatShortDate,
  type Expense,
  type ExpenseFilters,
} from "@/lib/expenses";
import { ExpenseFiltersForm } from "./expense-filters";
import { EditExpenseForm } from "./edit-expense-form";
import { Pagination } from "./pagination";

const categoryStyles: Record<string, string> = {
  Food: "bg-orange-500/15 text-orange-300",
  Transport: "bg-sky-500/15 text-sky-300",
  Rent: "bg-violet-500/15 text-violet-300",
  Utilities: "bg-amber-500/15 text-amber-300",
  Health: "bg-rose-500/15 text-rose-300",
  Education: "bg-blue-500/15 text-blue-300",
  Entertainment: "bg-pink-500/15 text-pink-300",
  Shopping: "bg-emerald-500/15 text-emerald-300",
  Other: "bg-slate-800 text-slate-300",
};

function categoryStyle(category: string): string {
  return categoryStyles[category] ?? categoryStyles.Other;
}

function DeleteExpenseButton({ title }: { title: string }) {
  const { pending } = useFormStatus();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmingDelete(true)}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
      >
        Delete
      </button>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this expense?"
        message={
          <>
            <span className="font-semibold text-white">{title}</span> will be
            removed from your records. This cannot be undone.
          </>
        }
        confirmLabel="Delete expense"
        cancelLabel="Keep it"
        pendingLabel="Deleting..."
        pending={pending}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const [editing, setEditing] = useState(false);
  const onSaved = useCallback(() => setEditing(false), []);

  if (editing) {
    return (
      <li className="px-5 py-5 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
          <EditExpenseForm expense={expense} onSaved={onSaved} />
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 transition-colors last:border-b-0 hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${categoryStyle(expense.category)}`}
        >
          {expense.category.slice(0, 1)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {expense.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span
              className={`rounded-full px-2 py-0.5 font-semibold ${categoryStyle(expense.category)}`}
            >
              {expense.category}
            </span>
            <span>{formatShortDate(expense.expense_date)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <p className="text-sm font-bold text-white">
          {formatNaira(expense.amount)}
        </p>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-indigo-300"
        >
          Edit
        </button>
        <form action={deleteExpense}>
          <input type="hidden" name="id" value={expense.id} />
          <DeleteExpenseButton title={expense.title} />
        </form>
      </div>
    </li>
  );
}

export function ExpenseList({
  expenses,
  page,
  totalPages,
  totalExpenses,
  perPage,
  query,
  filters,
  hasFilters,
}: {
  expenses: Expense[];
  page: number;
  totalPages: number;
  totalExpenses: number;
  perPage: number;
  query: string;
  filters: ExpenseFilters;
  hasFilters: boolean;
}) {
  if (expenses.length === 0) {
    if (totalExpenses > 0) {
      return (
        <>
          <ExpenseFiltersForm filters={filters} isFiltered={hasFilters} />
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-semibold text-white">
              Nothing on this page.
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Go back to an earlier page to see your expenses.
            </p>
          </div>
        </>
      );
    }

    return (
      <>
        <ExpenseFiltersForm filters={filters} isFiltered={hasFilters} />
        <div className="px-6 py-12 text-center">
          <p className="text-sm font-semibold text-white">
            {hasFilters
              ? "No expenses match your filters."
              : "No expenses yet this month."}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {hasFilters
              ? "Try widening the date range or clearing a filter."
              : "Add your first expense above."}
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <ExpenseFiltersForm filters={filters} isFiltered={hasFilters} />
      <ul>
        {expenses.map((expense) => (
          <ExpenseRow key={expense.id} expense={expense} />
        ))}
      </ul>
      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalExpenses}
        perPage={perPage}
        query={query}
      />
    </>
  );
}
