"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getSupabaseClient } from "@/lib/supabase";
import { useForumAuth } from "@/lib/forum-auth";

const AVATAR_COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16"];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AuthButton() {
  const { isConnected, isAdmin, isOwner, displayName, email, needsPassword, signOut, showAuthModal, user } = useForumAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !user) return;
    getSupabaseClient()
      .from("forum_profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); })
      .catch(() => {});
  }, [isConnected, user]);

  if (isConnected) {
    const label = displayName || email?.split("@")[0] || "我";
    const initial = label.charAt(0).toUpperCase();
    const bgColor = getAvatarColor(label);

    return (
      <div className="flex items-center gap-2">
        {needsPassword ? (
          <button
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-brand)] text-xs font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
            onClick={showAuthModal}
            title="设置密码和昵称"
            type="button"
          >
            !
          </button>
        ) : null}
        <Link
          className="flex min-h-11 min-w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--color-line)] transition hover:border-[var(--color-brand)] hover:shadow-[0_0_12px_var(--color-panel-glow)]"
          href="/profile"
          title={email ?? undefined}
        >
          {avatarUrl ? (
            <img alt={label} className="h-full w-full object-cover" src={avatarUrl} />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: bgColor }}>
              {initial}
            </span>
          )}
        </Link>
        {isOwner ? (
          <span className="rounded-full bg-[#fef9e7] px-2 py-0.5 text-[10px] font-bold text-[#b8860b] ring-1 ring-[#daa520]/40" title="站主">
            站主
          </span>
        ) : isAdmin ? (
          <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309] ring-1 ring-[#f59e0b]/30" title="管理员">
            管理员
          </span>
        ) : null}
        <button
          aria-label="退出登录"
          className="hidden min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-xs font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)] sm:flex"
          onClick={() => signOut()}
          title="退出登录"
          type="button"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <button
      aria-label="登录"
      className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--color-brand)] text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] shadow-[0_8px_20px_var(--color-panel-glow)] btn-press"
      onClick={showAuthModal}
      title="登录"
      type="button"
    >
      <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    </button>
  );
}
