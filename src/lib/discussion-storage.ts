"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const FORUM_POSTS_PUBLIC_VIEW = "forum_posts_public";
const FORUM_PUBLIC_REPLIES_VIEW = "forum_public_replies";
const MAX_FORUM_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_EXTERNAL_URL_LENGTH = 500;
const ALLOWED_FORUM_IMAGE_TYPES = {
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
const DEFAULT_SPAM_KEYWORDS = [
  "加微信",
  "免费领取",
  "点击链接",
  "日赚",
  "兼职",
  "刷单",
  "代理",
  "广告",
] as const;
const DISALLOWED_TEXT_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export type DiscussionPost = {
  issueNumber: string;
  author: string;
  authorId?: string;
  authorAvatarUrl?: string;
  handle: string;
  postedAt: string;
  createdAt: string;
  updatedAt: string;
  body: string;
  tags: string[];
  station?: string;
  likes: number;
  replyCount: number;
  is_pinned?: boolean;
};

export type DiscussionReply = {
  id: string;
  author: string;
  authorId?: string;
  avatar: string;
  postedAt: string;
  body: string;
  likes: number;
};

export type CreateDiscussionPostInput = {
  author?: string;
  handle?: string;
  body: string;
  station?: string;
  tags?: string[];
};

type ForumPostRow = {
  id: string;
  author_id?: string;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  title?: string | null;
  body: string;
  station?: string | null;
  tags?: string[] | null;
  is_pinned?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  posted_at?: string | null;
  reply_count?: number | null;
  like_count?: number | null;
  likes?: number | null;
};

type ForumReplyRow = {
  id: string;
  post_id: string;
  author_id?: string;
  author_display_name?: string | null;
  author_avatar_url?: string | null;
  body: string;
  created_at: string;
  like_count?: number | null;
};

type RateLimitedTable = "forum_posts" | "forum_replies" | "station_reviews";

const localRateLimitCache = new Map<string, number>();

function assertConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase forum is not configured.");
  }
}

