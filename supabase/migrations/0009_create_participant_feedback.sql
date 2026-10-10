-- Participant-facing user testing feedback, one row per submitted response.
--
-- The form is submitted by the signed-in participant, so each row is owned by
-- that user and row level security keeps it to them. Repeated items (the tasks
-- attempted and the confusing moments) are stored as JSON arrays because their
-- length varies per response and the answers are read back exactly as written.

create table if not exists public.participant_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  background text not null default '',
  tasks jsonb not null default '[]'::jsonb,
  confusing_moments jsonb not null default '[]'::jsonb,
  worked_well text not null default '',
  problems text not null default '',
  overall text not null default '',
  created_at timestamptz not null default now()
);

alter table public.participant_feedback enable row level security;

drop policy if exists "Users can manage their own participant feedback" on public.participant_feedback;

create policy "Users can manage their own participant feedback"
  on public.participant_feedback
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists participant_feedback_user_id_created_idx
  on public.participant_feedback (user_id, created_at desc);
