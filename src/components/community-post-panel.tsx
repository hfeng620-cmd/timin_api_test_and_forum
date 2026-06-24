"use client";

import { useState } from "react";

import { ForumAuthModal } from "@/components/forum-auth-modal";
import { createDiscussionPost } from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";

type CommunityPostPanelProps = {
  onPostCreated?: () => void;
};

export function CommunityPostPanel({ onPostCreated }: CommunityPostPanelProps) {
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("发布后即显示在讨论区。");
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { isConnected, displayName } = useForumAuth();

  async function handleSubmit() {
    if (!isConnected) {
      setAuthModalOpen(true);
      return;
    }

    if (submitting) return;

    if (!body.trim()) {
      setStatus("先写一点正文，再发布。");
      return;
    }

    const tags = station
      .split(/[，,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      await createDiscussionPost({
        author: displayName || "群友补充",
        handle: "@forum",
        body: body.trim(),
        station: station.trim(),
        tags,
      });

      setBody("");
      setStation("");
      setOpen(false);
      setStatus("已发布。");
      onPostCreated?.();
    } catch {
      setStatus("发布失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  function handlePlaceholderClick() {
    if (!isConnected) {
      setAuthModalOpen(true);
      return;
    }
    setOpen(true);
  }

  return (
    <div
      className="rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-[0_16px_50px_rgba(13,25,48,0.06)] backdrop-blur sm:p-4"
      data-selection-comments="off"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3">
        <div>
          <h2 className="text-lg font-black tracking-tight">发帖子</h2>
          <p className="mt-1 text-xs text-[var(--color-muted)]">价格、稳定性、模型口径都可以先发这里。</p>
        </div>
        <a
          className="rounded-full border border-[var(--color-line)] px-3 py-2 text-xs font-bold text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
          href="https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions"
          rel="noreferrer"
          target="_blank"
        >
          GitHub Discussions
        </a>
      </div>

      {!open ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <button
            className="min-h-12 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-left text-sm text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-ink)]"
            onClick={handlePlaceholderClick}
            type="button"
          >
            {isConnected
              ? "写站点反馈、试用活动、价格变化或避坑记录..."
              : "登录后发帖..."}
          </button>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <button
              className="rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
              onClick={handlePlaceholderClick}
              type="button"
            >
              发布帖子
            </button>
            <span className="text-xs text-[var(--color-muted)]">{status}</span>
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <input
            className="w-full rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setStation(event.target.value)}
            placeholder="关联站点或标签"
            value={station}
          />

          <textarea
            className="mt-3 min-h-36 w-full resize-none rounded-[8px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setBody(event.target.value)}
            placeholder="写价格变化、试用活动、模型口径或避坑记录。"
            value={body}
          />

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              onClick={() => setOpen(false)}
              type="button"
            >
              先收起
            </button>

            <button
              className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-60"
              disabled={submitting}
              onClick={handleSubmit}
              type="button"
            >
              {submitting ? "发布中..." : "发布帖子"}
            </button>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--color-muted)]">{status}</p>
        </div>
      )}

      <ForumAuthModal
        key={authModalOpen ? "open" : "closed"}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