function formatDate(value?: string | null) {
  if (!value) return "刚刚";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function postFromRow(row: ForumPostRow): DiscussionPost {
  return {
    issueNumber: row.id,
    author: row.author_display_name || "噜噜",
    authorId: row.author_id || undefined,
    authorAvatarUrl: row.author_avatar_url || undefined,
    handle: "@forum",
    postedAt: formatDate(row.posted_at ?? row.created_at),
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
    body: row.body,
    station: row.station || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: Number(row.like_count ?? row.likes ?? 0),
    replyCount: Number(row.reply_count ?? 0),
    is_pinned: row.is_pinned ?? false,
  };
}

function replyFromRow(row: ForumReplyRow): DiscussionReply {
  return {
    id: row.id,
    author: row.author_display_name || "噜噜",
    authorId: row.author_id || undefined,
    avatar: row.author_avatar_url || "",
    postedAt: formatDate(row.created_at),
    body: row.body,
    likes: Number(row.like_count ?? 0),
  };
}

function normalizeRequiredText(value: string, emptyMessage: string) {
  const trimmed = value
    .replace(DISALLOWED_TEXT_CHARACTERS, "")
    .replace(/\r\n?/g, "\n")
    .trim();
  if (!trimmed) {
    throw new Error(emptyMessage);
  }
  return trimmed;
}

function normalizeSingleLineText(value: string) {
  return value
    .replace(DISALLOWED_TEXT_CHARACTERS, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeOptionalHttpUrl(value: string, fieldName: string = "链接") {
  const trimmed = normalizeSingleLineText(value);
  if (!trimmed) {
    return "";
  }

  if (trimmed.length > MAX_EXTERNAL_URL_LENGTH) {
    throw new Error(`${fieldName}不能超过 ${MAX_EXTERNAL_URL_LENGTH} 个字符。`);
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(trimmed);
  } catch {
    throw new Error(`请填写有效的${fieldName}。`);
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`${fieldName}仅支持 http 或 https。`);
  }

  if (!parsedUrl.hostname) {
    throw new Error(`请填写有效的${fieldName}。`);
  }

  parsedUrl.username = "";
  parsedUrl.password = "";
  return parsedUrl.toString();
}

export function normalizeOptionalImageUrl(value: string, fieldName: string = "图片链接") {
  return normalizeOptionalHttpUrl(value, fieldName);
}

function normalizeTags(tags?: string[]) {
  if (!Array.isArray(tags)) return [];

  const uniqueTags = new Set<string>();
  for (const tag of tags) {
    const trimmed = normalizeSingleLineText(tag);
    if (trimmed) {
      uniqueTags.add(trimmed.slice(0, 40));
    }
  }

  return Array.from(uniqueTags);
}

function normalizeSpamText(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/\s+/g, "");
}

function containsSpamKeyword(value: string) {
  const normalizedContent = normalizeSpamText(value);
  return DEFAULT_SPAM_KEYWORDS.some((keyword) =>
    normalizedContent.includes(normalizeSpamText(keyword)),
  );
}

function getRateLimitCacheKey(userId: string, table: RateLimitedTable) {
  return `${table}:${userId}`;
}

function isRateLimitedAt(timestamp: number) {
  return Date.now() - timestamp < RATE_LIMIT_SECONDS * 1000;
}

function reserveRateLimitSlot(userId: string, table: RateLimitedTable) {
  const cacheKey = getRateLimitCacheKey(userId, table);
  const now = Date.now();
  const existing = localRateLimitCache.get(cacheKey);

  if (existing !== undefined && isRateLimitedAt(existing)) {
    throw new Error(RATE_LIMIT_MESSAGE);
  }

  localRateLimitCache.set(cacheKey, now);

  let settled = false;

  return {
    commit() {
      settled = true;
    },
    rollback() {
      if (settled) return;
      const cached = localRateLimitCache.get(cacheKey);
      if (cached === now) {
        localRateLimitCache.delete(cacheKey);
      }
      settled = true;
    },
  };
}

async function getDiscussionPostLikeCount(postId: string, fallback: number) {
  const { data, error } = await getSupabaseClient()
    .from(FORUM_POSTS_PUBLIC_VIEW)
    .select("like_count")
    .eq("id", postId)
    .maybeSingle();

  if (error) return fallback;
  return (data as { like_count?: number | null } | null)?.like_count ?? fallback;
}

async function getDiscussionReplyLikeCount(replyId: string, fallback: number) {
  const { data, error } = await getSupabaseClient()
    .from(FORUM_PUBLIC_REPLIES_VIEW)
    .select("like_count")
    .eq("id", replyId)
    .maybeSingle();

  if (error) return fallback;
  return (data as { like_count?: number | null } | null)?.like_count ?? fallback;
}

async function ensureProfile(displayName = "噜噜") {
  assertConfigured();
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Please sign in first.");
  }

  // Read existing profile first — don't overwrite with defaults
  const { data: existing } = await supabase
    .from("forum_profiles")
    .select("display_name")
    .eq("id", userData.user.id)
    .maybeSingle();

  // Only upsert if profile doesn't exist yet
  if (!existing) {
    await supabase.from("forum_profiles").insert({
      id: userData.user.id,
      display_name: displayName,
    });
  }

  return userData.user.id;
}

export async function getUserPosts(userId: string): Promise<DiscussionPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from(FORUM_POSTS_PUBLIC_VIEW)
      .select("*")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;
    return ((data ?? []) as ForumPostRow[]).map(postFromRow);
  } catch {
    return [];
  }
}

/** Get posts that a user has liked */
export async function getUserLikedPosts(userId: string): Promise<DiscussionPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    // First get the liked post IDs
    const { data: likes, error: likesError } = await getSupabaseClient()
      .from("forum_likes")
      .select("post_id")
      .eq("user_id", userId)
      .not("post_id", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (likesError) throw likesError;
    const postIds = (likes ?? []).map((r: { post_id: string }) => r.post_id).filter(Boolean);
    if (postIds.length === 0) return [];

    // Then fetch the posts
    const { data, error } = await getSupabaseClient()
      .from(FORUM_POSTS_PUBLIC_VIEW)
      .select("*")
      .in("id", postIds);

    if (error) throw error;
    return ((data ?? []) as ForumPostRow[]).map(postFromRow);
  } catch {
    return [];
  }
}

