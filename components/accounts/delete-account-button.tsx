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
  isCurrentUser,
  onCancel,
}: {
  open: boolean;
  isCurrentUser: boolean;
  onCancel: () => void;
}) {
  const { pending } = useFormStatus();

  return (
    <ConfirmDialog
      open={open}
      title={isCurrentUser ? "Delete your account?" : "Delete this account?"}
      message={
        isCurrentUser
          ? "Your profile and every expense linked to it will be permanently removed. You will be signed out and this cannot be undone."
          : "This account and every expense linked to it will be permanently removed. This cannot be undone."
      }
      confirmLabel={isCurrentUser ? "Delete my account" : "Delete account"}
      cancelLabel="Keep account"
      pendingLabel="Deleting..."
      pending={pending}
      requireText={isCurrentUser ? "DELETE" : undefined}
      onCancel={onCancel}
    />
  );
}

export function DeleteAccountButton({
  id,
  isCurrentUser,
}: {
  id: string;
  isCurrentUser: boolean;
}) {
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
        {isCurrentUser ? "Delete my account" : "Delete"}
      </button>
      <DeleteAccountDialog
        open={confirming}
        isCurrentUser={isCurrentUser}
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
