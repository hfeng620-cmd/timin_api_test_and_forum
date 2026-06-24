"use client";

import { useState } from "react";

import { ForumAuthModal } from "@/components/forum-auth-modal";
import { useForumAuth } from "@/lib/forum-auth";

export function AuthButton() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { isConnected, email, signOut } = useForumAuth();

  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-[140px] truncate text-xs text-[var(--color-muted)] sm:inline">
          {email}
        </span>
        <button
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-2 text-xs font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
          onClick={() => signOut()}
          type="button"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] shadow-[0_8px_20px_var(--color-panel-glow)]"
        onClick={() => setAuthModalOpen(true)}
        type="button"
      >
        登录
      </button>
      <ForumAuthModal
        key={authModalOpen ? "open" : "closed"}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </>
  );
}