/** Get user's recent replies with parent post info */
export async function getUserReplies(userId: string): Promise<{ reply: DiscussionReply; postTitle: string; postId: string }[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_replies")
      .select("id, body, created_at, post_id, author_id, forum_profiles(display_name)")
      .eq("author_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    const results: { reply: DiscussionReply; postTitle: string; postId: string }[] = [];
    for (const row of data ?? []) {
      const profile = (row as Record<string, unknown>).forum_profiles as { display_name?: string } | null;
      const postId = (row as Record<string, unknown>).post_id as string;

      // Get post title
      const { data: post } = await getSupabaseClient()
        .from("forum_posts")
        .select("title")
        .eq("id", postId)
        .single();

      results.push({
        reply: {
          id: String((row as Record<string, unknown>).id),
          body: String((row as Record<string, unknown>).body ?? ""),
          author: profile?.display_name ?? "噜噜",
          authorId: userId,
          avatar: "",
          postedAt: (row as Record<string, unknown>).created_at as string ?? null,
          likes: 0,
        },
        postTitle: (post as Record<string, unknown>)?.title as string ?? "未知帖子",
        postId,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function loadAllTags(): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from(FORUM_POSTS_PUBLIC_VIEW)
      .select("tags")
      .limit(100);

    if (error) throw error;
    const tagSet = new Set<string>();
    for (const row of data ?? []) {
      const tags = Array.isArray(row.tags) ? row.tags : [];
      for (const tag of tags) {
        if (tag) tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b, "zh-CN"));
  } catch {
    return [];
  }
}

export async function loadDiscussionPosts(): Promise<DiscussionPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from(FORUM_POSTS_PUBLIC_VIEW)
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return ((data ?? []) as ForumPostRow[]).map(postFromRow);
  } catch {
    return [];
  }
}

// ── Server-side search ───────────────────────────────

export type SearchOptions = {
  query?: string;
  tag?: string;
  sort?: "latest" | "mostReplies" | "mostLikes";
  limit?: number;
  cursor?: string | null; // ISO timestamp
  station?: string; // Station filter
};

export type SearchResult = {
  posts: DiscussionPost[];
  totalCount: number;
  nextCursor: string | null;
  hasMore: boolean;
};

/** Execute a server-side full-text search with cursor-based pagination. */
export async function searchDiscussionPosts(
  options: SearchOptions = {},
): Promise<SearchResult> {
  if (!isSupabaseConfigured()) {
    return { posts: [], totalCount: 0, nextCursor: null, hasMore: false };
  }

  const pageSize = options.limit ?? 20;

  try {
    // Try the RPC first (requires search-migration.sql to be run)
    const { data, error } = await getSupabaseClient()
      .rpc("search_forum_posts", {
        query: options.query ?? null,
        tag_filter: options.tag ?? null,
        sort_by: options.sort ?? "latest",
        page_size: pageSize,
        page_cursor: options.cursor ?? null,
        station_filter: options.station ?? null,
      });

    if (error) throw error;

    const rows = (data ?? []) as (ForumPostRow & { rank: number; total_count: number })[];
    const posts = rows.map((row) => postFromRow(row));
    const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
    const hasMore = rows.length === pageSize;
    const nextCursor = hasMore && rows.length > 0
      ? rows[rows.length - 1].created_at ?? null
      : null;

    return { posts, totalCount, nextCursor, hasMore };
  } catch {
    // Fallback: client-side filtering (for when migration hasn't been run yet)
    const allPosts = options.station
      ? (await loadStationDiscussionPosts(options.station, 100)).posts
      : await loadDiscussionPosts();

    let filtered = [...allPosts];

    if (options.query?.trim()) {
      const q = options.query.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.body.toLowerCase().includes(q) ||
          p.station?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (options.tag) {
      filtered = filtered.filter((p) => p.tags.includes(options.tag!));
    }

    if (options.sort === "mostReplies") {
      filtered.sort((a, b) => b.replyCount - a.replyCount);
    } else if (options.sort === "mostLikes") {
      filtered.sort((a, b) => b.likes - a.likes);
    }

    // Pinned always on top
    const pinned = filtered.filter((p) => p.is_pinned);
    const unpinned = filtered.filter((p) => !p.is_pinned);
    const sorted = [...pinned, ...unpinned];

    const totalCount = sorted.length;
    const sliced = sorted.slice(0, pageSize);
    const hasMore = sliced.length < totalCount;
    const nextCursor = hasMore && sliced.length > 0
      ? sliced[sliced.length - 1].createdAt
      : null;

    return { posts: sliced, totalCount, nextCursor, hasMore };
  }
}

// ── Cursor-based pagination ──────────────────────────

export type PaginatedPostsResult = {
  posts: DiscussionPost[];
  nextCursor: string | null;
  hasMore: boolean;
};

/** Load posts with cursor-based pagination (for "load more" / infinite scroll). */
export async function loadDiscussionPostsPaginated(
  limit: number = 20,
  cursor?: string | null,
): Promise<PaginatedPostsResult> {
  if (!isSupabaseConfigured()) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  try {
    let query = getSupabaseClient()
      .from(FORUM_POSTS_PUBLIC_VIEW)
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit + 1); // Fetch one extra to know if there are more

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as ForumPostRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && page.length > 0
      ? page[page.length - 1].created_at ?? null
      : null;

    return {
      posts: page.map(postFromRow),
      nextCursor,
      hasMore,
    };
  } catch {
    return { posts: [], nextCursor: null, hasMore: false };
  }
}

/** Load posts filtered by station name with cursor-based pagination. */
export async function loadStationDiscussionPosts(
  stationName: string,
  limit: number = 20,
  cursor?: string | null,
): Promise<PaginatedPostsResult> {
  if (!isSupabaseConfigured()) {
    return { posts: [], nextCursor: null, hasMore: false };
  }

  try {
    let query = getSupabaseClient()
      .from(FORUM_POSTS_PUBLIC_VIEW)
      .select("*")
      .eq("station", stationName)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data, error } = await query;

    if (error) throw error;

    const rows = (data ?? []) as ForumPostRow[];
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && page.length > 0
      ? page[page.length - 1].created_at ?? null
      : null;

    return {
      posts: page.map(postFromRow),
      nextCursor,
      hasMore,
    };
  } catch {
    return { posts: [], nextCursor: null, hasMore: false };
  }
}

