/**
 * Shared HTTP plumbing for the Gemini API.
 *
 * Holds everything that is identical across features: the key, the request
 * shape, retries, and turning transport errors into messages that are safe to
 * show a user. Each feature supplies its own prompt and response schema.
 *
 * Server-only: reads the API key from the server environment.
 */

const API_ROOT = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Per attempt. Measured medians are 1.5-4s, with a slow tail up to ~28s, so this
 * covers a genuinely slow answer without letting one attempt eat the budget.
 */
const TIMEOUT_MS = 25_000;

/**
 * Ceiling for the whole call, retries included. Every attempt also respects this,
 * so the total time stays bounded even if the model is slow to shed load.
 */
const OVERALL_BUDGET_MS = 35_000;

/**
 * Reads a comma-separated model override, e.g. `GEMINI_CHAT_FALLBACK_MODELS=a,b`.
 * Falls back to the built-in list when unset or blank.
 */
export function modelList(
  value: string | undefined,
  fallback: string[]
): string[] {
  const parsed = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
}

/** Waits between attempts, in order. Long enough to outlast a load-shedding spike. */
const RETRY_DELAYS_MS = [1_000, 3_000, 8_000];

/** Carries a message that is safe to show the user, as opposed to a raw API error. */
export class GeminiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export type ChatTurn = { role: "user" | "model"; text: string };

export type GenerateJsonOptions = {
  /** Preferred model id, e.g. `gemini-3.1-flash-lite`. */
  model: string;
  /**
   * Tried in turn when the preferred model fails with a retryable error. Each
   * model is served independently, so this is the quickest way around a model
   * that is shedding capacity.
   */
  fallbackModels?: string[];
  system: string;
  /** The current user turn. */
  prompt: string;
  /** Prior turns, oldest first. */
  history?: ChatTurn[];
  /** Schema object. */
  schema: unknown;
  /**
   * Which field carries the schema.
   *
   * Gemini 3.x models want `responseJsonSchema` for real JSON Schema, which is
   * the only field that accepts a type union such as `["number", "null"]`. The
   * older OpenAPI-style `responseSchema` is still needed for schemas that use
   * `nullable`, and rejects unions outright.
   */
  schemaField: "responseSchema" | "responseJsonSchema";
  temperature?: number;
  maxOutputTokens?: number;
  /** Gemini 3.x thinking level. Extraction is fine on `minimal`. */
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
};

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new GeminiError(
      "AI features are unavailable because GEMINI_API_KEY is not set."
    );
  }
  return key;
}

/**
 * Load shedding, rate limits and server faults are worth another go, whereas a
 * 400 means the request itself is wrong and would fail identically every time.
 */
