"use client";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────

export type NotificationType =
  | "new_reply"
  | "new_like"
  | "post_approved"
  | "admin_announcement";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: number;
  postId?: string;
  replyId?: string;
}

// ── Display-friendly type labels ──────────────────────

const TYPE_LABELS: Record<NotificationType, string> = {
  new_reply: "新回复",
  new_like: "新点赞",
  post_approved: "审核通过",
  admin_announcement: "管理员公告",
};

export function getTypeLabel(type: NotificationType): string {
  return TYPE_LABELS[type] || type;
}

// ── Mapping ───────────────────────────────────────────

type SupabaseNotificationRow = {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  post_id: string | null;
  reply_id: string | null;
  read: boolean;
  created_at: string;
};

function mapNotification(row: SupabaseNotificationRow): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    message: row.message,
    read: row.read,
    createdAt: new Date(row.created_at).getTime(),
    postId: row.post_id ?? undefined,
    replyId: row.reply_id ?? undefined,
  };
}

// ── Load & mutate ─────────────────────────────────────

/** Load recent notifications for the current user from Supabase. */
export async function loadNotifications(): Promise<NotificationItem[]> {
  if (!isSupabaseConfigured()) return [];

  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userData.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;
    return ((data ?? []) as SupabaseNotificationRow[]).map(mapNotification);
  } catch {
    return [];
  }
}

/** Mark a single notification as read. */
export async function markNotificationRead(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await getSupabaseClient()
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
}

/** Mark all notifications as read for the current user. */
export async function markAllNotificationsRead(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userData.user.id)
    .eq("read", false);
}

/** Delete a notification. */
export async function deleteNotification(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await getSupabaseClient()
    .from("notifications")
    .delete()
    .eq("id", id);
}

// ── Realtime subscription ─────────────────────────────

// Module-level channel tracking to prevent duplicate subscriptions
let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;

/**
 * Subscribe to real-time notification inserts for the given user.
 * Returns an unsubscribe function.
 */
export function subscribeNotifications(
  userId: string,
  onNewNotification: (notification: NotificationItem) => void,
): () => void {
  if (!isSupabaseConfigured()) {
    return () => {};
  }

  const supabase = getSupabaseClient();

  // If there's an active channel for a different user or same user, remove it first
  if (activeChannel) {
    supabase.removeChannel(activeChannel);
    activeChannel = null;
    activeUserId = null;
  }

  const channelName = `notifications:${userId}`;
  activeUserId = userId;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as SupabaseNotificationRow;
        if (row) {
          onNewNotification(mapNotification(row));
        }
      },
    )
    .subscribe();

  activeChannel = channel;

  return () => {
    if (activeChannel === channel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
      activeUserId = null;
    }
  };
}