export async function createDiscussionPost(
  input: CreateDiscussionPostInput,
): Promise<DiscussionPost> {
  const authorName = input.author?.trim() || "噜噜";
  const trimmedBody = normalizeRequiredText(input.body, "先写点内容再发帖。");
  const authorId = await ensureProfile(authorName);
  const rateLimitSlot = reserveRateLimitSlot(authorId, "forum_posts");

  try {
    await checkRateLimit(authorId, "forum_posts", { skipLocalCache: true });

    const isSpam = await checkSpam(trimmedBody);
    if (isSpam) {
      throw new Error("内容包含违规关键词，请修改后重试。");
    }

    const station = input.station?.trim() ?? "";
    const normalizedTags = normalizeTags(input.tags);
    const titleSource = station || trimmedBody;
    const title = titleSource.length > 80 ? titleSource.slice(0, 80) : titleSource;

    const { data, error } = await getSupabaseClient()
      .from("forum_posts")
      .insert({
        author_id: authorId,
        title: title || "新讨论",
        body: trimmedBody,
        station,
        tags: normalizedTags,
        is_hidden: false,
      })
      .select("id, body, station, tags, created_at")
      .single();

    if (error) throw error;
    rateLimitSlot.commit();

    return postFromRow({
      ...(data as ForumPostRow),
      author_display_name: authorName,
      reply_count: 0,
      like_count: 0,
    });
  } catch (error) {
    rateLimitSlot.rollback();
    throw error;
  }
}

export async function loadComments(postId: string): Promise<DiscussionReply[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from(FORUM_PUBLIC_REPLIES_VIEW)
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return ((data ?? []) as ForumReplyRow[]).map(replyFromRow);
  } catch {
    return [];
  }
}

export async function replyDiscussionPost(
  postId: string,
  body: string,
): Promise<DiscussionReply> {
  const trimmedBody = normalizeRequiredText(body, "先写一点回复内容。");
  const authorId = await ensureProfile();
  const rateLimitSlot = reserveRateLimitSlot(authorId, "forum_replies");

  try {
    await checkRateLimit(authorId, "forum_replies", { skipLocalCache: true });

    const isSpam = await checkSpam(trimmedBody);
    if (isSpam) {
      throw new Error("内容包含违规关键词，请修改后重试。");
    }

    const { data, error } = await getSupabaseClient()
      .from("forum_replies")
      .insert({
        post_id: postId,
        author_id: authorId,
        body: trimmedBody,
      })
      .select("id, post_id, body, created_at")
      .single();

    if (error) throw error;

    const { data: profile } = await getSupabaseClient()
      .from("forum_profiles")
      .select("display_name, avatar_url")
      .eq("id", authorId)
      .maybeSingle();

    rateLimitSlot.commit();

    return replyFromRow({
      ...(data as ForumReplyRow),
      author_display_name: profile?.display_name || "噜噜",
      author_avatar_url: profile?.avatar_url || "",
    });
  } catch (error) {
    rateLimitSlot.rollback();
    throw error;
  }
}

