"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type UserProfileRow = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tags: string[] | null;
  personality_tags: string[] | null;
  created_at: string | null;
};

type UserProfile = {
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  tags: string[];
  created_at: string | null;
};

type UserProfileCardProps = {
  userId: string;
  position: { x: number; y: number };
  onClose: () => void;
};

function normalizeProfile(row: UserProfileRow): UserProfile {
  const rawTags =
    Array.isArray(row.tags) && row.tags.length > 0
      ? row.tags
      : Array.isArray(row.personality_tags)
        ? row.personality_tags
        : [];

  return {
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    tags: rawTags
      .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.trim())
      .slice(0, 5),
    created_at: row.created_at,
  };
}

function formatJoinDate(value: string | null) {
  if (!value) return "加入时间未知";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "加入时间未知";
  }
}

export function UserProfileCard({ userId, position, onClose }: UserProfileCardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardPosition, setCardPosition] = useState(position);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Smooth entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // Smooth exit animation
  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await getSupabaseClient()
          .from("forum_profiles")
          .select("display_name, avatar_url, bio, tags, personality_tags, created_at")
          .eq("id", userId)
          .single();
        if (!cancelled && data) {
          setProfile(normalizeProfile(data as UserProfileRow));
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const width = 320;
    const height = 420;
    const padding = 12;
    const nextLeft = Math.min(
      Math.max(padding, position.x),
      Math.max(padding, window.innerWidth - width - padding),
    );
    const nextTop = Math.min(
      Math.max(padding, position.y),
      Math.max(padding, window.innerHeight - height - padding),
    );

    setCardPosition({ x: nextLeft, y: nextTop });
  }, [position]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const name = profile?.display_name || "用户";
  const initial = name.charAt(0).toUpperCase();
  const bio = profile?.bio?.trim() || "这个人很懒，什么都没写...";
  const tags = profile?.tags ?? [];
  const profileCompleteness = [
    Boolean(profile?.display_name?.trim()),
    Boolean(profile?.avatar_url),
    Boolean(profile?.bio?.trim()),
    tags.length > 0,
  ].filter(Boolean).length;
  const completenessPercent = Math.round((profileCompleteness / 4) * 100);
  const completenessLabel =
    completenessPercent >= 100 ? "主页已完成" : completenessPercent >= 50 ? "资料逐步成形" : "还在补充中";
  const joinDate = formatJoinDate(profile?.created_at ?? null);

  return (
    <div
      ref={cardRef}
      className="z-50 w-[320px] max-w-[calc(100vw-24px)] overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
      style={{
        position: "fixed",
        left: cardPosition.x,
        top: cardPosition.y,
        transform: isAnimating ? "scale(1) translateY(0)" : "scale(0.95) translateY(-8px)",
        opacity: isAnimating ? 1 : 0,
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        transformOrigin: "top left",
      }}
    >
      {loading ? (
        <div className="p-5">
          <div className="h-24 animate-pulse rounded-[20px] bg-[var(--color-soft)]" />
          <div className="mt-4 flex items-center gap-3">
            <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--color-soft)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-[var(--color-soft)]" />
              <div className="h-3 w-32 animate-pulse rounded bg-[var(--color-soft)]" />
            </div>
          </div>
          <div className="mt-4 h-16 animate-pulse rounded-[18px] bg-[var(--color-soft)]" />
          <div className="mt-3 flex gap-2">
            <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-soft)]" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-[var(--color-soft)]" />
          </div>
        </div>
      ) : (
        <>
          <div className="relative overflow-hidden border-b border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(37,99,235,0.1),rgba(255,255,255,0.94)_55%,rgba(191,219,254,0.32))] px-5 pb-5 pt-4">
            <button
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/72 text-xs text-[var(--color-muted)] transition hover:bg-white hover:text-[var(--color-ink)]"
              onClick={handleClose}
              type="button"
              aria-label="关闭"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
              Profile Snapshot
            </p>

            <div className="mt-4 flex items-start gap-4">
              {profile?.avatar_url ? (
                <img
                  alt={name}
                  className="h-16 w-16 shrink-0 rounded-[22px] object-cover ring-1 ring-[var(--color-line)]"
                  src={profile.avatar_url}
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[var(--color-soft)] text-2xl font-black text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
                  {initial}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-lg font-black text-[var(--color-ink)]">{name}</p>
                  <span className="rounded-full bg-[var(--color-brand)]/10 px-2.5 py-1 text-[10px] font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/15">
                    Timix 观察成员
                  </span>
                </div>
                <p className="mt-2 text-xs text-[var(--color-muted)]">{joinDate}</p>
                <p className="mt-1 text-xs font-medium text-[var(--color-brand-deep)]">{completenessLabel}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  资料完成度
                </p>
                <p className="mt-2 text-xl font-black text-[var(--color-ink)]">{completenessPercent}%</p>
              </div>
              <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  个人标签
                </p>
                <p className="mt-2 text-xl font-black text-[var(--color-ink)]">{tags.length}</p>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                个人简介
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{bio}</p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                标签侧写
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-[11px] font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/15"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-dashed border-[var(--color-line)] px-3 py-1 text-[11px] font-semibold text-[var(--color-muted)]">
                    还没有填写个人标签
                  </span>
                )}
              </div>
            </div>

            <a
              className="block w-full rounded-full bg-[var(--color-brand)] py-2.5 text-center text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
              href="/profile"
            >
              查看我的主页
            </a>
          </div>
        </>
      )}
    </div>
  );
}
