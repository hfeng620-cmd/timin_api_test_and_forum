"use client";

import { useEffect, useRef, useState } from "react";

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
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // corrupted data, reseed below
  }
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

function getTypeLabel(type: NotificationType): string {
  return type;
}

export function NotificationBell({
  dropdownAbove = false,
}: {
  dropdownAbove?: boolean;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load on mount
  useEffect(() => {
    setNotifications(loadNotifications());
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

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

  if (!mounted) {
    // Render a static placeholder to avoid layout shift
    return (
      <div className="flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)]" />
      </div>
    );
  }

  return (
    <div className="relative" data-selection-comments="off" ref={wrapperRef}>
      <button
        aria-label={`通知${unreadCount > 0 ? `，${unreadCount} 条未读` : ""}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        {/* Bell SVG icon */}
        <svg
          aria-hidden="true"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Badge */}
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[10px] font-black leading-none text-[var(--color-on-brand)] ring-2 ring-[var(--color-panel)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute right-0 z-50 w-[320px] overflow-hidden rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_20px_60px_rgba(15,23,42,0.15)] backdrop-blur ${
            dropdownAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
            <p className="text-sm font-bold text-[var(--color-ink)]">
              通知
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-brand)] px-1.5 text-[10px] font-black text-[var(--color-on-brand)]">
                  {unreadCount}
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                className="text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                onClick={markAllRead}
                type="button"
              >
                全部已读
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                暂无通知
              </div>
            ) : (
              notifications
                .sort((a, b) => b.createdAt - a.createdAt)
                .map((item) => (
                  <button
                    key={item.id}
                    className={`flex w-full gap-3 border-b border-[var(--color-line)] px-4 py-3 text-left transition last:border-b-0 hover:bg-[var(--color-soft)] ${
                      !item.read ? "bg-[var(--color-brand-soft)]/30" : ""
                    }`}
                    onClick={() => markAsRead(item.id)}
                    type="button"
                  >
                    {/* Dot for unread */}
                    <div className="flex h-5 w-5 shrink-0 items-center justify-center pt-0.5">
                      {!item.read && (
                        <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-brand)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--color-brand-deep)]">
                        {getTypeLabel(item.type)}
                      </p>
                      <p className="mt-0.5 truncate text-sm leading-snug text-[var(--color-ink)]">
                        {item.message}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--color-muted)]">
                        {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </button>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
