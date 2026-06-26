-- Full-text search migration for Timix观察站.
-- Run in Supabase SQL editor after forum-schema.sql.

-- 1. Enable pg_trgm extension for trigram-based fuzzy search
create extension if not exists pg_trgm;

-- 2. Add GIN indexes for full-text search on forum_posts
create index if not exists forum_posts_body_trgm_idx
  on public.forum_posts using gin (body gin_trgm_ops);

create index if not exists forum_posts_station_trgm_idx
  on public.forum_posts using gin (station gin_trgm_ops);

create index if not exists forum_posts_tags_gin_idx
  on public.forum_posts using gin (tags);

-- 3. RPC: server-side full-text search across posts (visible only)
-- Uses pg_trgm similarity + ILIKE for CJK-friendly matching
create or replace function public.search_forum_posts(
  query text,
  tag_filter text default null,
  sort_by text default 'latest',
  page_size int default 20,
  page_cursor timestamptz default null,
  station_filter text default null
)
returns table (
  id uuid,
  author_id uuid,
  author_display_name text,
  author_avatar_url text,
  title text,
  body text,
  station text,
  tags text[],
  is_pinned boolean,
  created_at timestamptz,
  updated_at timestamptz,
  reply_count bigint,
  like_count bigint,
  rank real,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered as (
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
      count(distinct l.user_id) filter (where l.post_id is not null) as like_count,
      -- Relevance scoring: trigram similarity + pinned boost
      case
        when query is null or trim(query) = '' then 1.0
        else
          greatest(
            similarity(p.body, query),
            similarity(p.station, query),
            similarity(p.title, query)
          ) * (case when p.is_pinned then 2.0 else 1.0 end)
      end as rank,
      count(*) over () as total_count
    from public.forum_posts p
    join public.forum_profiles pr on pr.id = p.author_id
    left join public.forum_replies r on r.post_id = p.id
    left join public.forum_likes l on l.post_id = p.id
    where p.is_hidden = false
      and (station_filter is null or p.station = station_filter)
      and (
        query is null
        or trim(query) = ''
        or p.body ilike '%' || query || '%'
        or p.station ilike '%' || query || '%'
        or p.title ilike '%' || query || '%'
        or exists (
          select 1 from unnest(p.tags) t
          where t ilike '%' || query || '%'
        )
        or similarity(p.body, query) > 0.05
        or similarity(p.station, query) > 0.05
      )
      and (tag_filter is null or tag_filter = any(p.tags))
    group by p.id, pr.display_name, pr.avatar_url
  )
  select *
  from filtered
  where
    (page_cursor is null or created_at < page_cursor)
  order by
    is_pinned desc,
    case
      when sort_by = 'mostLikes' then like_count
      when sort_by = 'mostReplies' then reply_count
      else 0
    end desc,
    created_at desc
  limit page_size;
$$;

-- 4. RPC: simple keyword search (lighter, for autocomplete/tag suggestions)
create or replace function public.search_tags(
  query text,
  limit_count int default 10
)
returns table (tag text, usage_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    unnest_tag as tag,
    count(*) as usage_count
  from public.forum_posts,
    unnest(tags) as unnest_tag
  where is_hidden = false
    and unnest_tag ilike '%' || query || '%'
  group by unnest_tag
  order by usage_count desc
  limit limit_count;
$$;
