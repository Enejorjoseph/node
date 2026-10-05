# Auth App

A Next.js (App Router) authentication application backed by Supabase. Users can register, log in, and view their profile on a protected dashboard, then log out.

## Features

- **Register** with name, email, password, and date of birth
- **Login** with email and password
- **Protected dashboard** (`/dashboard`) showing profile info (name, email, date of birth, member since)
- **Expense tracking** with search, category/date/amount filters, and pagination
- **AI monthly summary** that turns the month's figures into a short written summary
- **AI quick add** that reads plain-language expense messages and drafts the rows for you (`/dashboard/ai`)
- **Logout** to clear the auth session
- Route protection via Next.js `proxy` + server-side session checks

## Tech

- Next.js 16 (App Router, Turbopack)
- TypeScript, Tailwind CSS 4
- `@supabase/supabase-js` + `@supabase/ssr` for auth and cookie-based sessions
- Gemini API for the monthly summary and the expense chat. The summary uses
  `gemini-3.5-flash-lite`; the chat uses `gemini-3.1-flash-lite`. Both have
  fallbacks.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → API** and copy the **Project URL** and the **anon/public key**.
3. Create a `.env.local` file with those values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_PUBLABLE_KEY=your-supabase-publishable-key
   ```

4. (Optional) You can leave **Auth → Sign In / Up → Email → Confirm email** enabled. If enabled, new users receive a confirmation email and the callback route at `/auth/callback` completes the sign-in. If disabled, users are logged in immediately after registering.

Profile fields (name, date of birth) are stored in the user's auth metadata, so no database tables or migration SQL are required for that.

The dashboard's expenses feature needs a `public.expenses` table. Run the SQL in [`supabase/migrations/0001_create_expenses.sql`](supabase/migrations/0001_create_expenses.sql) in your project's **SQL editor**. The table enables row-level security so each user can only see and manage their own expenses.

## AI monthly summary

The **Monthly summary** card, on the same `/dashboard/ai` page, turns the
current calendar month into a short written summary: total spent, the largest
category, the change against the previous month, and one category worth
reviewing.

It covers the whole calendar month and ignores the dashboard's list filters,
since it compares that month against the previous one.

## AI quick add

Both AI features live on their own page at `/dashboard/ai`, reached from the
**Add expense** button in the dashboard's header card. Keeping them off the
dashboard leaves that page focused on the figures and the expense list.

The **Tell it what you spent** card turns a plain-language message into draft
expenses. You can write `coffee 2000 yesterday` or
`taxi 3500 and lunch 2000 on friday`, and the model works out the category and
the date from the wording.

Nothing is saved automatically. Every extracted row appears as an editable card
that you confirm, so a wrong category or a missing amount can be corrected before
anything reaches the database. If the message did not state an amount, the field
is left blank and flagged, because guessing a figure would silently corrupt your
records. One message can contain several expenses, which costs a single API
request.

## AI setup

Both features share one key. Get it from
[Google AI Studio](https://aistudio.google.com/apikey) and add it to
`.env.local`:

```env
GEMINI_API_KEY=your-gemini-api-key
```

The models are optional overrides:

```env
GEMINI_MODEL=gemini-3.5-flash
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
```

Both defaults are pinned to specific models rather than an alias such as
`gemini-flash-latest`. Aliases get remapped over time, and the one they point at
may be shedding load and answering `503`. Pinning also means each feature sits in
its **own** per-model daily quota, so heavy chat traffic cannot use up the
quota the summary needs.

Each feature also carries fallback models, tried in order when the first is slow
or shedding capacity. Both lists are comma-separated:

```env
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_MODEL_FALLBACK_MODELS=gemini-3.1-flash-lite,gemini-3.6-flash
GEMINI_CHAT_MODEL=gemini-3.1-flash-lite
GEMINI_CHAT_FALLBACK_MODELS=gemini-3.5-flash-lite,gemini-3.6-flash
```

Every fallback was verified to accept the same schema as the model it backs up,
so falling back never weakens the reply validation. Latency varies a lot by
model, so these are worth choosing deliberately. Benchmarked on the real chat
payload, three runs each:

| Model | Success | Median |
| --- | --- | --- |
| `gemini-3.5-flash-lite` | 3/3 | ~1.6s |
| `gemini-3.1-flash-lite` | 3/3 | ~4.1s |
| `gemini-3.6-flash` | 2/3 | ~4.2s |
| `gemini-3.7-flash` | 0/3 | load-shedding throughout |

`gemini-3.5-flash-lite` is both the fastest and the most reliable of those, so
it is the summary's default and the chat's first fallback.

### "Gemini is busy right now"

Free-tier Flash models load-shed intermittently, which surfaces as a `503`. The
client handles this rather than passing it straight to you:

- **Longer timeouts.** Medians are 1.5-4s but the slow tail reaches ~28s, so a
  request gets 25s before being called a timeout. The original 15s cap was
  aborting calls that were about to succeed.
- **Real backoff.** Waits of 1s, 3s, and 8s between attempts, which is long
  enough to outlast a shedding spike rather than burning every retry inside it.
- **Model fallback.** Each model is served independently, so a busy or slow model
  is swapped for another instead of being hammered.
- **A hard 35s ceiling** across all attempts, so the wait always ends.
- **Spent quota fails immediately.** A daily-cap error asks for hours, so
  retrying is pointless and you get the message straight away instead of after
  waiting out the whole budget.

If you deploy to a platform with a hard function timeout, keep
`OVERALL_BUDGET_MS` in [`lib/ai/gemini.ts`](lib/ai/gemini.ts) below it. Vercel's
Hobby plan caps functions at 60s by default, which is why the budget is 35s.

### About the free tier

The free tier's request quota is counted **per model**, not as one shared
allowance for the project. Exhausting one model leaves the others working. If you
see this:

```
Quota exceeded for metric: generate_content_free_tier_requests,
limit: 20, model: gemini-3.8-flash
```

then only that model is capped, and the counters reset daily. Check current
usage at [ai.dev/rate-limit](https://ai.dev/rate-limit).

Practical consequences:

- Every chat message is one request, so batching several expenses into a single
  message is much cheaper.
- The summary is generated on demand rather than on page load, so it costs little.
- These are developer API quotas and are separate from your usage of the
  AI Studio website.
- For real usage, add billing to [Google AI Studio](https://aistudio.google.com/apikey).

How it is wired:

- [`lib/ai/gemini.ts`](lib/ai/gemini.ts) is the shared HTTP client: key loading,
  timeouts, retries with backoff, model fallback, and turning provider errors into
  messages worth showing a user. Both features go through it.
- [`lib/expenses.ts`](lib/expenses.ts) computes the monthly rollup: totals, per
  category shares, and the previous month for comparison.
- [`lib/ai/summary.ts`](lib/ai/summary.ts) sends that rollup to Gemini and
  validates the reply. **The model never receives raw expense rows**, only the
  pre-calculated figures, and any category in the response that was not in the
  input is discarded.
- [`lib/ai/chat.ts`](lib/ai/chat.ts) holds the chat prompt and JSON Schema, then
  coerces the reply into drafts that are safe to render. Amounts, categories, and
  dates are re-validated on the way in: a category outside the fixed list becomes
  `Other`, an amount that is missing or nonsensical becomes `null`, and an
  impossible date such as `2026-02-31` is rejected rather than rolled over.
- [`app/actions/summary.ts`](app/actions/summary.ts) and
  [`app/actions/chat.ts`](app/actions/chat.ts) are the server actions. The API
  key is read there and never reaches the browser, and the chat action
  re-validates every draft before inserting it.
- Both cards are labelled **AI generated** and ask you to check the output.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated visitors are sent to `/login`.

## Scripts

- `npm run dev` – start the dev server
- `npm run build` – production build
- `npm run lint` – run ESLint