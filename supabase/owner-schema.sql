-- Site owner system for Timin观察站.
-- Run in Supabase SQL editor after forum-schema.sql.
-- Site owners are auto-admins and can manage the admin roster.

-- 1. Site owners table
create table if not exists public.site_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.site_owners enable row level security;

-- Everyone can see the owner list (for displaying badges)
drop policy if exists "Owners can read owners" on public.site_owners;
create policy "Owners can read owners" on public.site_owners
  for select using (true);

drop policy if exists "Owners can insert owners" on public.site_owners;
create policy "Owners can insert owners" on public.site_owners
  for insert with check (public.is_site_owner());

drop policy if exists "Owners can delete owners" on public.site_owners;
create policy "Owners can delete owners" on public.site_owners
  for delete using (public.is_site_owner());

-- 2. is_site_owner helper (security definer so RLS on site_owners doesn't block the check)
create or replace function public.is_site_owner(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.site_owners where user_id = check_user_id
  );
$$;

-- 3. Expand is_forum_admin so that site owners are automatically admins
create or replace function public.is_forum_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.forum_admins where user_id = check_user_id
  ) or exists (
    select 1 from public.site_owners where user_id = check_user_id
  );
$$;

-- 4. Let site owners manage the forum_admins roster
drop policy if exists "Admins can read admins" on public.forum_admins;
create policy "Admins can read admins" on public.forum_admins
  for select using (public.is_forum_admin());

drop policy if exists "Owners can insert admins" on public.forum_admins;
create policy "Owners can insert admins" on public.forum_admins
  for insert with check (public.is_site_owner());

drop policy if exists "Owners can delete admins" on public.forum_admins;
create policy "Owners can delete admins" on public.forum_admins
  for delete using (public.is_site_owner());

-- 5. RPC: list all admins with their emails (site-owner only)
create or replace function public.get_admin_list()
returns table (
  user_id uuid,
  email text,
  display_name text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_site_owner() then
    return;
  end if;

  return query
  select
    fa.user_id,
    u.email,
    coalesce(fp.display_name, '噜噜') as display_name,
    fa.created_at
  from public.forum_admins fa
  join auth.users u on u.id = fa.user_id
  left join public.forum_profiles fp on fp.id = fa.user_id
  order by fa.created_at asc;
end;
$$;

revoke execute on function public.get_admin_list() from public, anon;
grant execute on function public.get_admin_list() to authenticated;

-- 6. RPC: add an admin by email (site-owner only)
create or replace function public.add_admin_by_email(target_email text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
begin
  if not public.is_site_owner() then
    return false;
  end if;

  select id into target_id
  from auth.users
  where lower(email) = lower(target_email);

  if target_id is null then
    return false;
  end if;

  insert into public.forum_admins (user_id)
  values (target_id)
  on conflict (user_id) do nothing;

  return true;
end;
$$;

-- 7. RPC: remove an admin (site-owner only; cannot remove a site owner)
create or replace function public.remove_admin(target_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_site_owner() then
    return false;
  end if;

  -- Never remove a site owner from the admin roster
  if exists (select 1 from public.site_owners where user_id = target_user_id) then
    return false;
  end if;

  delete from public.forum_admins where user_id = target_user_id;
  return true;
end;
$$;

-- Bootstrap — 站主邮箱 1938355142@qq.com，在 Supabase SQL Editor 运行下面这条：
insert into public.site_owners (user_id)
select id from auth.users where lower(email) = lower('1938355142@qq.com')
on conflict (user_id) do nothing;
