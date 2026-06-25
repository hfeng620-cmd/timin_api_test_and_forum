"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "timin-notifications";

type NotificationType =
  | "你的帖子收到了新回复"
  | "你的回复被点赞了"
  | "管理员通过了你的帖子";

interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: number;
  postId?: string;
}

function createSeedNotifications(): NotificationItem[] {
  const now = Date.now();
  return [
    {
      id: "seed-1",
      type: "你的帖子收到了新回复",
      message: "有人在「OpenAI 最新模型价格对比」中回复了你",
      read: false,
      createdAt: now - 1000 * 60 * 15,
    },
    {
      id: "seed-2",
      type: "你的回复被点赞了",
      message: "你的回复在「中转站倍率讨论」中获得了 3 个赞",
      read: false,
      createdAt: now - 1000 * 60 * 60 * 4,
    },
    {
      id: "seed-3",
      type: "管理员通过了你的帖子",
      message: "你提交的「站点 A 实际倍率更新」已通过审核并收录到榜单",
      read: false,
      createdAt: now - 1000 * 60 * 60 * 20,
    },
    {
      id: "seed-4",
      type: "你的帖子收到了新回复",
      message: "有人在「Claude 模型使用体验」中回复了你",
      read: true,
      createdAt: now - 1000 * 60 * 60 * 48,
    },
  ];
}

function loadNotifications(): NotificationItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  const seed = createSeedNotifications();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function saveNotifications(notifications: NotificationItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

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

export function NotificationBell({
  dropdownAbove: _dropdownAbove,
}: {
  dropdownAbove?: boolean;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setNotifications(loadNotifications());
    setMounted(true);
  }, []);

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

  function markAsRead(id: string) {
    setNotifications((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      saveNotifications(next);
      return next;
    });
  }

  function markAllRead() {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      saveNotifications(next);
      return next;
    });
  }

  function handleNotificationClick(item: NotificationItem) {
    markAsRead(item.id);
    // Navigate to community to view the post
    if (item.type === "你的帖子收到了新回复" || item.type === "你的回复被点赞了") {
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
      {open && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-sm">
          {/* Card */}
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
              {notifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-4xl">🔔</p>
                  <p className="mt-3 text-sm font-semibold text-[var(--color-muted)]">暂无通知</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">当有人回复你的帖子或点赞时，你会在这里看到</p>
                </div>
              ) : (
                notifications
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((item) => (
                    <button
                      key={item.id}
                      className={`flex w-full items-start gap-4 border-b border-[var(--color-line)] px-6 py-4 text-left transition last:border-b-0 hover:bg-[var(--color-soft)] ${
                        !item.read ? "bg-[var(--color-brand-soft)]/20" : ""
                      }`}
                      onClick={() => handleNotificationClick(item)}
                      type="button"
                    >
                      {/* Icon */}
                      <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                        item.type === "你的帖子收到了新回复" ? "bg-[var(--color-brand-soft)] text-[var(--color-brand)]" :
                        item.type === "你的回复被点赞了" ? "bg-[#fef3c7] text-[#d97706]" :
                        "bg-[#ecfdf5] text-[#059669]"
                      }`}>
                        {item.type === "你的帖子收到了新回复" ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        ) : item.type === "你的回复被点赞了" ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[var(--color-brand-deep)]">{item.type}</p>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">{item.message}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[11px] text-[var(--color-muted)]">{formatRelativeTime(item.createdAt)}</span>
                          {!item.read && <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand)]" />}
                          {(item.type === "你的帖子收到了新回复" || item.type === "你的回复被点赞了") && (
                            <span className="ml-auto text-[11px] font-semibold text-[var(--color-brand)]">查看帖子 →</span>
                          )}
                        </div>
                      </div>
                    </button>
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
        </div>
      )}
    </div>
  );
}