function isRetryable(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function backoff(round: number): Promise<void> {
  const base = RETRY_DELAYS_MS[Math.min(round, RETRY_DELAYS_MS.length - 1)];
  // Jitter keeps concurrent retries from landing in lockstep.
  return new Promise((resolve) => setTimeout(resolve, base + Math.random() * 400));
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

/**
 * How long the provider says to wait, in seconds, if it said so.
 *
 * A per-minute limit asks for a few seconds and is worth waiting out. A spent
 * daily quota asks for hours, so retrying inside one request only makes the user
 * wait for an outcome that cannot change.
 */
function retryDelaySeconds(body: string): number | null {
  try {
    const parsed = JSON.parse(body) as {
      error?: { details?: { retryDelay?: string }[] };
    };

    const waits = (parsed.error?.details ?? [])
      .map((detail) => detail?.retryDelay)
      .filter((value): value is string => typeof value === "string")
      .map((value) => Number.parseFloat(value))
      .filter((value) => Number.isFinite(value));

    return waits.length > 0 ? Math.max(...waits) : null;
  } catch {
    return null;
  }
}

/** Beyond this, waiting is not something a single request should attempt. */
const WORTHWAITING_SECONDS = 60;

function readError(body: string, status: number): string {
  let message = "";

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    message = parsed.error?.message ?? "";
  } catch {
    // Fall through to the generic message below.
  }

  if (status === 429) {
    // Worth separating: a spent free-tier quota needs a much longer wait than a
    // per-minute limit, and the upstream message is the only place that knows
    // which one it was.
    return /quota|billing/i.test(message)
      ? "You have reached the Gemini usage limit for this key. Try again once the quota resets."
      : "Gemini is rate limiting this app right now. Please try again shortly.";
  }

  // The alias is load-shed often enough that its raw message reads like a bug
  // report rather than something the user can act on.
  if (status === 503) {
    return "Gemini is busy right now. Please try again in a moment.";
  }

  return message || `Gemini request failed with status ${status}.`;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}

type GenerateContentResponse = {
  candidates?: {
    finishReason?: string;
    content?: { parts?: { text?: string }[] };
  }[];
  promptFeedback?: { blockReason?: string };
};

/**
 * Calls Gemini and returns the parsed JSON object it produced.
 *
 * @throws GeminiError with a message that is safe to render.
 */
export async function generateJson({
  model,
  fallbackModels,
  system,
  prompt,
  history = [],
  schema,
  schemaField,
  temperature = 0.2,
  maxOutputTokens = 2048,
  thinkingLevel,
}: GenerateJsonOptions): Promise<Record<string, unknown>> {
  const key = apiKey();

  // History is oldest-first and the current turn comes last, which is the order
  // the API expects a multi-turn conversation in.
  const contents = [
    ...history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    })),
    { role: "user" as const, parts: [{ text: prompt }] },
  ];

  const request = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-goog-api-key": key,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json",
        [schemaField]: schema,
        ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
      },
    }),
    cache: "no-store",
  } satisfies RequestInit;

  let lastError = "Gemini did not respond. Please try again.";

  // Each model has its own quota bucket and its own load, so a model that is
  // shedding capacity is worth abandoning rather than hammering. Candidates are
  // cycled instead of retried in place, which reaches a working model sooner.
  const candidates = [...new Set([model, ...(fallbackModels ?? [])])];
  const deadline = Date.now() + OVERALL_BUDGET_MS;

  for (let round = 0; Date.now() < deadline; round += 1) {
    const activeModel = candidates[round % candidates.length];
    let response: Response | undefined;

    // Never let a single attempt outlive the overall budget.
    const remaining = deadline - Date.now();
    const timeout = Math.min(TIMEOUT_MS, Math.max(remaining, 1));

    try {
      response = await fetch(
        `${API_ROOT}/models/${activeModel}:generateContent`,
        {
          ...request,
          signal: AbortSignal.timeout(timeout),
        }
      );
    } catch (error) {
      if (!isTimeout(error)) {
        throw new GeminiError(
          "The AI service could not be reached. Please try again."
        );
      }
      lastError = "Gemini took too long to respond. Please try again.";
    }

    if (response) {
      // Always drain the body, including on a retry, so the connection can be
      // reused instead of left hanging.
      const body = await response.text();

      if (response.ok) {
        return parseJson(body);
      }

      lastError = readError(body, response.status);

      const waitSeconds = retryDelaySeconds(body);

      if (
        !isRetryable(response.status) ||
        (waitSeconds !== null && waitSeconds > WORTHWAITING_SECONDS)
      ) {
        throw new GeminiError(lastError);
      }
    }

    const delay = RETRY_DELAYS_MS[Math.min(round, RETRY_DELAYS_MS.length - 1)];
    // Stop rather than sleep past the budget and overshoot the deadline.
    if (Date.now() + delay >= deadline) break;

    await backoff(round);
  }

  throw new GeminiError(lastError);
}

function parseJson(body: string): Record<string, unknown> {
  let data: GenerateContentResponse;
  try {
    data = JSON.parse(body) as GenerateContentResponse;
  } catch {
    throw new GeminiError(
      "Gemini returned an unexpected response. Please try again."
    );
  }

  if (data.promptFeedback?.blockReason) {
    throw new GeminiError(
      "Gemini declined to answer this request. Please try again later."
    );
  }

  const candidate = data.candidates?.[0];

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new GeminiError(
      "The response was cut short. Please try again."
    );
  }

  const text = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    throw new GeminiError("Gemini returned an empty response. Please try again.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(text));
  } catch {
    throw new GeminiError(
      "The response could not be read. Please try again."
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new GeminiError(
      "The response came back in an unexpected shape. Please try again."
    );
  }

  return parsed as Record<string, unknown>;
}