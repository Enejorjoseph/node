"use server";

import { redirect } from "next/navigation";
import {
  EXPENSE_CATEGORIES,
  toLocalISODate,
  type ExpenseCategory,
} from "@/lib/expenses";
import { createClient } from "@/lib/supabase/server";
import { createExpense } from "@/app/actions/expenses";
import { extractExpenses, type ExpenseDraft } from "@/lib/ai/chat";
import { GeminiError, type ChatTurn } from "@/lib/ai/gemini";

export type ChatState =
  | { status: "error"; message: string }
  | { status: "ok"; reply: string; drafts: ExpenseDraft[] };

export type SaveState = { error: string | null; saved: number };

export type FeedbackState = { error: string | null; saved: boolean };

const MAX_MESSAGE_CHARS = 25;
const MAX_HISTORY_CHARS = 400;
/** Matches the cap in the extraction module. */
const MAX_HISTORY_TURNS = 8;
const MAX_REPLY_CHARS = 400;

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");
  return user;
}

/**
 * The transcript arrives from the browser and is replayed to Gemini as
 * conversation history, so it is re-validated rather than trusted: roles are
 * whitelisted, and both the turn count and each message length are capped so a
 * tampered payload cannot inflate cost or smuggle in instructions.
 */
function sanitizeHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-MAX_HISTORY_TURNS)
    .filter(
      (turn): turn is Record<string, unknown> =>
        typeof turn === "object" && turn !== null
    )
    .filter((turn) => turn.role === "user" || turn.role === "model")
    .map((turn) => ({
      role: turn.role as "user" | "model",
      text: String(turn.text ?? "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, MAX_HISTORY_CHARS),
    }))
    .filter((turn) => turn.text.length > 0);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  // Catches well-formatted but impossible dates such as 2026-02-31.
  return !Number.isNaN(parsed.getTime()) && toLocalISODate(parsed) === value;
}

/**
 * Extracts expenses from a free-text message.
 *
 * Costs one Gemini request per call, which is the reason a single message can
 * carry several expenses rather than needing one round trip each.
 */
export async function sendChatMessage(
  message: unknown,
  history: unknown
): Promise<ChatState> {
  const text = typeof message === "string" ? message.trim() : "";

  if (!text) {
    return { status: "error", message: "Type what you spent before sending." };
  }

  if (text.length > MAX_MESSAGE_CHARS) {
    return {
      status: "error",
      message: `Keep it under ${MAX_MESSAGE_CHARS} characters.`,
    };
  }

  await requireUser();

  try {
    const result = await extractExpenses(text, sanitizeHistory(history));
    return { status: "ok", ...result };
  } catch (error) {
    if (error instanceof GeminiError) {
      return { status: "error", message: error.message };
    }
    return {
      status: "error",
      message: "That message could not be read. Please try again.",
    };
  }
}

/**
 * Saves one confirmed draft.
 *
 * The draft has been editable in the browser, so it is validated again here
 * rather than trusted. This is the only path that writes to the ledger.
 */
export async function saveExpenseDraft(
  draft: unknown
): Promise<SaveState> {
  await requireUser();

  if (typeof draft !== "object" || draft === null) {
    return { error: "That expense could not be read.", saved: 0 };
  }

  const value = draft as Record<string, unknown>;

  const title = typeof value.title === "string" ? value.title.trim() : "";
  const amount = Number(value.amount);
  const category = String(value.category ?? "");
  const date = typeof value.date === "string" ? value.date : "";

  if (!title) return { error: "Give the expense a title.", saved: 0 };
  if (title.length > 120) {
    return { error: "Keep the title under 120 characters.", saved: 0 };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Enter an amount greater than 0.", saved: 0 };
  }
  if (amount > 1_000_000_000) {
    return { error: "That amount looks too large. Check the figure.", saved: 0 };
  }
  if (
    !EXPENSE_CATEGORIES.includes(category as ExpenseCategory)
  ) {
    return { error: "Choose a category.", saved: 0 };
  }
  if (!isValidDate(date)) {
    return { error: "Pick a valid date.", saved: 0 };
  }

  const result = await createExpense({
    title,
    amount,
    category,
    expenseDate: date,
  });

  if (result?.error) {
    return { error: result.error, saved: 0 };
  }

  return { error: null, saved: 1 };
}

/**
 * Records a thumbs up or thumbs down on one AI reply.
 *
 * The rating arrives from the browser, so it is checked against a whitelist
 * rather than written as-is, and the reply is kept for context because a bare
 * rating is meaningless once the browser history is gone.
 */
export async function recordChatFeedback(
  rating: unknown,
  reply: unknown
): Promise<FeedbackState> {
  if (rating !== "up" && rating !== "down") {
    return { error: "Choose thumbs up or thumbs down.", saved: false };
  }

  const text =
    typeof reply === "string"
      ? reply.replace(/\s+/g, " ").trim().slice(0, MAX_REPLY_CHARS)
      : "";

  const user = await requireUser();

  const supabase = await createClient();
  const { error } = await supabase.from("chat_feedback").insert({
    user_id: user.id,
    rating,
    reply: text,
  });

  if (error) {
    return { error: "That feedback could not be saved. Try again.", saved: false };
  }

  return { error: null, saved: true };
}