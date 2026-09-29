"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function LogoutButton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const { pending } = useFormStatus();
  const [confirming, setConfirming] = useState(false);

  const styles =
    variant === "light"
      ? "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
      : "rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-50";

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={pending}
        className={styles}
      >
        Log out
      </button>
      <ConfirmDialog
        open={confirming}
        title="Log out?"
        message="You will be signed out of your account on this device."
        confirmLabel="Log out"
        cancelLabel="Stay logged in"
        tone="default"
        pendingLabel="Logging out..."
        pending={pending}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}
