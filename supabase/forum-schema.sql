-- Supabase forum schema for Timin观察站.
-- Run this in Supabase SQL editor after enabling Email auth.

create extension if not exists pgcrypto;

create table if not exists public.forum_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '群友补充' check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  bio text check (bio is null or char_length(bio) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.forum_profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  body text not null check (char_length(trim(body)) between 1 and 10000),
  station text not null default '',
  tags text[] not null default '{}',
  is_pinned boolean not null default false,
  is_hidden boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.forum_posts add column if not exists station text not null default '';
alter table public.forum_posts add column if not exists tags text[] not null default '{}';
alter table public.forum_posts alter column is_hidden set default true;

create table if not exists public.forum_replies (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid not null references public.forum_profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.forum_profiles(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  reply_id uuid references public.forum_replies(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (
    (post_id is not null and reply_id is null)
    or (post_id is null and reply_id is not null)
  )
);

create index if not exists forum_profiles_created_at_idx on public.forum_profiles(created_at desc);
create index if not exists forum_posts_created_at_idx on public.forum_posts(created_at desc);
create index if not exists forum_posts_author_id_idx on public.forum_posts(author_id);
create index if not exists forum_posts_visible_idx on public.forum_posts(is_hidden, is_pinned desc, created_at desc);
create index if not exists forum_replies_post_id_created_at_idx on public.forum_replies(post_id, created_at asc);
create index if not exists forum_replies_author_id_idx on public.forum_replies(author_id);
create unique index if not exists forum_likes_post_unique_idx
  on public.forum_likes(user_id, post_id)
  where post_id is not null;
create unique index if not exists forum_likes_reply_unique_idx
  on public.forum_likes(user_id, reply_id)
  where reply_id is not null;

create or replace function public.set_forum_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_forum_profiles_updated_at on public.forum_profiles;
create trigger set_forum_profiles_updated_at
before update on public.forum_profiles
for each row execute function public.set_forum_updated_at();

drop trigger if exists set_forum_posts_updated_at on public.forum_posts;
create trigger set_forum_posts_updated_at
before update on public.forum_posts
for each row execute function public.set_forum_updated_at();

drop trigger if exists set_forum_replies_updated_at on public.forum_replies;
create trigger set_forum_replies_updated_at
before update on public.forum_replies
for each row execute function public.set_forum_updated_at();

create or replace function public.is_forum_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.forum_admins where user_id = check_user_id
  );
$$;

alter table public.forum_profiles enable row level security;
alter table public.forum_admins enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_replies enable row level security;
alter table public.forum_likes enable row level security;

drop policy if exists "Profiles are public" on public.forum_profiles;
create policy "Profiles are public" on public.forum_profiles for select using (true);

drop policy if exists "Users create their profile" on public.forum_profiles;
create policy "Users create their profile" on public.forum_profiles for insert with check (auth.uid() = id);

drop policy if exists "Users update their profile" on public.forum_profiles;
create policy "Users update their profile" on public.forum_profiles for update
using (auth.uid() = id or public.is_forum_admin())
with check (auth.uid() = id or public.is_forum_admin());

drop policy if exists "Admins can read admins" on public.forum_admins;
create policy "Admins can read admins" on public.forum_admins for select using (public.is_forum_admin());

drop policy if exists "Visible posts are public" on public.forum_posts;
create policy "Visible posts are public" on public.forum_posts for select
using (is_hidden = false or author_id = auth.uid() or public.is_forum_admin());

drop policy if exists "Users submit posts for review" on public.forum_posts;
create policy "Users submit posts for review" on public.forum_posts for insert
with check (
  auth.uid() = author_id
  and is_hidden = true
  and is_pinned = false
);

drop policy if exists "Authors update posts" on public.forum_posts;
create policy "Authors update posts" on public.forum_posts for update
using (author_id = auth.uid() or public.is_forum_admin())
with check (
  (author_id = auth.uid() and is_hidden = true and is_pinned = false)
  or public.is_forum_admin()
);

drop policy if exists "Authors delete posts" on public.forum_posts;
create policy "Authors delete posts" on public.forum_posts for delete
using (author_id = auth.uid() or public.is_forum_admin());

drop policy if exists "Visible replies are public" on public.forum_replies;
create policy "Visible replies are public" on public.forum_replies for select
using (is_hidden = false or author_id = auth.uid() or public.is_forum_admin());

drop policy if exists "Users create replies on visible posts" on public.forum_replies;
create policy "Users create replies on visible posts" on public.forum_replies for insert
with check (
  auth.uid() = author_id
  and is_hidden = false
  and exists (select 1 from public.forum_posts where id = post_id and is_hidden = false)
);

drop policy if exists "Authors update replies" on public.forum_replies;
create policy "Authors update replies" on public.forum_replies for update
using (author_id = auth.uid() or public.is_forum_admin())
with check ((author_id = auth.uid() and is_hidden = false) or public.is_forum_admin());

drop policy if exists "Authors delete replies" on public.forum_replies;
create policy "Authors delete replies" on public.forum_replies for delete
using (author_id = auth.uid() or public.is_forum_admin());

drop policy if exists "Likes are public" on public.forum_likes;
create policy "Likes are public" on public.forum_likes for select using (true);

drop policy if exists "Users create their likes" on public.forum_likes;
create policy "Users create their likes" on public.forum_likes for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete their likes" on public.forum_likes;
create policy "Users delete their likes" on public.forum_likes for delete using (auth.uid() = user_id or public.is_forum_admin());

create or replace view public.forum_posts_public
with (security_invoker = true)
as
select
  p.id,
  p.author_id,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  p.title,
  p.body,
  p.station,
  p.tags,
  p.is_pinned,
  p.created_at,
  p.updated_at,
  count(distinct r.id) filter (where r.is_hidden = false) as reply_count,
  count(distinct l.user_id) filter (where l.post_id is not null) as like_count
from public.forum_posts p
join public.forum_profiles pr on pr.id = p.author_id
left join public.forum_replies r on r.post_id = p.id
left join public.forum_likes l on l.post_id = p.id
where p.is_hidden = false
group by p.id, pr.display_name, pr.avatar_url;

create or replace view public.forum_public_posts
with (security_invoker = true)
as select * from public.forum_posts_public;

create or replace view public.forum_public_replies
with (security_invoker = true)
as
select
  r.id,
  r.post_id,
  r.author_id,
  pr.display_name as author_display_name,
  pr.avatar_url as author_avatar_url,
  r.body,
  r.created_at,
  r.updated_at,
  count(l.user_id) filter (where l.reply_id is not null) as like_count
from public.forum_replies r
join public.forum_profiles pr on pr.id = r.author_id
left join public.forum_likes l on l.reply_id = r.id
where r.is_hidden = false
group by r.id, pr.display_name, pr.avatar_url;

grant select on public.forum_posts_public to anon, authenticated;
grant select on public.forum_public_posts to anon, authenticated;
grant select on public.forum_public_replies to anon, authenticated;

-- Admin email bootstrap:
-- 1. Create or invite the first admin user in Supabase Auth.
-- 2. Replace admin@example.com below with that user's email address.
-- 3. Run this from the Supabase SQL editor or a trusted service-role migration.
--
-- insert into public.forum_admins (user_id)
-- select id from auth.users where lower(email) = lower('admin@example.com')
-- on conflict (user_id) do nothing;

