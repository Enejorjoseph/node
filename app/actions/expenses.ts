"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ExpenseState = { error: string } | undefined;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateExpense(
  title: string,
  amount: string,
  category: string,
  expenseDate: string
): string | null {
  if (!title) return "Please give the expense a title.";
  if (!amount || Number.isNaN(Number(amount)) || Number(amount) <= 0) {
    return "Please enter an amount greater than 0.";
  }
  if (!category) return "Please choose a category.";
  if (!expenseDate) return "Please pick a date.";
  return null;
}

export async function addExpense(
  _prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const title = field(formData, "title");
  const amount = field(formData, "amount");
  const category = field(formData, "category");
  const expenseDate = field(formData, "expense_date");

  const validationError = validateExpense(title, amount, category, expenseDate);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("expenses").insert({
    user_id: user.id,
    title,
    amount: Number(amount),
    category,
    expense_date: expenseDate,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return undefined;
}

export async function updateExpense(
  _prevState: ExpenseState,
  formData: FormData
): Promise<ExpenseState> {
  const id = field(formData, "id");
  const title = field(formData, "title");
  const amount = field(formData, "amount");
  const category = field(formData, "category");
  const expenseDate = field(formData, "expense_date");

  if (!id) return { error: "Expense not found." };

  const validationError = validateExpense(title, amount, category, expenseDate);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("expenses")
    .update({
      title,
      amount: Number(amount),
      category,
      expense_date: expenseDate,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return undefined;
}

export async function deleteExpense(formData: FormData): Promise<void> {
  const id = field(formData, "id");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("expenses").delete().eq("id", id);

  revalidatePath("/dashboard");
}
