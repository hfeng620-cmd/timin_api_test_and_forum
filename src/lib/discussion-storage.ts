"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type DiscussionPost = {
  issueNumber: string;
  author: string;
  authorId?: string;
  authorAvatarUrl?: string;
  handle: string;
  postedAt: string;
  body: string;
  tags: string[];
  station?: string;
  likes: number;
  replyCount: number;
};

export type DiscussionReply = {
  id: string;
  author: string;
  authorId?: string;
  avatar: string;
  postedAt: string;
  body: string;
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
  created_at?: string | null;
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
};

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
    author: row.author_display_name || "群友补充",
    authorId: row.author_id || undefined,
    authorAvatarUrl: row.author_avatar_url || undefined,
    handle: "@forum",
    postedAt: formatDate(row.posted_at ?? row.created_at),
    body: row.body,
    station: row.station || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    likes: Number(row.like_count ?? row.likes ?? 0),
    replyCount: Number(row.reply_count ?? 0),
  };
}

function replyFromRow(row: ForumReplyRow): DiscussionReply {
  return {
    id: row.id,
    author: row.author_display_name || "群友补充",
    authorId: row.author_id || undefined,
    avatar: row.author_avatar_url || "",
    postedAt: formatDate(row.created_at),
    body: row.body,
  };
}

async function ensureProfile(displayName = "群友补充") {
  assertConfigured();
  const supabase = getSupabaseClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error("Please sign in first.");
  }

  const { error } = await supabase.from("forum_profiles").upsert(
    {
      id: userData.user.id,
      display_name: displayName,
    },
    { onConflict: "id" },
  );

  if (error) throw error;
  return userData.user.id;
}

export async function loadDiscussionPosts(): Promise<DiscussionPost[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_posts_public")
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

export async function createDiscussionPost(
  input: CreateDiscussionPostInput,
): Promise<DiscussionPost> {
  const authorId = await ensureProfile(input.author || "群友补充");
  const station = input.station?.trim() ?? "";
  const titleSource = station || input.body.trim();
  const title = titleSource.length > 80 ? titleSource.slice(0, 80) : titleSource;

  const { data, error } = await getSupabaseClient()
    .from("forum_posts")
    .insert({
      author_id: authorId,
      title: title || "新讨论",
      body: input.body.trim(),
      station,
      tags: input.tags ?? [],
      is_hidden: false,
    })
    .select("id, body, station, tags, created_at")
    .single();

  if (error) throw error;

  return postFromRow({
    ...(data as ForumPostRow),
    author_display_name: input.author || "群友补充",
    reply_count: 0,
    like_count: 0,
  });
}

export async function loadComments(postId: string): Promise<DiscussionReply[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await getSupabaseClient()
      .from("forum_public_replies")
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
  const authorId = await ensureProfile();
  const { data, error } = await getSupabaseClient()
    .from("forum_replies")
    .insert({
      post_id: postId,
      author_id: authorId,
      body: body.trim(),
    })
    .select("id, post_id, body, created_at")
    .single();

  if (error) throw error;
  return replyFromRow({
    ...(data as ForumReplyRow),
    author_display_name: "群友补充",
  });
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
    if (error.code === "23505") return currentLikes;
    throw error;
  }

  return currentLikes + 1;
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
        author_display_name: profile?.display_name ?? "群友补充",
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
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录。");

  const ext = file.name.split(".").pop() ?? "png";
  const fileName = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from("forum-images")
    .upload(fileName, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(fileName);
  return urlData.publicUrl;
}

export async function uploadAvatar(file: File): Promise<string> {
  assertConfigured();
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录。");

  const ext = file.name.split(".").pop() ?? "png";
  const fileName = `${userData.user.id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from("forum-avatars")
    .upload(fileName, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data: urlData } = supabase.storage.from("forum-avatars").getPublicUrl(fileName);
  return urlData.publicUrl;
}

export async function updateProfileAvatar(avatarUrl: string): Promise<void> {
  assertConfigured();
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("请先登录。");

  const { error } = await supabase
    .from("forum_profiles")
    .upsert({ id: userData.user.id, avatar_url: avatarUrl }, { onConflict: "id" });

  if (error) throw error;
}

export async function updatePostBody(
  postId: string,
  newBody: string,
): Promise<void> {
  assertConfigured();
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ body: newBody.trim() })
    .eq("id", postId);

  if (error) throw error;
}

export async function updateAndApprovePost(
  postId: string,
  newBody: string,
): Promise<void> {
  assertConfigured();
  const { error } = await getSupabaseClient()
    .from("forum_posts")
    .update({ body: newBody.trim(), is_hidden: false })
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
  const { data, error } = await getSupabaseClient()
    .rpc("check_spam_content", { content: body });

  if (error) return false;
  return Boolean(data);
}
