import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";
import { LogoutButton } from "@/components/auth/logout-button";

type Profile = {
  id: string;
  email: string;
  name: string;
  date_of_birth: string | null;
  created_at: string;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
    .slice(0, 2);
}

function formatDate(value: string | null): string {
  if (!value) return "Not provided";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // An account is private to its owner, so only ever read the caller's own
  // profile. The row level security policy enforces the same rule in SQL.
  const { data: row, error } = await supabase
    .from("profiles")
    .select("id, email, name, date_of_birth, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profile: Profile | null = row
    ? {
        id: String(row.id),
        email: String(row.email),
        name: String(row.name),
        date_of_birth:
          typeof row.date_of_birth === "string" ? row.date_of_birth : null,
        created_at: String(row.created_at),
      }
    : null;

  const avatarLabel = profile
    ? getInitials(profile.name) || profile.email[0].toUpperCase()
    : "";

  return (
    <main className="min-h-full bg-slate-950 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <aside className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
              <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-bold text-white shadow-lg shadow-indigo-500/25">
                  ₦
                </div>
                <span className="text-sm font-semibold tracking-wide text-slate-200">
                  Personal finance
                </span>
              </div>
              <div className="relative">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-300">
                  Account center
                </p>
                <h2 className="mt-4 max-w-sm text-4xl font-bold leading-tight tracking-tight">
                  Keep your profile up to date.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
                  Review your account details or remove the account without
                  leaving your dashboard.
                </p>
              </div>
              <p className="relative text-sm text-slate-400">
                Private to you. Always.
              </p>
            </aside>

            <div className="p-6 sm:p-10 lg:p-12">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 lg:hidden">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-lg shadow-indigo-600/20">
                    ₦
                  </div>
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Personal finance
                  </span>
                </div>
                <Link
                  href="/dashboard"
                  prefetch={false}
                  className="ml-auto inline-flex w-fit shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-indigo-400/30 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                >
                  Back to dashboard <span aria-hidden="true">→</span>
                </Link>
              </div>

              <div className="mt-10 lg:mt-16">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                  Account center
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
                  Manage account
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Review your profile details. Accounts are private, so nobody
                  else can see or manage yours.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-400/20 dark:bg-indigo-500/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                    Your account
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Signed in as {user.email}
                  </p>
                </div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300">
                  Private
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="account-heading">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Profile
              </p>
              <h2
                id="account-heading"
                className="mt-1 text-xl font-bold tracking-tight text-white"
              >
                Your account
              </h2>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              Visible only to you
            </span>
          </div>

          {error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-300">
              Unable to load your account: {error.message}
            </div>
          ) : profile === null ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-white">
                No profile yet.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Your profile should have been created when you signed up.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
              <div className="flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                    {avatarLabel}
                  </div>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-white">
                      {profile.name || "Unnamed"}
                      <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                        You
                      </span>
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {profile.email}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {formatDate(profile.date_of_birth)} · Joined{" "}
                      {formatDate(profile.created_at.slice(0, 10))}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 sm:pl-4">
                  <DeleteAccountButton id={profile.id} />
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                New account
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                Create another account
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Accounts are separate and private, so you have to sign out before
                you can register a different one.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Signing out takes you to the login page, where you can create a
              brand new account with its own profile and expenses.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <form action={signout}>
                <LogoutButton variant="light" />
              </form>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                then choose <strong>Create account</strong>
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
