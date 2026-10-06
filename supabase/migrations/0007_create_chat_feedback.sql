-- Thumbs up/down on an AI chat reply, recorded so replies that misread a
-- message can be found and reviewed later.
--
-- The reply text is stored alongside the rating because a rating on its own
-- says nothing about which answer was wrong once the browser history is cleared.

create table if not exists public.chat_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  reply text not null default '',
  created_at timestamptz not null default now()
);

alter table public.chat_feedback enable row level security;

drop policy if exists "Users can manage their own chat feedback" on public.chat_feedback;

create policy "Users can manage their own chat feedback"
  on public.chat_feedback
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists chat_feedback_user_id_created_idx
  on public.chat_feedback (user_id, created_at desc);