export async function likeDiscussionPost(
  postId: string,
  currentLikes: number,
): Promise<number> {
  const authorId = await ensureProfile();
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("forum_likes").insert({
    post_id: postId,
    user_id: authorId,
  });

  if (error) {
    if (error.code === "23505") {
      return getDiscussionPostLikeCount(postId, currentLikes);
    }
    throw error;
  }

  return getDiscussionPostLikeCount(postId, currentLikes + 1);
}

export async function likeReply(replyId: string): Promise<{ liked: boolean; count: number }> {
  const authorId = await ensureProfile();
  const supabase = getSupabaseClient();

  // Check if already liked
  const { data: existing } = await supabase
    .from("forum_likes")
    .select("id")
    .eq("reply_id", replyId)
    .eq("user_id", authorId)
    .maybeSingle();

  if (existing) {
    // Unlike: delete the existing like
    await supabase
      .from("forum_likes")
      .delete()
      .eq("reply_id", replyId)
      .eq("user_id", authorId);

    const count = await getDiscussionReplyLikeCount(replyId, 0);
    return { liked: false, count };
  }

  // Like: insert new like
  const { error } = await supabase.from("forum_likes").insert({
    reply_id: replyId,
    user_id: authorId,
  });

  if (error) {
    if (error.code === "23505") {
      // Duplicate - already liked
      const count = await getDiscussionReplyLikeCount(replyId, 0);
      return { liked: true, count };
    }
    throw error;
  }

  const count = await getDiscussionReplyLikeCount(replyId, 1);
  return { liked: true, count };
}

export async function loadPendingDiscussionPosts(): Promise<DiscussionPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_posts")
      .select("id, body, station, tags, created_at, forum_profiles(display_name)")
      .eq("is_hidden", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => {
      const profile = row.forum_profiles as { display_name?: string } | null;
      return postFromRow({
        id: String(row.id),
        body: String(row.body ?? ""),
        station: typeof row.station === "string" ? row.station : "",
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        created_at: typeof row.created_at === "string" ? row.created_at : null,
        author_display_name: profile?.display_name ?? "噜噜",
        reply_count: 0,
        like_count: 0,
      });
    });
  } catch {
    return [];
  }
}

export async function approveDiscussionPost(postId: string): Promise<void> {
  assertConfigured();
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ is_hidden: false })
    .eq("id", postId);

  if (error) throw error;
}

export async function rejectDiscussionPost(postId: string): Promise<void> {
  assertConfigured();
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .delete()
    .eq("id", postId);

  if (error) throw error;
}

