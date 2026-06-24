"use client";

import { useForumAuth } from "@/lib/forum-auth";

export function AuthButton() {
  const { isConnected, displayName, email, needsPassword, signOut, showAuthModal } = useForumAuth();

  if (isConnected) {
    const label = displayName || email?.split("@")[0] || "我";
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
        ) : (
          <button
            className="flex min-h-11 min-w-[3rem] items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 text-xs font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-soft)]"
            onClick={showAuthModal}
            title={email ?? undefined}
            type="button"
          >
            {label.slice(0, 4)}
          </button>
        )}
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
