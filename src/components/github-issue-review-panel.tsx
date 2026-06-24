"use client";

import { useCallback, useState } from "react";

import {
  approveDiscussionPost,
  loadPendingDiscussionPosts,
  rejectDiscussionPost,
  type DiscussionPost,
} from "@/lib/discussion-storage";
import { useGithubAuth } from "@/lib/github-auth";
import { GithubAuthModal } from "@/components/github-auth-modal";

export function GithubIssueReviewPanel() {
  const { token, isConnected } = useGithubAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("连接 GitHub 后可审核待发布讨论。");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const loadPending = useCallback(async () => {
    if (!token) {
      setPosts([]);
      return;
    }

    setLoading(true);
    setStatus("正在读取待审核讨论...");
    try {
      const data = await loadPendingDiscussionPosts(token);
      setPosts(data);
      setStatus(data.length > 0 ? `待审核 ${data.length} 条。` : "当前没有待审核讨论。");
    } catch {
      setStatus("读取失败，请确认 Token 拥有本仓库 Issues 读写权限。");
    } finally {
      setLoading(false);
    }
  }, [token]);


  async function review(issueNumber: number, action: "approve" | "reject") {
    if (!token) {
      setAuthModalOpen(true);
      return;
    }

    setStatus(action === "approve" ? "正在通过..." : "正在驳回...");
    try {
      if (action === "approve") {
        await approveDiscussionPost(token, issueNumber);
        setStatus("已通过，帖子会进入站内讨论列表。");
      } else {
        await rejectDiscussionPost(token, issueNumber);
        setStatus("已驳回并关闭对应 Issue。");
      }
      await loadPending();
    } catch {
      setStatus("操作失败，请确认 Token 权限或稍后重试。");
    }
  }

  return (
    <section className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            GitHub Issues 审核
          </p>
          <h2 className="mt-2 text-2xl font-black">论坛待审核帖子</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
            onClick={() => (isConnected ? void loadPending() : setAuthModalOpen(true))}
            type="button"
          >
            {isConnected ? "刷新" : "连接 GitHub"}
          </button>
          <a
            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
            href="https://github.com/hfeng620-cmd/timin_api_test_and_forum/issues?q=is%3Aissue+is%3Aopen+label%3A%E5%BE%85%E5%AE%A1%E6%A0%B8"
            rel="noreferrer"
            target="_blank"
          >
            打开 Issues
          </a>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{status}</p>

      <div className="mt-5 space-y-4">
        {!isConnected ? (
          <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
            审核需要一个只授权本仓库 Issues 读写权限的 GitHub fine-grained Token。普通访客不需要进这里。
          </div>
        ) : null}

        {isConnected && loading ? (
          <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
            正在加载...
          </div>
        ) : null}

        {isConnected && !loading && posts.length === 0 ? (
          <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
            暂无待审核帖子。
          </div>
        ) : null}

        {posts.map((post) => (
          <article
            className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
            key={post.issueNumber}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-black">#{post.issueNumber}</h3>
                  {post.station ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {post.station}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {post.author} {post.handle} · {post.postedAt}
                </p>
              </div>
              <a
                className="text-sm font-bold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                href={`https://github.com/hfeng620-cmd/timin_api_test_and_forum/issues/${post.issueNumber}`}
                rel="noreferrer"
                target="_blank"
              >
                查看原 Issue
              </a>
            </div>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink)]">
              {post.body}
            </p>

            {post.tags.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span className="text-xs font-semibold text-[var(--color-muted)]" key={`${post.issueNumber}-${tag}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
                onClick={() => void review(post.issueNumber, "approve")}
                type="button"
              >
                通过
              </button>
              <button
                className="rounded-full bg-[#fff1f2] px-5 py-2.5 text-sm font-bold text-[#be123c] transition hover:bg-[#ffe4e6]"
                onClick={() => void review(post.issueNumber, "reject")}
                type="button"
              >
                驳回
              </button>
            </div>
          </article>
        ))}
      </div>

      <GithubAuthModal
        key={authModalOpen ? "open" : "closed"}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </section>
  );
}