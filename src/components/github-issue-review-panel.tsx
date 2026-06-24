"use client";

import { useCallback, useState } from "react";

import { ForumAuthModal } from "@/components/forum-auth-modal";
import {
  approveDiscussionPost,
  loadPendingDiscussionPosts,
  rejectDiscussionPost,
  type DiscussionPost,
} from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";

export function GithubIssueReviewPanel() {
  const { isConnected } = useForumAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("登录管理员邮箱后可审核站内待发布讨论。");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const loadPending = useCallback(async () => {
    if (!isConnected) {
      setPosts([]);
      setAuthModalOpen(true);
      return;
    }

    setLoading(true);
    setStatus("正在读取待审核讨论...");
    try {
      const data = await loadPendingDiscussionPosts();
      setPosts(data);
      setStatus(data.length > 0 ? `待审核 ${data.length} 条。` : "当前没有待审核讨论。");
    } catch {
      setStatus("读取失败，请确认当前邮箱在 Supabase forum_admins 管理员名单里。");
    } finally {
      setLoading(false);
    }
  }, [isConnected]);

  async function review(postId: string, action: "approve" | "reject") {
    if (!isConnected) {
      setAuthModalOpen(true);
      return;
    }

    setStatus(action === "approve" ? "正在通过..." : "正在驳回...");
    try {
      if (action === "approve") {
        await approveDiscussionPost(postId);
        setStatus("已通过，帖子会进入站内讨论列表。");
      } else {
        await rejectDiscussionPost(postId);
        setStatus("已驳回并删除待审核记录。");
      }
      await loadPending();
    } catch {
      setStatus("操作失败，请确认管理员权限或稍后重试。");
    }
  }

  return (
    <section className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            Supabase 论坛审核
          </p>
          <h2 className="mt-2 text-2xl font-black">论坛待审核帖子</h2>
        </div>
        <button
          className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
          onClick={() => (isConnected ? void loadPending() : setAuthModalOpen(true))}
          type="button"
        >
          {isConnected ? "刷新" : "登录邮箱"}
        </button>
      </div>

      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{status}</p>

      <div className="mt-5 space-y-4">
        {!isConnected ? (
          <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
            普通访客不需要进这里。管理员登录后可通过或驳回站内待审核帖子。
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
                  <h3 className="text-lg font-black">{post.author}</h3>
                  {post.station ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {post.station}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {post.handle} · {post.postedAt}
                </p>
              </div>
              <span className="text-xs font-bold text-[var(--color-muted)]">待审核</span>
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

      <ForumAuthModal
        key={authModalOpen ? "open" : "closed"}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </section>
  );
}
