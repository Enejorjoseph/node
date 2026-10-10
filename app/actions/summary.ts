"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildMonthStats, monthLabel, monthRangeFor } from "@/lib/expenses";
import { GeminiError } from "@/lib/ai/gemini";
import { generateExpenseSummary, type ExpenseSummary } from "@/lib/ai/summary";

export type SummaryState =
  | { status: "error"; message: string }
  | { status: "success"; month: string; summary: ExpenseSummary };

type SpendingRow = {
  amount: unknown;
  category: unknown;
  expense_date: unknown;
};

/**
 * Generates the AI summary for the current calendar month.
 *
 * Deliberately ignores the dashboard's list filters. The summary compares a
 * whole month against the one before it, and a month trimmed to "Food" would
 * have no meaningful previous month to compare against.
 */
export async function generateSummary(): Promise<SummaryState> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const current = monthRangeFor(0);
  const previous = monthRangeFor(-1);

  // One round trip for both months, split in memory. Row-level security keeps
  // this scoped to the signed-in user.
  const { data, error: queryError } = await supabase
    .from("expenses")
    .select("amount, category, expense_date")
    .eq("user_id", user.id)
    .eq("dismissed", false)
    .gte("expense_date", previous.startOfMonth)
    .lte("expense_date", current.endOfMonth);

  if (queryError) {
    return {
      status: "error",
      message: "Your expenses could not be loaded, so there is nothing to summarise.",
    };
  }

  const rows: SpendingRow[] = data ?? [];
  const inPrevious = (row: SpendingRow) =>
    String(row.expense_date) >= previous.startOfMonth &&
    String(row.expense_date) <= previous.endOfMonth;

  const currentRows = rows.filter((row) => !inPrevious(row));
  const previousRows = rows.filter(inPrevious);

  if (currentRows.length === 0) {
    return {
      status: "error",
      message: `There are no expenses recorded in ${monthLabel()} yet, so there is nothing to summarise.`,
    };
  }

  const stats = buildMonthStats({
    current: currentRows.map((row) => ({
      amount: Number(row.amount),
      category: String(row.category),
    })),
    previous: previousRows.map((row) => ({
      amount: Number(row.amount),
      category: String(row.category),
    })),
  });

  try {
    const summary = await generateExpenseSummary(stats);
    return { status: "success", month: stats.month, summary };
  } catch (summaryError) {
    if (summaryError instanceof GeminiError) {
      return { status: "error", message: summaryError.message };
    }
    return {
      status: "error",
      message: "The summary could not be generated. Please try again.",
    };
  }
}