export async function uploadForumImage(file: File): Promise<string> {
  assertConfigured();
  const ext = validateForumImageUpload(file);
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录。");

  const fileName = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("forum-images")
    .upload(fileName, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(fileName);
  return normalizeOptionalImageUrl(urlData.publicUrl, "图片链接");
}

export async function uploadAvatar(file: File): Promise<string> {
  assertConfigured();
  const ext = validateForumImageUpload(file);
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录。");

  const fileName = `${userData.user.id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("forum-avatars")
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from("forum-avatars").getPublicUrl(fileName);
  return normalizeOptionalImageUrl(urlData.publicUrl, "头像链接");
}

export async function updateProfileAvatar(avatarUrl: string): Promise<void> {
  assertConfigured();
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录。");
  const normalizedAvatarUrl = normalizeOptionalImageUrl(avatarUrl, "头像链接");

  const { error } = await supabase
    .from("forum_profiles")
    .upsert({ id: userData.user.id, avatar_url: normalizedAvatarUrl }, { onConflict: "id" });

  if (error) throw error;
}

export type UserProfile = {
  display_name: string;
  avatar_url: string;
  bio: string;
  tags: string[];
};

/** Update the current user's profile bio and/or custom tags. */
export async function updateUserProfile(
  userId: string,
  data: { bio?: string; tags?: string[] },
): Promise<void> {
  assertConfigured();
  const supabase = getSupabaseClient();

  const updates: Record<string, unknown> = {};

  if (data.bio !== undefined) {
    const trimmed = data.bio.trim();
    if (trimmed.length > 500) {
      throw new Error("个人简介不能超过 500 个字符。");
    }
    updates.bio = trimmed;
  }

  if (data.tags !== undefined) {
    const normalized = normalizeProfileTags(data.tags);
    updates.tags = normalized;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from("forum_profiles")
    .update(updates)
    .eq("id", userId);

  if (error) throw error;
}

/** Get a user's full profile (display_name, avatar_url, bio, tags). */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_profiles")
      .select("display_name, avatar_url, bio, tags")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
      display_name: (data as Record<string, unknown>).display_name as string ?? "噜噜",
      avatar_url: (data as Record<string, unknown>).avatar_url as string ?? "",
      bio: (data as Record<string, unknown>).bio as string ?? "",
      tags: Array.isArray((data as Record<string, unknown>).tags)
        ? ((data as Record<string, unknown>).tags as string[])
        : [],
    };
  } catch {
    return null;
  }
}

function normalizeProfileTags(tags?: string[]) {
  if (!Array.isArray(tags)) return [];

  const uniqueTags = new Set<string>();
  for (const tag of tags) {
    const trimmed = normalizeSingleLineText(tag);
    if (trimmed) {
      uniqueTags.add(trimmed.slice(0, 20));
    }
    if (uniqueTags.size >= 5) break;
  }

  return Array.from(uniqueTags);
}

function validateForumImageUpload(file: File) {
  if (file.size <= 0) {
    throw new Error("图片文件不能为空。");
  }

  if (file.size > MAX_FORUM_IMAGE_BYTES) {
    throw new Error("图片不能超过 5MB。");
  }

  const normalizedType = file.type.toLowerCase();
  const extension = ALLOWED_FORUM_IMAGE_TYPES[normalizedType as keyof typeof ALLOWED_FORUM_IMAGE_TYPES];
  if (!extension) {
    throw new Error("仅支持 JPG、PNG、WebP、GIF 或 AVIF 图片。");
  }

  return extension;
}

export async function updatePostBody(
  postId: string,
  newBody: string,
): Promise<void> {
  assertConfigured();
  const trimmedBody = normalizeRequiredText(newBody, "内容不能为空。");
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ body: trimmedBody })
    .eq("id", postId);

  if (error) throw error;
}

export async function updateAndApprovePost(
  postId: string,
  newBody: string,
): Promise<void> {
  assertConfigured();
  const trimmedBody = normalizeRequiredText(newBody, "内容不能为空。");
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ body: trimmedBody, is_hidden: false })
    .eq("id", postId);

  if (error) throw error;
}

export async function deleteDiscussionPost(postId: string): Promise<void> {
  assertConfigured();
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ is_hidden: true })
    .eq("id", postId);

  if (error) throw error;
}

export async function pinDiscussionPost(
  postId: string,
  isPinned: boolean,
): Promise<void> {
  assertConfigured();
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ is_pinned: isPinned })
    .eq("id", postId);

  if (error) throw error;
}

export type HotTopic = {
  id: string;
  title: string;
  station: string;
  tags: string[];
  author_name: string;
  reply_count: number;
  like_count: number;
  hot_score: number;
};

export async function getHotTopics(): Promise<HotTopic[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_hot_topics")
      .select("*")
      .limit(10);

    if (error) throw error;
    return (data ?? []) as HotTopic[];
  } catch {
    return [];
  }
}

export type ForumStats = {
  visible_posts: number;
  pending_posts: number;
  visible_replies: number;
  total_likes: number;
  active_authors: number;
};

export async function getForumStats(): Promise<ForumStats | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_stats")
      .select("*")
      .single();

    if (error) return null;
    return data as ForumStats;
  } catch {
    return null;
  }
}

export async function checkSpam(body: string): Promise<boolean> {
  assertConfigured();
  const trimmedBody = body.trim();
  if (!trimmedBody) return false;

  const fallbackResult = containsSpamKeyword(trimmedBody);
  const { data, error } = await getSupabaseClient()
    .rpc("check_spam_content", { content: trimmedBody });

  if (error) return fallbackResult;
  return Boolean(data) || fallbackResult;
}

const RATE_LIMIT_SECONDS = 60;
const RATE_LIMIT_MESSAGE = "请稍后再提交（每分钟限1条）";

export async function checkRateLimit(
  userId: string,
  table: RateLimitedTable,
  options?: { skipLocalCache?: boolean },
): Promise<void> {
  if (!options?.skipLocalCache) {
    const cached = localRateLimitCache.get(getRateLimitCacheKey(userId, table));
    if (cached !== undefined && isRateLimitedAt(cached)) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from(table)
    .select("created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return;

  const lastCreatedAt = data?.[0]?.created_at;
  if (lastCreatedAt) {
    const lastPostTime = new Date(lastCreatedAt).getTime();
    if (Number.isFinite(lastPostTime) && Date.now() - lastPostTime < RATE_LIMIT_SECONDS * 1000) {
      throw new Error(RATE_LIMIT_MESSAGE);
    }
  }
}
