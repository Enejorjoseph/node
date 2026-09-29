import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddAccountForm } from "@/components/accounts/add-account-form";
import { DeleteAccountButton } from "@/components/accounts/delete-account-button";

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

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, email, name, date_of_birth, created_at")
    .order("created_at", { ascending: false });

  const accounts: Profile[] = (rows ?? []).map((row) => ({
    id: String(row.id),
    email: String(row.email),
    name: String(row.name),
    date_of_birth:
      typeof row.date_of_birth === "string" ? row.date_of_birth : null,
    created_at: String(row.created_at),
  }));

  const accountCountLabel = `${accounts.length} ${
    accounts.length === 1 ? "account" : "accounts"
  }`;

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
                  Keep your profiles in one place.
                </h2>
                <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
                  Review, add, or remove account profiles without leaving your
                  dashboard.
                </p>
              </div>
              <p className="relative text-sm text-slate-400">
                One view. Every profile.
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
                  Manage accounts
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Add accounts, review profile details, and remove accounts you
                  no longer need.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-indigo-400/20 dark:bg-indigo-500/10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">
                    Total accounts
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Signed in as {user.email}
                  </p>
                </div>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-300">
                  {accounts.length}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="accounts-heading">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Directory
              </p>
              <h2
                id="accounts-heading"
                className="mt-1 text-xl font-bold tracking-tight text-white"
              >
                Accounts
              </h2>
            </div>
            <span className="w-fit rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
              {accountCountLabel}
            </span>
          </div>

          {error ? (
            <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-6 text-sm text-rose-300">
              Unable to load accounts: {error.message}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900 px-6 py-12 text-center">
              <p className="text-sm font-semibold text-white">
                No accounts yet.
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Add one below to get started.
              </p>
            </div>
          ) : (
            <ul className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900">
              {accounts.map((account) => {
                const avatarLabel =
                  getInitials(account.name) || account.email[0].toUpperCase();
                const isCurrentUser = account.id === user.id;

                return (
                  <li
                    key={account.id}
                    className="flex flex-col gap-4 border-b border-slate-800 px-5 py-5 transition-colors last:border-b-0 hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                          isCurrentUser
                            ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {avatarLabel}
                      </div>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 truncate text-sm font-semibold text-white">
                          {account.name || "Unnamed"}
                          {isCurrentUser && (
                            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-300">
                              You
                            </span>
                          )}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-400">
                          {account.email}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">
                          {formatDate(account.date_of_birth)} · Joined{" "}
                          {formatDate(account.created_at.slice(0, 10))}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 sm:pl-4">
                      <DeleteAccountButton
                        id={account.id}
                        isCurrentUser={isCurrentUser}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white">
            <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/25 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                New profile
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">
                Add an account
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Create another account profile to keep your list up to date.
              </p>
            </div>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <AddAccountForm />
          </div>
        </section>
      </div>
    </main>
  );
}
