# Auth App

A Next.js (App Router) authentication application backed by Supabase. Users can register, log in, and view their profile on a protected dashboard, then log out.

## Features

- **Register** with name, email, password, and date of birth
- **Login** with email and password
- **Protected dashboard** (`/dashboard`) showing profile info (name, email, date of birth, member since)
- **Logout** to clear the auth session
- Route protection via Next.js `proxy` + server-side session checks

## Tech

- Next.js 16 (App Router, Turbopack)
- TypeScript, Tailwind CSS 4
- `@supabase/supabase-js` + `@supabase/ssr` for auth and cookie-based sessions

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → API** and copy the **Project URL** and the **anon/public key**.
3. Create a `.env.local` file with those values:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

4. (Optional) You can leave **Auth → Sign In / Up → Email → Confirm email** enabled. If enabled, new users receive a confirmation email and the callback route at `/auth/callback` completes the sign-in. If disabled, users are logged in immediately after registering.

Profile fields (name, date of birth) are stored in the user's auth metadata, so no database tables or migration SQL are required for that.

The dashboard's expenses feature needs a `public.expenses` table. Run the SQL in [`supabase/migrations/0001_create_expenses.sql`](supabase/migrations/0001_create_expenses.sql) in your project's **SQL editor**. The table enables row-level security so each user can only see and manage their own expenses.

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