"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveExpenseDraft, sendChatMessage } from "@/app/actions/chat";
import {
  EXPENSE_CATEGORIES,
  formatNaira,
  toLocalISODate,
  type ExpenseCategory,
} from "@/lib/expenses";
import type { ExpenseDraft } from "@/lib/ai/chat";
import type { ChatTurn } from "@/lib/ai/gemini";

type Entry =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "model"; text: string; drafts: DraftCard[] }
  | { id: string; role: "error"; text: string };

/** A draft the user can edit before it becomes a record. */
type DraftCard = ExpenseDraft & {
  key: string;
  saved: boolean;
};

const inputStyles =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20";

const labelStyles =
  "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin"
    />
  );
}

/**
 * One extracted expense, editable before saving.
 *
 * The amount field is left blank when the message did not state one. That is the
 * point at which the model must not guess and the user has to supply the figure,
 * so it is highlighted and the save button stays disabled until it is filled.
 */
function DraftForm({
  draft,
  onSaved,
}: {
  draft: DraftCard;
  onSaved: (key: string, saved: ExpenseDraft) => void;
}) {
  const [title, setTitle] = useState(draft.title);
  const [amount, setAmount] = useState(
    draft.amount === null ? "" : String(draft.amount)
  );
  const [category, setCategory] = useState<ExpenseCategory>(draft.category);
  const [date, setDate] = useState(draft.date);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const missingAmount = amount.trim() === "";
  const amountNumber = Number(amount);

  function save() {
    setError(null);

    startTransition(async () => {
      const result = await saveExpenseDraft({
        title,
        amount: amountNumber,
        category,
        date,
      });

      if (result.error) {
        setError(result.error);
      } else {
        onSaved(draft.key, {
          title: title.trim(),
          amount: amountNumber,
          category,
          date,
        });
      }
    });
  }

  return (
    <li className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${draft.key}-title`} className={labelStyles}>
            Title
          </label>
          <input
            id={`${draft.key}-title`}
            value={title}
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            className={`${inputStyles} sm:border-slate-200 sm:bg-slate-50/80 sm:text-slate-950 dark:sm:border-slate-700 dark:sm:bg-slate-950 dark:sm:text-white`}
          />
        </div>

        <div>
          <label htmlFor={`${draft.key}-amount`} className={labelStyles}>
            Amount (₦)
          </label>
          <input
            id={`${draft.key}-amount`}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            placeholder="Add the amount"
            aria-invalid={missingAmount}
            className={`${inputStyles} sm:border-slate-200 sm:bg-slate-50/80 sm:text-slate-950 dark:sm:bg-slate-950 dark:sm:text-white ${
              missingAmount
                ? "border-amber-400/60 sm:border-amber-400/60 dark:border-amber-400/60"
                : ""
            }`}
          />
          {missingAmount && (
            <p className="mt-1 text-[11px] leading-4 text-amber-300">
              Not in your message. Add it to save.
            </p>
          )}
        </div>

        <div>
          <label htmlFor={`${draft.key}-category`} className={labelStyles}>
            Category
          </label>
          <select
            id={`${draft.key}-category`}
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as ExpenseCategory)
            }
            className={`${inputStyles} sm:border-slate-200 sm:bg-slate-50/80 sm:text-slate-950 dark:sm:border-slate-700 dark:sm:bg-slate-950 dark:sm:text-white`}
          >
            {EXPENSE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`${draft.key}-date`} className={labelStyles}>
            Date
          </label>
          <input
            id={`${draft.key}-date`}
            type="date"
            value={date}
            max={toLocalISODate()}
            onChange={(event) => setDate(event.target.value)}
            className={`${inputStyles} sm:border-slate-200 sm:bg-slate-50/80 sm:text-slate-950 dark:sm:border-slate-700 dark:sm:bg-slate-950 dark:sm:text-white`}
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-3 text-sm text-rose-300"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending || missingAmount || !title.trim()}
        className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:opacity-50"
      >
        {pending ? "Adding..." : "Add expense"}
      </button>
    </li>
  );
}

export function ExpenseChat() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [entries, pending]);

  function markSaved(key: string, saved: ExpenseDraft) {
    // The saved row shows what was actually recorded, which can differ from what
    // the model suggested if the user filled in or corrected a field.
    setEntries((current) =>
      current.map((entry) =>
        entry.role === "model"
          ? {
              ...entry,
              drafts: entry.drafts.map((draft) =>
                draft.key === key ? { ...saved, key, saved: true } : draft
              ),
            }
          : entry
      )
    );
  }

  function send() {
    const text = message.trim();
    if (!text || pending) return;

    const userEntry: Entry = { id: nextId("u"), role: "user", text };
    setEntries((current) => [...current, userEntry]);
    setMessage("");

    // Only the recent text is replayed, which is what "make that 3000" needs.
    const history: ChatTurn[] = entries
      .filter(
        (entry): entry is Extract<Entry, { role: "user" | "model" }> =>
          entry.role === "user" || entry.role === "model"
      )
      .map((entry) => ({ role: entry.role, text: entry.text }))
      .slice(-8);

    startTransition(async () => {
      const result = await sendChatMessage(text, history);

      if (result.status === "error") {
        setEntries((current) => [
          ...current,
          { id: nextId("e"), role: "error", text: result.message },
        ]);
        return;
      }

      const drafts: DraftCard[] = result.drafts.map((draft) => ({
        ...draft,
        key: nextId("d"),
        saved: false,
      }));

      setEntries((current) => [
        ...current,
        {
          id: nextId("m"),
          role: "model",
          text: result.reply,
          drafts,
        },
      ]);
    });
  }

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
            Quick add
          </p>
          <span className="rounded-full border border-slate-300 bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            AI generated
          </span>
        </div>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          Tell it what you spent
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
          Write it how you would say it. The category is worked out for you, and
          you confirm the details before anything is saved.
        </p>
      </div>

      <div
        ref={listRef}
        aria-live="polite"
        className="mt-6 max-h-96 space-y-3 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60"
      >
        {entries.length === 0 && !pending && (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Try &ldquo;coffee 2000 yesterday&rdquo; or
            &ldquo;taxi 3500 and lunch 2000 on friday&rdquo;.
          </p>
        )}

        {entries.map((entry) => {
          if (entry.role === "user") {
            return (
              <p
                key={entry.id}
                className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3.5 py-2 text-sm text-white"
              >
                {entry.text}
              </p>
            );
          }

          if (entry.role === "error") {
            return (
              <div
                key={entry.id}
                role="alert"
                className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 dark:border-rose-400/20 dark:bg-rose-500/10"
              >
                <p className="text-sm text-rose-700 dark:text-rose-300">
                  {entry.text}
                </p>
              </div>
            );
          }

          return (
            <div key={entry.id} className="space-y-3">
              {entry.text && (
                <p className="max-w-[85%] text-sm leading-6 text-slate-700 dark:text-slate-200">
                  {entry.text}
                </p>
              )}

              {entry.drafts.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Check before saving
                  </p>
                  <ul className="space-y-3">
                    {entry.drafts.map((draft) =>
                      draft.saved ? (
                        <li
                          key={draft.key}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-emerald-100">
                              {draft.title}
                            </p>
                            <p className="mt-0.5 text-xs text-emerald-300/80">
                              {draft.category} · {draft.date}
                            </p>
                          </div>
                          <span className="shrink-0 text-sm font-bold text-emerald-200">
                            {formatNaira(draft.amount ?? 0)}
                          </span>
                        </li>
                      ) : (
                        <DraftForm
                          key={draft.key}
                          draft={draft}
                          onSaved={markSaved}
                        />
                      )
                    )}
                  </ul>
                </>
              )}
            </div>
          );
        })}

        {pending && (
          <p className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Spinner />
            Working out the details...
          </p>
        )}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="chat-message" className={labelStyles}>
            What did you spend?
          </label>
          <textarea
            id="chat-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            maxLength={500}
            placeholder="e.g. spent 4500 on groceries at the market"
            className={`${inputStyles} resize-none sm:border-slate-200 sm:bg-slate-50/80 sm:text-slate-950 sm:placeholder:text-slate-400 dark:sm:border-slate-700 dark:sm:bg-slate-950 dark:sm:text-white`}
          />
        </div>
        <button
          type="submit"
          disabled={pending || !message.trim()}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
        >
          {pending ? "Sending..." : "Send"}
        </button>
      </form>

      <p className="mt-3 text-xs leading-5 text-slate-400 dark:text-slate-500">
        Each message uses one Gemini request. The wording and category are
        suggested by an AI model, so check them before saving.
      </p>
    </article>
  );
}