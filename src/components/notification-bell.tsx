"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import { useForumAuth } from "@/lib/forum-auth";
import {
  deleteNotification,
  getTypeLabel,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotifications,
  type NotificationItem,
} from "@/lib/notification-storage";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getTypeIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "new_reply":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
    case "new_like":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
      );
    case "post_approved":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "admin_announcement":
      return (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      );
    default:
      return null;
  }
}

function getTypeBgClass(type: NotificationItem["type"]) {
  switch (type) {
    case "new_reply":
      return "bg-[var(--color-brand-soft)] text-[var(--color-brand)]";
    case "new_like":
      return "bg-[#fef3c7] text-[#d97706]";
    case "post_approved":
      return "bg-[#ecfdf5] text-[#059669]";
    case "admin_announcement":
      return "bg-[#fce7f3] text-[#db2777]";
    default:
      return "bg-[var(--color-soft)] text-[var(--color-muted)]";
  }
}

export function NotificationBell({
  dropdownAbove: _dropdownAbove,
}: {
  dropdownAbove?: boolean;
}) {
  const { isConnected, user } = useForumAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const unsubRef = useRef<(() => void) | null>(null);

  // Load notifications from Supabase on mount & user change
  useEffect(() => {
    setMounted(true);
    if (!isConnected || !user) {
      setNotifications([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    loadNotifications()
      .then((data) => {
        if (cancelled) return;
        setNotifications(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, user?.id]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!isConnected || !user) return;

    // Tear down previous channel first
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    // Delay subscription to avoid race condition with auth state
    const timer = setTimeout(() => {
      unsubRef.current = subscribeNotifications(user.id, (newNotification) => {
        setNotifications((prev) => [newNotification, ...prev.slice(0, 49)]);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [isConnected, user?.id]);

  // Escape key to close
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    await markNotificationRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await markAllNotificationsRead().catch(() => {});
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotification(id).catch(() => {});
  }, []);

  function handleNotificationClick(item: NotificationItem) {
    markAsRead(item.id);
    if (item.type === "new_reply" || item.type === "new_like" || item.type === "post_approved") {
      setOpen(false);
      router.push("/community");
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)]" />
      </div>
    );
  }

  return (
    <div className="relative" data-selection-comments="off">
      {/* Bell button */}
      <button
        aria-label={`通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
        onClick={() => setOpen(true)}
        type="button"
      >
        <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] font-black leading-none text-[var(--color-on-brand)] ring-2 ring-[var(--color-panel)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Full-screen overlay modal */}
      {open && createPortal(
        <div className="fixed inset-0 z-[200] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm">
          <div
            className="surface-in w-full max-w-lg overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
              <div className="flex items-center gap-2">
                <svg aria-hidden="true" className="h-5 w-5 text-[var(--color-brand-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <h2 className="text-lg font-bold text-[var(--color-ink)]">通知中心</h2>
                {unreadCount > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand)] px-1.5 text-[10px] font-black text-[var(--color-on-brand)]">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button className="text-xs font-semibold text-[var(--color-brand-deep)] transition hover:underline" onClick={markAllRead} type="button">
                    全部已读
                  </button>
                )}
                <button
                  aria-label="关闭通知"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)] text-sm text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-[60vh] overflow-y-auto">
              {!isConnected ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-4xl">🔔</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">登录后可查看通知</p>
                </div>
              ) : loading ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-sm text-[var(--color-muted)]">加载中...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-4xl">🔔</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">暂无通知</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">当有人回复你的帖子或点赞时，你会在这里看到实时通知</p>
                </div>
              ) : (
                notifications
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((item) => (
                    <div
                      key={item.id}
                      className={`flex w-full items-start gap-4 border-b border-[var(--color-line)] px-6 py-4 transition last:border-b-0 hover:bg-[var(--color-soft)] ${
                        !item.read ? "bg-[var(--color-brand-soft)]/20" : ""
                      }`}
                    >
                      <button
                        className="flex flex-1 items-start gap-4 text-left"
                        onClick={() => handleNotificationClick(item)}
                        type="button"
                      >
                        {/* Icon */}
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${getTypeBgClass(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-[var(--color-brand-deep)]">{getTypeLabel(item.type)}</p>
                          <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">{item.message}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-[11px] text-[var(--color-muted)]">{formatRelativeTime(item.createdAt)}</span>
                            {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />}
                            {(item.type === "new_reply" || item.type === "new_like" || item.type === "post_approved") && (
                              <span className="ml-auto text-[11px] font-semibold text-[var(--color-brand)]">查看帖子 →</span>
                            )}
                          </div>
                        </div>
                      </button>
                      {/* Delete button */}
                      <button
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        title="删除通知"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Backdrop click to close */}
          <div
            aria-hidden="true"
            className="fixed inset-0 -z-10"
            onClick={() => setOpen(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
}
