"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FeedbackState =
  | { status: "success" }
  | { status: "error"; error: string }
  | undefined;

type TaskFeedback = {
  name: string;
  outcome: string;
  details: string;
};

type ConfusingMoment = {
  where: string;
  intent: string;
  reason: string;
};

const OUTCOME_VALUES = new Set(["completed", "partial", "could-not"]);

const MAX_TASKS = 20;
const MAX_MOMENTS = 20;
const MAX_BACKGROUND = 2000;
const MAX_TASK_NAME = 300;
const MAX_TASK_DETAILS = 3000;
const MAX_MOMENT_FIELD = 2000;
const MAX_COMMENT = 4000;

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function parseList(value: unknown): unknown[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function normaliseTask(value: unknown): TaskFeedback {
  const record = asRecord(value);
  return {
    name: clamp(toText(record.name), MAX_TASK_NAME),
    outcome: toText(record.outcome),
    details: clamp(toText(record.details), MAX_TASK_DETAILS),
  };
}

function normaliseMoment(value: unknown): ConfusingMoment {
  const record = asRecord(value);
  return {
    where: clamp(toText(record.where), MAX_MOMENT_FIELD),
    intent: clamp(toText(record.intent), MAX_MOMENT_FIELD),
    reason: clamp(toText(record.reason), MAX_MOMENT_FIELD),
  };
}

/**
 * Validates and stores one participant testing response for the signed-in user.
 *
 * Everything the participant writes is submitted by them, so the text fields
 * are only trimmed and length-capped; the structured lists are re-validated
 * here rather than trusted from the browser. Nothing is written for an empty
 * submission, and a failed insert is reported back instead of being swallowed.
 */
export async function submitParticipantFeedback(
  _prevState: FeedbackState,
  formData: FormData
): Promise<FeedbackState> {
  const background = clamp(toText(formData.get("background")), MAX_BACKGROUND);

  if (!background) {
    return {
      status: "error",
      error:
        "Please add a short description of your background before submitting.",
    };
  }

  const tasks = parseList(formData.get("tasks"))
    .map(normaliseTask)
    .filter((task) => task.name || task.outcome || task.details);

  if (tasks.length > MAX_TASKS) {
    return {
      status: "error",
      error: `Please limit this to ${MAX_TASKS} tasks.`,
    };
  }

  for (const task of tasks) {
    if (!task.name) {
      return {
        status: "error",
        error:
          "Each task you add needs a name. Give it a name or remove the empty task.",
      };
    }
    if (!OUTCOME_VALUES.has(task.outcome)) {
      return {
        status: "error",
        error: `For "${task.name}", choose whether you completed it, partially completed it, or could not complete it.`,
      };
    }
  }

  const moments = parseList(formData.get("confusing_moments"))
    .map(normaliseMoment)
    .filter((moment) => moment.where || moment.intent || moment.reason);

  if (moments.length > MAX_MOMENTS) {
    return {
      status: "error",
      error: `Please limit confusing moments to ${MAX_MOMENTS}.`,
    };
  }

  const workedWell = clamp(toText(formData.get("worked_well")), MAX_COMMENT);
  const problems = clamp(toText(formData.get("problems")), MAX_COMMENT);
  const overall = clamp(toText(formData.get("overall")), MAX_COMMENT);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase.from("participant_feedback").insert({
    user_id: user.id,
    background,
    tasks,
    confusing_moments: moments,
    worked_well: workedWell,
    problems,
    overall,
  });

  if (error) {
    // A missing table means the migration has not been applied yet. Say so
    // plainly rather than showing a raw database error, and never pretend the
    // response was saved.
    if (error.code === "42P01" || error.code === "PGRST205") {
      return {
        status: "error",
        error:
          "The feedback table is not set up yet, so nothing was saved. Run supabase/migrations/0009_create_participant_feedback.sql in the Supabase SQL editor, then submit again.",
      };
    }
    return { status: "error", error: error.message };
  }

  return { status: "success" };
}
