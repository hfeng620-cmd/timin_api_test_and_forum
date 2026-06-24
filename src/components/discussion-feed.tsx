"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createDiscussionPost,
  likeDiscussionPost,
  loadComments,
  loadDiscussionPosts,
  replyDiscussionPost,
  uploadForumImage,
  type DiscussionPost,
  type DiscussionReply,
} from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";

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

function formatRelativeTime(postedAt: string): string {
  if (postedAt === "刚刚") return "刚刚";

  const match = postedAt.match(/^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (!match) return postedAt;

  const [, month, day, hour, minute] = match;
  const now = new Date();
  const date = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));

  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  return postedAt;
}

function ActionIcon({ kind }: { kind: "comment" | "like" }) {
  if (kind === "comment") {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
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
    <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
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
    return <div className="inline-flex items-center gap-2 text-[15px] text-[var(--color-muted)]">{content}</div>;
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
  const { isConnected, displayName, adminUserIds, showAuthModal } = useForumAuth();

  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [commentsMap, setCommentsMap] = useState<Record<string, DiscussionReply[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [station, setStation] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [expandedBodies, setExpandedBodies] = useState<Set<string>>(new Set());
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyTargets, setReplyTargets] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("发帖讨论。");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadPosts = useCallback(async (setLoadingState: boolean) => {
    if (setLoadingState) setLoading(true);
    setError(null);

    try {
      const data = await loadDiscussionPosts();
      setPosts(data);
    } catch {
      setError("讨论暂时没有加载出来，可以重试或稍后再看。");
    } finally {
      if (setLoadingState) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadDiscussionPosts()
      .then((data) => {
        if (cancelled) return;
        setPosts(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError("讨论暂时没有加载出来，可以重试或稍后再看。");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visiblePosts = useMemo(() => {
    const base = compact ? posts.slice(0, 4) : posts;
    return typeof limit === "number" ? base.slice(0, limit) : base;
  }, [compact, limit, posts]);

  async function handleSubmitPost() {
    if (!isConnected) {
      showAuthModal();
      return;
    }

    if (submitting) return;

    if (!body.trim()) {
      setStatus("先写点内容再发帖。");
      return;
    }

    const tags = station
      .split(/[，,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    setSubmitting(true);
    setStatus("发布中...");
    try {
      await createDiscussionPost({
        author: displayName || "群友补充",
        handle: "@forum",
        body: body.trim(),
        station: station.trim(),
        tags,
      });
      await loadPosts(false);
      setBody("");
      setStation("");
      setStatus("已发布。");
    } catch {
      setStatus("发布失败，请检查网络后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId: string) {
    if (!isConnected) {
      showAuthModal();
      return;
    }

    const currentPost = posts.find((p) => p.issueNumber === postId);
    if (!currentPost) return;

    const updatedLikes = currentPost.likes + 1;
    setPosts((current) =>
      current.map((p) => (p.issueNumber === postId ? { ...p, likes: updatedLikes } : p)),
    );

    try {
      const confirmedLikes = await likeDiscussionPost(postId, currentPost.likes);
      setPosts((current) =>
        current.map((p) => (p.issueNumber === postId ? { ...p, likes: confirmedLikes } : p)),
      );
    } catch {
      setPosts((current) =>
        current.map((p) => (p.issueNumber === postId ? { ...p, likes: currentPost.likes } : p)),
      );
    }
  }

  async function loadPostComments(postId: string) {
    if (commentsMap[postId] !== undefined) return;

    try {
      const comments = await loadComments(postId);
      setCommentsMap((current) => ({ ...current, [postId]: comments }));
    } catch {
      setCommentsMap((current) => ({ ...current, [postId]: [] }));
    }
  }

  function togglePost(postId: string, expanded: boolean) {
    setExpandedPostId(expanded ? null : postId);
    if (!expanded) void loadPostComments(postId);
  }

  function openReplyBox(postId: string, target = "楼主") {
    if (expandedPostId === postId) {
      setExpandedPostId(null);
    } else {
      setExpandedPostId(postId);
      setReplyTargets((current) => ({ ...current, [postId]: target }));
      void loadPostComments(postId);
    }
  }

  async function handleReply(postId: string) {
    if (!isConnected) {
      showAuthModal();
      return;
    }

    const draft = replyDrafts[postId]?.trim();
    if (!draft) {
      setStatus("先写一点回复内容。");
      return;
    }

    setStatus("回复中...");
    try {
      await replyDiscussionPost(postId, draft);
      const newComments = await loadComments(postId);
      setCommentsMap((current) => ({ ...current, [postId]: newComments }));
      setPosts((current) =>
        current.map((p) => (p.issueNumber === postId ? { ...p, replyCount: newComments.length } : p)),
      );
      setReplyDrafts((current) => ({ ...current, [postId]: "" }));
      setReplyTargets((current) => ({ ...current, [postId]: "楼主" }));
      setExpandedPostId(postId);
      setStatus("已回复。");
    } catch {
      setStatus("回复失败，请检查网络后重试。");
    }
  }

  if (loading) {
    return (
      <section className="overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
        <div className="px-5 py-10 text-center">
          <p className="text-base text-[var(--color-muted)]">正在加载讨论...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
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
      className="card-lift overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)] transition-all duration-300"
      data-selection-comments="off"
    >
      <div className="border-b border-[var(--color-line)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight">{title}</h2>
          <span className="text-sm text-[var(--color-muted)]">{visiblePosts.length} 条</span>
        </div>
      </div>

      {!hideComposer ? (
        <div className="border-b border-[var(--color-line)] px-6 py-5">
          <div className="rounded-[20px] bg-[var(--color-soft)] p-5">
            <textarea
              className="min-h-28 w-full resize-none bg-transparent text-base leading-7 outline-none"
              onChange={(event) => setBody(event.target.value)}
              placeholder="例如：虎虎这两天试用额度还在吗？Aether 高峰期稳不稳？杂货铺 Plus / Pro 的口径最近有没有变化？"
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
                <input
                  accept="image/*"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { setStatus("图片不能超过 5MB。"); return; }
                    setUploadingImage(true);
                    setStatus("图片上传中...");
                    try {
                      const url = await uploadForumImage(file);
                      setBody((prev) => (prev + `\n![图片](${url})`).trim());
                      setStatus("图片已插入。");
                    } catch { setStatus("图片上传失败。"); }
                    finally { setUploadingImage(false); }
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)] disabled:opacity-50"
                  disabled={uploadingImage}
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {uploadingImage ? "上传中..." : "📷 插图"}
                </button>
                <span aria-live="polite" className="text-xs text-[var(--color-muted)]">{status}</span>
              </div>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
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
            <p className="text-base font-bold text-[var(--color-ink)]">还没有讨论。</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">在上面发第一条帖子，发布后即显示在讨论区。</p>
          </div>
        ) : null}

        {visiblePosts.map((post) => {
          const expanded = expandedPostId === post.issueNumber;
          const comments = commentsMap[post.issueNumber];

          return (
            <article id={post.issueNumber} key={post.issueNumber} className="card-lift border-l-2 border-l-transparent px-5 py-5 transition hover:border-l-[var(--color-brand)] hover:bg-[var(--color-hover)] sm:px-6">
              <div className="flex items-start gap-3 sm:gap-4">
                {post.authorAvatarUrl ? (
                  <img
                    alt={post.author}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    src={post.authorAvatarUrl}
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-sm font-bold text-[var(--color-muted)]">
                    {post.author.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black">{post.author}</h3>
                    {post.authorId && adminUserIds.has(post.authorId) ? (
                      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309] ring-1 ring-[#f59e0b]/30">
                        管理员
                      </span>
                    ) : null}
                    <span className="text-sm text-[var(--color-muted)]">{post.handle}</span>
                    <span className="text-sm text-[var(--color-muted)]">·</span>
                    <span className="text-sm text-[var(--color-muted)]">{formatRelativeTime(post.postedAt)}</span>
                    {post.station ? (
                      <span className="rounded-full bg-[var(--color-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {post.station}
                      </span>
                    ) : null}
                  </div>
                  <hr className="mt-2 border-t border-[var(--color-line)]" />
                  {post.body.length > 500 ? (
                    <>
                      <p className="mt-3 max-w-4xl text-base leading-8 text-[var(--color-ink)]">
                        {expandedBodies.has(post.issueNumber)
                          ? post.body
                          : `${post.body.slice(0, 500)}...`}
                      </p>
                      <button
                        className="mt-1 text-xs font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                        onClick={() => {
                          setExpandedBodies((prev) => {
                            const next = new Set(prev);
                            if (next.has(post.issueNumber)) {
                              next.delete(post.issueNumber);
                            } else {
                              next.add(post.issueNumber);
                            }
                            return next;
                          });
                        }}
                        type="button"
                      >
                        {expandedBodies.has(post.issueNumber) ? "收起" : "展开全文"}
                      </button>
                    </>
                  ) : (
                    <p className="mt-3 max-w-4xl text-base leading-8 text-[var(--color-ink)]">{post.body}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={`${post.issueNumber}-${tag}`} className="text-xs font-semibold text-[var(--color-muted)]">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-7">
                    <ActionButton count={post.replyCount} icon="comment" onClick={() => openReplyBox(post.issueNumber)} />
                    <ActionButton count={post.likes} icon="like" onClick={() => handleLike(post.issueNumber)} />
                    <button
                      className="text-xs font-bold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                      onClick={() => togglePost(post.issueNumber, expanded)}
                      type="button"
                    >
                      {expanded ? "收起" : "展开"}
                    </button>
                  </div>
                </div>
              </div>

              {expanded ? (
                <div className="mt-4 border-l-2 border-[var(--color-line)] pl-4">
                  <div className="space-y-4">
                    {comments === undefined ? (
                      <p className="text-sm text-[var(--color-muted)]">正在加载回复...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-[var(--color-muted)]">还没有回复。来抢沙发，第一个回复这条讨论吧。</p>
                    ) : (
                      comments.map((reply) => (
                        <div key={reply.id} className="group">
                          <div className="flex items-start gap-2">
                            {reply.avatar ? (
                              <img
                                alt={reply.author}
                                className="h-9 w-9 shrink-0 rounded-full object-cover"
                                src={reply.avatar}
                              />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-sm font-bold text-[var(--color-muted)]">
                                {reply.author.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-bold text-[var(--color-ink)]">{reply.author}</span>
                                {reply.authorId && adminUserIds.has(reply.authorId) ? (
                                  <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309] ring-1 ring-[#f59e0b]/30">
                                    管理员
                                  </span>
                                ) : null}
                                <span className="text-[var(--color-muted)]">·</span>
                                <span className="text-[var(--color-muted)]">{formatRelativeTime(reply.postedAt)}</span>
                              </div>
                              <p className="mt-1 text-sm leading-7 text-[var(--color-ink)]">{reply.body}</p>
                              <button
                                className="mt-1 text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                                onClick={() => openReplyBox(post.issueNumber, reply.author)}
                                type="button"
                              >
                                回复
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-line)] pt-4 sm:flex-row">
                    <input
                      className="min-w-0 flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(event) =>
                        setReplyDrafts((current) => ({ ...current, [post.issueNumber]: event.target.value }))
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

    </section>
  );
}

