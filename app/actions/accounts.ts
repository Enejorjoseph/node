"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccountActionState =
  | { error: string | null; success?: string }
  | undefined;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function deleteAccount(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const id = field(formData, "id");
  if (!id) return { error: "Account not found." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Accounts are private: only the owner can delete their own.
  if (user.id !== id) return { error: "You can only delete your own account." };

  const { error } = await supabase.rpc("delete_account", { target: id });
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");

  await supabase.auth.signOut();
  redirect("/login");
}
