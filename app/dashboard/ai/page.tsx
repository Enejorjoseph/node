import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/actions/auth";
import { LogoutButton } from "@/components/auth/logout-button";
import { ExpenseChat } from "@/components/expenses/expense-chat";
import { ExpenseSummaryCard } from "@/components/expenses/expense-summary";

/**
 * Home of the AI features, moved off the dashboard so that page stays focused on
 * the figures and the expense list. The dashboard links here from its header.
 *
 * Both cards call their own server action, which re-checks the session, so this
 * page needs no data of its own beyond confirming the caller is signed in.
 */
export default async function DashboardAiPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-full bg-slate-950 px-4 py-8 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl space-y-8">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 p-6 sm:p-8">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
                Personal finance
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Add an expense with AI
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
                Describe what you spent in your own words. The category is worked
                out for you, and you confirm every detail before it is saved.
              </p>
            </div>
            <form action={signout} className="shrink-0">
              <LogoutButton variant="light" />
            </form>
          </div>
        </section>

        <ExpenseChat />

        <ExpenseSummaryCard />

        <div className="flex justify-center">
          <Link
            href="/dashboard"
            prefetch={false}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
