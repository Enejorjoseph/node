"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AccountActionState =
  | { error: string | null; success?: string }
  | undefined;

function field(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateAccount(
  name: string,
  email: string,
  password: string,
  dateOfBirth: string
): string | null {
  if (!name) return "Name is required.";
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Please enter a valid email address.";
  if (!password) return "Password is required.";
  if (password.length < 6)
    return "Password must be at least 6 characters long.";
  if (!dateOfBirth) return "Date of birth is required.";
  return null;
}

export async function addAccount(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  const name = field(formData, "name");
  const email = field(formData, "email");
  const password = field(formData, "password");
  const dateOfBirth = field(formData, "date_of_birth");

  const validationError = validateAccount(name, email, password, dateOfBirth);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const origin = (await headers()).get("origin") ?? undefined;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        date_of_birth: dateOfBirth,
      },
      emailRedirectTo: origin
        ? `${origin}/auth/callback`
        : undefined,
    },
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");

  if (!data.session) {
    return {
      error: null,
      success: `Account created for ${email}. They'll need to confirm their email before logging in.`,
    };
  }

  return { error: null, success: `Account created for ${email}.` };
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

  const { error } = await supabase.rpc("delete_account", { target: id });
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");

  if (user.id === id) {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return { error: null, success: "Account deleted." };
}
