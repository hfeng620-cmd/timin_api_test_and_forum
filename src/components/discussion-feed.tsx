"use client";

import { useMemo, useState } from "react";

import {
  bookmarkDiscussionPost,
  createDiscussionPost,
  likeDiscussionPost,
  loadDiscussionPosts,
  replyDiscussionPost,
  type DiscussionPost,
} from "@/lib/discussion-storage";

type DiscussionFeedProps = {
  compact?: boolean;
  title?: string;
  subtitle?: string;
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

function ActionIcon({
  kind,
}: {
  kind: "comment" | "like" | "bookmark";
}) {
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

  if (kind === "like") {
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

  return (
    <svg
      aria-hidden="true"
      className="h-[18px] w-[18px]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <path
        d="M7 4.5h10a1 1 0 0 1 1 1v14l-6-3.6-6 3.6v-14a1 1 0 0 1 1-1Z"
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
  icon: "comment" | "like" | "bookmark";
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
  title = "最新讨论",
  subtitle = "发一条价格变化、试用反馈或避坑结论，回复和点赞都直接留在这里。",
  hideComposer = false,
  limit,
}: DiscussionFeedProps) {
  const [posts, setPosts] = useState<DiscussionPost[]>(() => loadDiscussionPosts());
  const [body, setBody] = useState("");
  const [station, setStation] = useState("");
  const [expandedPostId, setExpandedPostId] = useState<string | null>(posts[0]?.id ?? null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState("这里是发帖讨论，不是划词批注。");

  const visiblePosts = useMemo(() => {
    const base = compact ? posts.slice(0, 4) : posts;
    return typeof limit === "number" ? base.slice(0, limit) : base;
  }, [compact, limit, posts]);

  function handleSubmitPost() {
    if (!body.trim()) {
      setStatus("先写点内容再发帖。");
      return;
    }

    const tags = station
      .split(/[，,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    const updated = createDiscussionPost({
      body,
      station,
      tags,
    });

    setPosts(updated);
    setBody("");
    setStation("");
    setExpandedPostId(updated[0]?.id ?? null);
    setStatus("帖子已经发出，现在别人可以继续回复和点赞。");
  }

  function handleLike(id: string) {
    setPosts(likeDiscussionPost(id));
  }

  function handleBookmark(id: string) {
    setPosts(bookmarkDiscussionPost(id));
  }

  function handleReply(id: string) {
    const draft = replyDrafts[id]?.trim();
    if (!draft) {
      setStatus("先写一点回复内容。");
      return;
    }

    const updated = replyDiscussionPost(id, { body: draft });
    setPosts(updated);
    setReplyDrafts((current) => ({ ...current, [id]: "" }));
    setExpandedPostId(id);
    setStatus("回复已经挂到帖子下面了。");
  }

  return (
    <section
      className="overflow-hidden rounded-[30px] border border-[var(--color-line)] bg-white shadow-[var(--shadow-card)]"
      data-selection-comments="off"
    >
      <div className="border-b border-[var(--color-line)] bg-[linear-gradient(180deg,#ffffff,#f8fbff)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-deep)]">
              {title}
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight">帖子流先承接一线反馈</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
              {subtitle}
            </p>
          </div>
          <div className="grid gap-2 text-left sm:text-right">
            <div className="rounded-full bg-[var(--color-brand-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)]">
              发帖、回复、点赞、收藏
            </div>
            <a
              className="text-sm font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-ink)]"
              href="https://github.com/hfeng620-cmd/api_test_and_forum/discussions"
              rel="noreferrer"
              target="_blank"
            >
              去 GitHub Discussions 看长讨论 →
            </a>
          </div>
        </div>
      </div>

      {!hideComposer ? (
        <div className="border-b border-[var(--color-line)] px-6 py-5">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#fbfdff,#f3f7fd)] p-5">
            <textarea
              className="min-h-28 w-full resize-none bg-transparent text-base leading-7 outline-none"
              onChange={(event) => setBody(event.target.value)}
              placeholder="例如：虎虎这两天试用额度还在吗？Aether 高峰期稳不稳？杂货铺 Claude Max 的口径最近有没有变化？"
              value={body}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line)] pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="min-w-52 rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => setStation(event.target.value)}
                  placeholder="带一个站点名或标签，例如 虎虎 / Aether"
                  value={station}
                />
                <span className="text-xs text-[var(--color-muted)]">{status}</span>
              </div>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
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
        {visiblePosts.map((post) => {
          const expanded = expandedPostId === post.id;

          return (
            <article
              key={post.id}
              className="px-6 py-5 transition hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,251,255,0.9))]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-black">{post.author}</h3>
                    <span className="text-sm text-[var(--color-muted)]">{post.handle}</span>
                    <span className="text-sm text-[var(--color-muted)]">{post.postedAt}</span>
                    {post.station ? (
                      <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {post.station}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 max-w-4xl text-[15px] leading-7 text-[var(--color-ink)]">
                    {post.body}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={`${post.id}-${tag}`}
                        className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1 text-xs font-semibold text-[var(--color-muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  className="rounded-full border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                  onClick={() => setExpandedPostId(expanded ? null : post.id)}
                  type="button"
                >
                  {expanded ? "收起" : "展开"}
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-8">
                <ActionButton
                  count={post.stats.replies}
                  icon="comment"
                  onClick={() => setExpandedPostId(expanded ? null : post.id)}
                />
                <ActionButton
                  count={post.stats.likes}
                  icon="like"
                  onClick={() => handleLike(post.id)}
                />
                <ActionButton
                  count={post.stats.bookmarks}
                  icon="bookmark"
                  onClick={() => handleBookmark(post.id)}
                />
              </div>

              {expanded ? (
                <div className="mt-5 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-[var(--color-ink)]">回复区</p>
                    <p className="text-xs text-[var(--color-muted)]">
                      先在这里接短回复，长讨论再整理进 Discussions
                    </p>
                  </div>
                  <div className="space-y-3">
                    {(post.replies ?? []).length === 0 ? (
                      <p className="text-sm text-[var(--color-muted)]">还没有回复，你可以先接一条。</p>
                    ) : (
                      (post.replies ?? []).map((reply, index) => (
                        <div
                          key={`${post.id}-reply-${index}`}
                          className="rounded-[18px] bg-white px-4 py-4"
                        >
                          <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className="font-bold text-[var(--color-ink)]">{reply.author}</span>
                            <span className="text-[var(--color-muted)]">{reply.handle}</span>
                            <span className="text-[var(--color-muted)]">{reply.postedAt}</span>
                          </div>
                          <p className="mt-2 text-sm leading-7 text-[var(--color-ink)]">
                            {reply.body}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <input
                      className="min-w-60 flex-1 rounded-full border border-[var(--color-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(event) =>
                        setReplyDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      placeholder="回一条，例如：我刚测过，这个倍率还有效。"
                      value={replyDrafts[post.id] ?? ""}
                    />
                    <button
                      className="rounded-full border border-[var(--color-line)] bg-white px-4 py-3 text-sm font-bold transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                      onClick={() => handleReply(post.id)}
                      type="button"
                    >
                      回复这条
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
