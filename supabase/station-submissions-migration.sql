-- ========================================
-- Timix观察站 · 中转站提交审核表
-- 在 Supabase SQL Editor 中运行
-- ========================================

-- 1. 创建提交表
create table if not exists public.station_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('新站点', '纠错', '补充备注')),
  station_name text not null,
  url text not null default '',
  price_or_rate text not null default '',
  note text not null,
  contact text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text not null default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id)
);

-- 2. 索引
create index if not exists idx_station_submissions_status on public.station_submissions(status);
create index if not exists idx_station_submissions_submitted_at on public.station_submissions(submitted_at desc);

-- 3. RLS
alter table public.station_submissions enable row level security;

-- 任何人都可以插入（提交）
drop policy if exists "Anyone can submit" on public.station_submissions;
create policy "Anyone can submit" on public.station_submissions
  for insert with check (true);

-- 只有管理员/站主可以查看提交，避免联系方式被所有登录用户读到。
drop policy if exists "Authenticated can view submissions" on public.station_submissions;
drop policy if exists "Admins can view submissions" on public.station_submissions;
create policy "Admins can view submissions" on public.station_submissions
  for select using (public.is_forum_admin());

-- 管理员可以更新提交状态
drop policy if exists "Admins can update submissions" on public.station_submissions;
create policy "Admins can update submissions" on public.station_submissions
  for update using (public.is_forum_admin())
  with check (public.is_forum_admin());

-- 4. 权限
grant insert on public.station_submissions to anon, authenticated;
grant select on public.station_submissions to authenticated;
grant update on public.station_submissions to authenticated;
