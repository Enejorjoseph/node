"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteAccount,
  type AccountActionState,
} from "@/app/actions/accounts";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const initialState: AccountActionState = undefined;

function DeleteAccountDialog({
  open,
  onCancel,
}: {
  open: boolean;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <ConfirmDialog
      open={open}
      title="Delete your account?"
      message="Your profile and every expense linked to it will be permanently removed. You will be signed out and this cannot be undone."
      confirmLabel="Delete my account"
      cancelLabel="Keep account"
      pendingLabel="Deleting..."
      pending={pending}
      requireText="DELETE"
      onCancel={onCancel}
    />
  );
}

export function DeleteAccountButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(deleteAccount, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-semibold text-slate-300 transition-colors hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-rose-300"
      >
        Delete my account
      </button>
      <DeleteAccountDialog
        open={confirming}
        onCancel={() => setConfirming(false)}
      />
      {state?.error && (
        <p
          role="alert"
          className="max-w-xs text-right text-xs text-rose-300"
        >
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="max-w-xs text-right text-xs text-emerald-300">
          {state.success}
        </p>
      )}
    </form>
  );
}
