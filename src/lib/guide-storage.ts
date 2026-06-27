"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

export type GuideCategory = "入门指南" | "使用技巧" | "避坑经验" | "模型对比" | "其他";

export type UserGuide = {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  summary: string;
  body: string;
  category: GuideCategory;
  tags: string[];
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type CreateGuideInput = {
  title: string;
  summary: string;
  body: string;
  category: GuideCategory;
  tags?: string[];
};

const CATEGORIES: GuideCategory[] = ["入门指南", "使用技巧", "避坑经验", "模型对比", "其他"];

/**
 * Load approved guides for public display.
 */
export async function loadApprovedGuides(limit: number = 50): Promise<UserGuide[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("user_guides")
      .select(`
        id, author_id, title, summary, body, category, tags, created_at,
        forum_profiles!inner(display_name)
      `)
      .eq("status", "approved")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => {
      const profile = row.forum_profiles as { display_name?: string } | null;
      return {
        id: row.id as string,
        authorId: row.author_id as string,
        authorName: profile?.display_name ?? "匿名用户",
        title: row.title as string,
        summary: row.summary as string,
        body: row.body as string,
        category: (row.category as GuideCategory) ?? "其他",
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        status: "approved",
        createdAt: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Load pending guides for admin review.
 */
export async function loadPendingGuides(): Promise<UserGuide[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await getSupabaseClient()
      .from("user_guides")
      .select(`
        id, author_id, title, summary, body, category, tags, created_at,
        forum_profiles!inner(display_name)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return (data ?? []).map((row: Record<string, unknown>) => {
      const profile = row.forum_profiles as { display_name?: string } | null;
      return {
        id: row.id as string,
        authorId: row.author_id as string,
        authorName: profile?.display_name ?? "匿名用户",
        title: row.title as string,
        summary: row.summary as string,
        body: row.body as string,
        category: (row.category as GuideCategory) ?? "其他",
        tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
        status: "pending",
        createdAt: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Submit a new guide for review.
 */
export async function submitGuide(input: CreateGuideInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase 未配置。");
  }

  const { data: userData } = await getSupabaseClient().auth.getUser();
  if (!userData.user) {
    throw new Error("请先登录后再投稿。");
  }

  const { error } = await getSupabaseClient()
    .from("user_guides")
    .insert({
      author_id: userData.user.id,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: input.body.trim(),
      category: input.category,
      tags: input.tags ?? [],
      status: "approved",
    });

  if (error) {
    throw new Error(`投稿失败: ${error.message}`);
  }
}

/**
 * Approve a pending guide.
 */
export async function approveGuide(guideId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("user_guides")
    .update({
      status: "approved",
      reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", guideId);

  if (error) throw new Error(`审核失败: ${error.message}`);
}

/**
 * Reject a pending guide.
 */
export async function rejectGuide(guideId: string, note: string = ""): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("user_guides")
    .update({
      status: "rejected",
      admin_note: note,
      reviewed_by: userData?.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", guideId);

  if (error) throw new Error(`拒绝失败: ${error.message}`);
}

export { CATEGORIES };
