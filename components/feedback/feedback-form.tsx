"use client";

import { useActionState, useId, useState } from "react";
import {
  submitParticipantFeedback,
  type FeedbackState,
} from "@/app/actions/feedback";

type TaskOutcome = "" | "completed" | "partial" | "could-not";

type TaskDraft = {
  name: string;
  outcome: TaskOutcome;
  details: string;
};

type MomentDraft = {
  where: string;
  intent: string;
  reason: string;
};

const OUTCOMES: { value: Exclude<TaskOutcome, "">; label: string }[] = [
  { value: "completed", label: "Completed" },
  { value: "partial", label: "Partially completed" },
  { value: "could-not", label: "Could not complete" },
];

const emptyTask = (): TaskDraft => ({ name: "", outcome: "", details: "" });
const emptyMoment = (): MomentDraft => ({
  where: "",
  intent: "",
  reason: "",
});

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-indigo-400 dark:focus:bg-slate-950";

const textareaClass = `${inputClass} min-h-[96px] resize-y`;

const requiredBadge =
  "rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600 dark:bg-rose-500/10 dark:text-rose-300";

const optionalBadge =
  "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400";

const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200";

const removeButton =
  "rounded-lg text-xs font-semibold text-rose-600 transition-colors hover:text-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:text-rose-300 dark:hover:text-rose-200";

