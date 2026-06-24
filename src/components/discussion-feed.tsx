"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createDiscussionPost,
  likeDiscussionPost,
  loadDiscussionPosts,
  loadComments,
  replyDiscussionPost,
  type DiscussionPost,
  type DiscussionReply,
} from "@/lib/discussion-storage";
import { useGithubAuth } from "@/lib/github-auth";
import { GithubAuthModal } from "@/components/github-auth-modal";

type DiscussionFeedProps = {
  compact?: boolean;
  title?: string;
  hideComposer?: boolean;
  limit?: number;
};

function formatCount(value: number) {
  if (value >= 10000) {
    const wan = value / 10000;
    return `${Number.isInteger(wan) ? wan : wan.toFixed(1)}万`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }

  return `${value}`;
}

function ActionIcon({ kind }: { kind: "comment" | "like" }) {
  if (kind === "comment") {
    return (
      <svg
        aria-hidden="true"
        className="h-[18px] w-[18px]"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          d="M20 11.2C20 15.508 16.195 19 11.5 19a9.18 9.18 0 0 1-3.515-.68L4 19.5l1.202-3.396A7.398 7.398 0 0 1 3 11.2C3 6.892 6.805 3.4 11.5 3.4S20 6.892 20 11.2Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M12 20.4s-7-4.355-7-9.24A4.16 4.16 0 0 1 9.2 7a4.62 4.62 0 0 1 2.8 1.1A4.62 4.62 0 0 1 14.8 7A4.16 4.16 0 0 1 19 11.16c0 4.885-7 9.24-7 9.24Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ActionButton({
  count,
  icon,
  onClick,
}: {
  count: number;
  icon: "comment" | "like";
  onClick?: () => void;
}) {
  const content = (
    <>
      <ActionIcon kind={icon} />
      <span>{formatCount(count)}</span>
    </>
  );

  if (!onClick) {
    return (
      <div className="inline-flex items-center gap-2 text-[15px] text-[var(--color-muted)]">
        {content}
      </div>
    );
  }

  return (
    <button
      className="inline-flex items-center gap-2 text-[15px] text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  );
}

export function DiscussionFeed({
  compact = false,
  title = "讨论",
  hideComposer = false,
  limit,
}: DiscussionFeedProps) {
  const { token, isConnected } = useGithubAuth();

  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [commentsMap, setCommentsMap] = useState<
    Record<number, DiscussionReply[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [station, setStation] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<number, string>>(
    {},
  );
  const [status, setStatus] = useState("发帖讨论。");
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const loadPosts = useCallback(
    async (setLoadingState: boolean) => {
      if (setLoadingState) {
        setLoading(true);
      }
      setError(null);
      try {
        const data = await loadDiscussionPosts(token ?? undefined);
        setPosts(data);
        if (setLoadingState) {
          setLoading(false);
        }
      } catch {
        setError("加载失败");
        if (setLoadingState) {
          setLoading(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    let cancelled = false;
    loadDiscussionPosts(token ?? undefined)
      .then((data) => {
        if (cancelled) return;
        setPosts(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("加载失败");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);


  const visiblePosts = useMemo(() => {
    const base = compact ? posts.slice(0, 4) : posts;
    return typeof limit === "number" ? base.slice(0, limit) : base;
  }, [compact, limit, posts]);

  async function handleSubmitPost() {
    if (!isConnected || !token) {
      setAuthModalOpen(true);
      return;
    }

    if (!body.trim()) {
      setStatus("先写点内容再发帖。");
      return;
    }

    const tags = station
      .split(/[，,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setStatus("发布中...");
    try {
      await createDiscussionPost(token, {
        author: "群友补充",
        handle: "@group_note",
        body,
        station,
        tags,
      });
      await loadPosts(false);
      setBody("");
      setStation("");
      setStatus("已提交，等待审核。");
    } catch {
      setStatus("发布失败，请重试。");
    }
  }

  async function handleLike(issueNumber: number) {
    if (!isConnected || !token) {
      setAuthModalOpen(true);
      return;
    }

    const currentPost = posts.find((p) => p.issueNumber === issueNumber);
    if (!currentPost) return;

    const updatedLikes = currentPost.likes + 1;
    setPosts((current) =>
      current.map((p) =>
        p.issueNumber === issueNumber
          ? { ...p, likes: updatedLikes }
          : p,
      ),
    );

    try {
      const confirmedLikes = await likeDiscussionPost(token, issueNumber, currentPost.likes);
      setPosts((current) =>
        current.map((p) =>
          p.issueNumber === issueNumber ? { ...p, likes: confirmedLikes } : p,
        ),
      );
    } catch {
      setPosts((current) =>
        current.map((p) =>
          p.issueNumber === issueNumber ? { ...p, likes: currentPost.likes } : p,
        ),
      );
    }
  }

  async function loadPostComments(issueNumber: number) {
    if (commentsMap[issueNumber] !== undefined) return;

    const comments = await loadComments(token ?? undefined, issueNumber);
    setCommentsMap((current) => ({
      ...current,
      [issueNumber]: comments,
    }));
  }

  function togglePost(issueNumber: number, expanded: boolean) {
    setExpandedPostId(expanded ? null : issueNumber);
    if (!expanded) {
      void loadPostComments(issueNumber);
    }
  }

  function openReplyBox(issueNumber: number, target = "楼主") {
    setExpandedPostId(issueNumber);
    setReplyTargets((current) => ({ ...current, [issueNumber]: target }));
    void loadPostComments(issueNumber);
  }

  async function handleReply(issueNumber: number) {
    if (!isConnected || !token) {
      setAuthModalOpen(true);
      return;
    }

    const draft = replyDrafts[issueNumber]?.trim();
    if (!draft) {
      setStatus("先写一点回复内容。");
      return;
    }

    setStatus("回复中...");
    try {
      await replyDiscussionPost(token, issueNumber, draft);
      const newComments = await loadComments(token ?? undefined, issueNumber);
      setCommentsMap((current) => ({
        ...current,
        [issueNumber]: newComments,
      }));
      setPosts((current) =>
        current.map((p) =>
          p.issueNumber === issueNumber
            ? { ...p, replyCount: newComments.length }
            : p,
        ),
      );
      setReplyDrafts((current) => ({ ...current, [issueNumber]: "" }));
      setReplyTargets((current) => ({ ...current, [issueNumber]: "楼主" }));
      setExpandedPostId(issueNumber);
      setStatus("已回复。");
    } catch {
      setStatus("回复失败，请重试。");
    }
  }

  if (loading) {
    return (
      <section className="overflow-hidden rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <div className="px-5 py-10 text-center">
          <p className="text-base text-[var(--color-muted)]">加载中...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <div className="px-5 py-10 text-center">
          <p className="text-base text-[var(--color-muted)]">{error}</p>
          <button
            className="mt-3 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
            onClick={() => loadPosts(true)}
            type="button"
          >
            重试
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className="overflow-hidden rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]"
      data-selection-comments="off"
    >
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <span className="text-sm text-[var(--color-muted)]">
            {visiblePosts.length} 条
          </span>
        </div>
      </div>

      {!hideComposer ? (
        <div className="border-b border-[var(--color-line)] px-6 py-5">
          <div className="rounded-[18px] bg-[var(--color-soft)] p-5">
            <textarea
              className="min-h-28 w-full resize-none bg-transparent text-base leading-7 outline-none"
              onChange={(event) => setBody(event.target.value)}
              placeholder="例如：虎虎这两天试用额度还在吗？Aether 高峰期稳不稳？杂货铺 Claude Max 的口径最近有没有变化？"
              value={body}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line)] pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="min-w-52 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => setStation(event.target.value)}
                  placeholder="带一个站点名或标签，例如 虎虎 / Aether"
                  value={station}
                />
                <span className="text-xs text-[var(--color-muted)]">
                  {status}
                </span>
              </div>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                onClick={handleSubmitPost}
                type="button"
              >
                发布讨论
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="divide-y divide-[var(--color-line)]">
        {visiblePosts.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-6">
            <p className="text-base font-bold text-[var(--color-ink)]">
              还没有讨论。
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              在上面发第一条帖子，站点反馈会直接出现在这里。
            </p>
          </div>
        ) : null}

        {visiblePosts.map((post) => {
          const expanded = expandedPostId === post.issueNumber;
          const comments = commentsMap[post.issueNumber];

          return (
            <article
              key={String(post.issueNumber)}
              className="px-5 py-5 transition hover:bg-[var(--color-hover)] sm:px-6"
            >
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{post.author}</h3>
                    <span className="text-sm text-[var(--color-muted)]">
                      {post.handle}
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      ·
                    </span>
                    <span className="text-sm text-[var(--color-muted)]">
                      {post.postedAt}
                    </span>
                    {post.station ? (
                      <span className="rounded-full bg-[var(--color-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {post.station}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 max-w-4xl text-[15px] leading-7 text-[var(--color-ink)]">
                    {post.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={`${post.issueNumber}-${tag}`}
                        className="text-xs font-semibold text-[var(--color-muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  className="text-xs font-bold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                  onClick={() => togglePost(post.issueNumber, expanded)}
                  type="button"
                >
                  {expanded ? "收起" : "展开"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-7">
                <ActionButton
                  count={post.replyCount}
                  icon="comment"
                  onClick={() => openReplyBox(post.issueNumber)}
                />
                <ActionButton
                  count={post.likes}
                  icon="like"
                  onClick={() => handleLike(post.issueNumber)}
                />
              </div>

              {expanded ? (
                <div className="mt-4 border-l-2 border-[var(--color-line)] pl-4">
                  <div className="space-y-4">
                    {comments === undefined ? (
                      <p className="text-sm text-[var(--color-muted)]">
                        加载中...
                      </p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-[var(--color-muted)]">
                        暂无回复。
                      </p>
                    ) : (
                      comments.map((reply, index) => (
                        <div
                          key={`${post.issueNumber}-reply-${index}`}
                          className="group"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="font-bold text-[var(--color-ink)]">
                              {reply.author}
                            </span>
                            <span className="text-[var(--color-muted)]">
                              ·
                            </span>
                            <span className="text-[var(--color-muted)]">
                              {reply.postedAt}
                            </span>
                          </div>
                          <p className="mt-1 text-sm leading-7 text-[var(--color-ink)]">
                            {reply.body}
                          </p>
                          <button
                            className="mt-1 text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                            onClick={() =>
                              openReplyBox(
                                post.issueNumber,
                                reply.author,
                              )
                            }
                            type="button"
                          >
                            回复
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-line)] pt-4 sm:flex-row">
                    <input
                      className="min-w-0 flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [post.issueNumber]: event.target.value,
                        }))
                      }
                      placeholder={`回复 ${replyTargets[post.issueNumber] ?? "楼主"}`}
                      value={replyDrafts[post.issueNumber] ?? ""}
                    />
                    <button
                      className="rounded-full bg-[var(--color-brand)] px-4 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] sm:w-auto"
                      onClick={() => handleReply(post.issueNumber)}
                      type="button"
                    >
                      发送
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <GithubAuthModal
        key={authModalOpen ? "open" : "closed"}
        open={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </section>
  );
}
