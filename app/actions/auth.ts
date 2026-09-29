"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthState =
  | { error: string | null; success?: string }
  | undefined;

function getEmail(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateEmail(email: string): string | null {
  if (!email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return "Please enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 6)
    return "Password must be at least 6 characters long.";
  return null;
}

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = getEmail(formData.get("email"));
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Only show the dashboard once the user is actually authenticated.
  if (!data.session) {
    return {
      error: "Email not confirmed yet. Check your inbox and confirm before logging in.",
    };
  }

  if (!data.user) {
    return { error: "Unable to verify your session. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const name = typeof formData.get("name") === "string"
    ? (formData.get("name") as string).trim()
    : "";
  const email = getEmail(formData.get("email"));
  const password = typeof formData.get("password") === "string"
    ? (formData.get("password") as string)
    : "";
  const dateOfBirth = getEmail(formData.get("date_of_birth"));

  if (!name) return { error: "Name is required." };
  if (!dateOfBirth) return { error: "Date of birth is required." };

  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const passwordError = validatePassword(password);
  if (passwordError) return { error: passwordError };

  const supabase = await createClient();

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

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    return {
      error: null,
      success:
        "Account created. Check your email to confirm your account before logging in.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}