function FieldLabel({
  htmlFor,
  label,
  required,
  hint,
}: {
  htmlFor?: string;
  label: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex flex-wrap items-center gap-2">
        {htmlFor ? (
          <label
            htmlFor={htmlFor}
            className="text-sm font-semibold text-slate-700 dark:text-slate-200"
          >
            {label}
          </label>
        ) : (
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {label}
          </span>
        )}
        <span className={required ? requiredBadge : optionalBadge}>
          {required ? "Required" : "Optional"}
        </span>
      </div>
      {hint && (
        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  description,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className="border-t border-slate-200 pt-8 first:border-t-0 first:pt-0 dark:border-slate-800"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">
        {eyebrow}
      </p>
      <h2
        id={id}
        className="mt-1 text-xl font-bold tracking-tight text-slate-950 dark:text-white"
      >
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function FeedbackForm() {
  const baseId = useId();

  const [background, setBackground] = useState("");
  const [tasks, setTasks] = useState<TaskDraft[]>([]);
  const [moments, setMoments] = useState<MomentDraft[]>([]);
  const [workedWell, setWorkedWell] = useState("");
  const [problems, setProblems] = useState("");
  const [overall, setOverall] = useState("");

  const [state, formAction, pending] = useActionState<FeedbackState, FormData>(
    async (prevState: FeedbackState, formData: FormData) => {
      const result = await submitParticipantFeedback(prevState, formData);

      // Every field is controlled, so answers survive a validation error and
      // are only cleared here once a response has actually been stored. This
      // runs as part of the form action, not an effect.
      if (result?.status === "success") {
        setBackground("");
        setTasks([]);
        setMoments([]);
        setWorkedWell("");
        setProblems("");
        setOverall("");
      }

      return result;
    },
    undefined
  );

  function updateTask(index: number, patch: Partial<TaskDraft>) {
    setTasks((current) =>
      current.map((task, i) => (i === index ? { ...task, ...patch } : task))
    );
  }

  function updateMoment(index: number, patch: Partial<MomentDraft>) {
    setMoments((current) =>
      current.map((moment, i) => (i === index ? { ...moment, ...patch } : moment))
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      <p className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
        This form is for you, the participant. Answer in your own words; there
        are no right answers, and a problem-free experience is just as useful to
        record as a difficult one. Fields marked{" "}
        <span className="font-semibold text-rose-600 dark:text-rose-300">
          Required
        </span>{" "}
        must be filled in; everything else is optional.
      </p>

      <Section
        id={`${baseId}-about`}
        eyebrow="Section 1"
        title="About you"
        description="A short description of your relevant experience or background helps make sense of the rest of your answers."
      >
        <div>
          <FieldLabel
            htmlFor={`${baseId}-background`}
            label="Your relevant experience or background"
            required
            hint="Please do not include your name or other identifying details."
          />
          <textarea
            id={`${baseId}-background`}
            name="background"
            value={background}
            onChange={(event) => setBackground(event.target.value)}
            required
            placeholder="For example, how familiar you are with this kind of tool or task."
            className={textareaClass}
          />
        </div>
      </Section>

      <Section
        id={`${baseId}-tasks`}
        eyebrow="Section 2"
        title="Tasks attempted"
        description="Add each task you tried. For each one, say how far you got and describe what you were trying to do and what happened."
      >
        {tasks.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No tasks added yet.
          </p>
        ) : (
          <ul className="space-y-5">
            {tasks.map((task, index) => {
              const outcomeLegendId = `${baseId}-task-${index}-legend`;
              return (
                <li
                  key={index}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Task {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setTasks((current) =>
                          current.filter((_, i) => i !== index)
                        )
                      }
                      className={removeButton}
                    >
                      Remove task
                    </button>
                  </div>

                  <div className="mt-4">
                    <FieldLabel
                      htmlFor={`${baseId}-task-${index}-name`}
                      label="Task name"
                      required
                    />
                    <input
                      id={`${baseId}-task-${index}-name`}
                      type="text"
                      value={task.name}
                      onChange={(event) =>
                        updateTask(index, { name: event.target.value })
                      }
                      required
                      placeholder="Name the task you attempted"
                      className={inputClass}
                    />
                  </div>

                  <fieldset className="mt-4">
                    <legend
                      id={outcomeLegendId}
                      className="text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      How far did you get?{" "}
                      <span className={requiredBadge}>Required</span>
                    </legend>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {OUTCOMES.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50/60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10"
                        >
                          <input
                            type="radio"
                            name={`${baseId}-task-${index}-outcome`}
                            value={option.value}
                            checked={task.outcome === option.value}
                            onChange={() =>
                              updateTask(index, {
                                outcome: option.value,
                              })
                            }
                            required
                            className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-900"
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-4">
                    <FieldLabel
                      htmlFor={`${baseId}-task-${index}-details`}
                      label="What you were trying to do, and what happened"
                      hint="Optional, but useful context."
                    />
                    <textarea
                      id={`${baseId}-task-${index}-details`}
                      value={task.details}
                      onChange={(event) =>
                        updateTask(index, { details: event.target.value })
                      }
                      placeholder="Describe your aim and what happened as you tried."
                      className={textareaClass}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setTasks((current) => [...current, emptyTask()])}
          className={secondaryButton}
        >
          Add a task <span aria-hidden="true">+</span>
        </button>
      </Section>

      <Section
        id={`${baseId}-confusing`}
        eyebrow="Section 3"
        title="Confusing moments"
        description="Add any moments where you felt confused. If nothing was confusing, you can leave this section empty."
      >
        {moments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 px-5 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No confusing moments added yet.
          </p>
        ) : (
          <ul className="space-y-5">
            {moments.map((moment, index) => (
              <li
                key={index}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Moment {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setMoments((current) =>
                        current.filter((_, i) => i !== index)
                      )
                    }
                    className={removeButton}
                  >
                    Remove moment
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <FieldLabel
                      htmlFor={`${baseId}-moment-${index}-where`}
                      label="Where you felt confused"
                    />
                    <input
                      id={`${baseId}-moment-${index}-where`}
                      type="text"
                      value={moment.where}
                      onChange={(event) =>
                        updateMoment(index, { where: event.target.value })
                      }
                      placeholder="The screen or step you were on"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      htmlFor={`${baseId}-moment-${index}-intent`}
                      label="What you were trying to do at the time"
                    />
                    <textarea
                      id={`${baseId}-moment-${index}-intent`}
                      value={moment.intent}
                      onChange={(event) =>
                        updateMoment(index, { intent: event.target.value })
                      }
                      placeholder="Describe your goal in that moment"
                      className={textareaClass}
                    />
                  </div>
                  <div>
                    <FieldLabel
                      htmlFor={`${baseId}-moment-${index}-reason`}
                      label="What made that part unclear, in your own words"
                    />
                    <textarea
                      id={`${baseId}-moment-${index}-reason`}
                      value={moment.reason}
                      onChange={(event) =>
                        updateMoment(index, { reason: event.target.value })
                      }
                      placeholder="Explain what was unclear to you"
                      className={textareaClass}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setMoments((current) => [...current, emptyMoment()])}
          className={secondaryButton}
        >
          Add a confusing moment <span aria-hidden="true">+</span>
        </button>
      </Section>

      <Section
        id={`${baseId}-worked`}
        eyebrow="Section 4"
        title="What worked well"
      >
        <div>
          <FieldLabel
            htmlFor={`${baseId}-worked`}
            label="Which parts felt clear, useful, or easy, and why?"
          />
          <textarea
            id={`${baseId}-worked`}
            name="worked_well"
            value={workedWell}
            onChange={(event) => setWorkedWell(event.target.value)}
            placeholder="Describe the parts that went smoothly and what helped"
            className={textareaClass}
          />
        </div>
      </Section>

      <Section
        id={`${baseId}-problems`}
        eyebrow="Section 5"
        title="Problems and unmet needs"
        description="Describe anything that got in your way. Just say what happened, in your own words; you do not need to suggest a solution."
      >
        <div>
          <FieldLabel
            htmlFor={`${baseId}-problems`}
            label="What got in your way, or what did you wish you could do?"
          />
          <textarea
            id={`${baseId}-problems`}
            name="problems"
            value={problems}
            onChange={(event) => setProblems(event.target.value)}
            placeholder="Describe the problem and what you wanted to do"
            className={textareaClass}
          />
        </div>
      </Section>

      <Section
        id={`${baseId}-overall`}
        eyebrow="Section 6"
        title="Anything else"
      >
        <div>
          <FieldLabel
            htmlFor={`${baseId}-overall`}
            label="Anything else you would like to share"
          />
          <textarea
            id={`${baseId}-overall`}
            name="overall"
            value={overall}
            onChange={(event) => setOverall(event.target.value)}
            placeholder="Add any other thoughts"
            className={textareaClass}
          />
        </div>
      </Section>

      <input
        type="hidden"
        name="tasks"
        value={JSON.stringify(tasks)}
        readOnly
      />
      <input
        type="hidden"
        name="confusing_moments"
        value={JSON.stringify(moments)}
        readOnly
      />

      <div className="space-y-4 border-t border-slate-200 pt-6 dark:border-slate-800">
        {state?.status === "error" && (
          <p
            role="alert"
            className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {state.error}
          </p>
        )}
        {state?.status === "success" && (
          <p
            role="status"
            className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300"
          >
            Thanks — your feedback was submitted.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 disabled:opacity-50"
          >
            {pending ? "Submitting..." : "Submit feedback"}
          </button>
          <p className="max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
            Your answers are sent only when you submit. Nothing is saved until
            then.
          </p>
        </div>
      </div>
    </form>
  );
}
