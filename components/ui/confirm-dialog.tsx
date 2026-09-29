"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type ConfirmTone = "danger" | "default";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pendingLabel?: string;
  tone?: ConfirmTone;
  submit?: boolean;
  pending?: boolean;
  requireText?: string;
  onConfirm?: () => void;
  onCancel: () => void;
};

const confirmStyles: Record<ConfirmTone, string> = {
  danger: "bg-rose-600 hover:bg-rose-500 focus-visible:ring-rose-300",
  default: "bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-indigo-300",
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  pendingLabel = "Working...",
  tone = "danger",
  submit = true,
  pending = false,
  requireText,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [typed, setTyped] = useState("");
  const titleId = useId();
  const messageId = useId();
  const phraseId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      setTyped("");
      dialog.showModal();
      // Always land on the safe choice first.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isBlocked = requireText !== undefined && typed.trim() !== requireText;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-0 text-slate-100 shadow-2xl backdrop:bg-slate-950/70"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onCancel();
      }}
    >
      <div className="p-6">
        <h2
          id={titleId}
          className="text-lg font-bold tracking-tight text-white"
        >
          {title}
        </h2>
        <div id={messageId} className="mt-2 text-sm leading-6 text-slate-300">
          {message}
        </div>

        {requireText !== undefined && (
          <div className="mt-5">
            <label
              htmlFor={phraseId}
              className="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Type <span className="text-rose-300">{requireText}</span> to
              continue
            </label>
            <input
              id={phraseId}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              disabled={pending}
              autoComplete="off"
              spellCheck={false}
              className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-rose-400/50 focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type={submit ? "submit" : "button"}
            onClick={onConfirm}
            disabled={pending || isBlocked}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus-visible:ring-2 disabled:opacity-50 ${confirmStyles[tone]}`}
          >
            {pending ? pendingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
