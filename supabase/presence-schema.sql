-- User presence for online indicator.
-- Run in Supabase SQL editor.

create table if not exists public.user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);

create index if not exists user_presence_last_seen_idx on public.user_presence(last_seen desc);

alter table public.user_presence enable row level security;

drop policy if exists "Anyone can read presence" on public.user_presence;
create policy "Anyone can read presence" on public.user_presence
  for select using (true);

-- Fix: use proper UPSERT pattern for user_presence
drop policy if exists "Users update their presence" on public.user_presence;
create policy "Users upsert their presence" on public.user_presence
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users upsert their presence" on public.user_presence;
create policy "Users update their presence" on public.user_presence
  for update using (auth.uid() = user_id);

-- Grant permissions so anon keys can also read (for unauthenticated visitors to see count)
grant select on public.user_presence to anon, authenticated;
grant insert on public.user_presence to authenticated;
grant update on public.user_presence to authenticated;
