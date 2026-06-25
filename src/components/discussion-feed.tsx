"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createDiscussionPost,
  deleteDiscussionPost,
  likeDiscussionPost,
  likeReply,
  loadComments,
  loadDiscussionPosts,
  pinDiscussionPost,
  replyDiscussionPost,
  updatePostBody,
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

/** Parse @username patterns and render them as highlighted spans with brand color.
 *  When highlightAuthor is provided, matching @mentions get a soft background highlight. */
function renderBodyWithMentions(text: string, highlightAuthor?: string) {
  const parts = text.split(/(@[\w一-鿿]+)/g);
  return parts.map((part, i) => {
    if (/^@[\w一-鿿]+$/.test(part)) {
      const name = part.slice(1);
      const isTarget = highlightAuthor && name === highlightAuthor;
      return (
        <span
          key={i}
          className={`font-semibold ${isTarget ? "rounded bg-[var(--color-brand-soft)] px-0.5 text-[var(--color-brand-deep)]" : "text-[var(--color-brand)]"}`}
        >
          {part}
        </span>
      );
    }
    return part;
  });
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

function ActionIcon({ kind }: { kind: "comment" | "like" | "bookmark" | "bookmarkFilled" }) {
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

  if (kind === "bookmark") {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
        <path
          d="M5 3h14a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (kind === "bookmarkFilled") {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 3h14a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z" />
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
      className="inline-flex items-center gap-2 text-[15px] text-[var(--color-muted)] transition hover:text-[var(--color-ink)] min-h-[44px] min-w-[44px]"
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
  const { isConnected, displayName, adminUserIds, showAuthModal, user, isAdmin } = useForumAuth();

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
  /** Store the body of the reply being quoted so we can show a quote preview */
  const [replyQuotes, setReplyQuotes] = useState<Record<string, { author: string; body: string }>>({});
  const [status, setStatus] = useState("发帖讨论。");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "mostReplies" | "mostLikes">("latest");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);

  // --- bookmark localStorage helpers ---
  function getBookmarkKey(uid: string) {
    return `timin-bookmarks-${uid}`;
  }

  function loadBookmarksFromStorage(uid: string): Set<string> {
    try {
      const raw = localStorage.getItem(getBookmarkKey(uid));
      if (raw) {
        const arr = JSON.parse(raw) as string[];
        return new Set(arr);
      }
    } catch {
      // ignore corrupt data
    }
    return new Set();
  }

  function saveBookmarksToStorage(uid: string, ids: Set<string>) {
    localStorage.setItem(getBookmarkKey(uid), JSON.stringify([...ids]));
  }

  // Load bookmarks on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      setBookmarkedIds(loadBookmarksFromStorage(user.id));
    } else {
      setBookmarkedIds(new Set());
    }
  }, [user?.id]);

  function handleToggleBookmark(postId: string) {
    if (!user?.id) {
      showAuthModal();
      return;
    }
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }
      saveBookmarksToStorage(user.id, next);
      return next;
    });
  }

  async function handlePinPost(postId: string, isPinned: boolean) {
    if (pinSaving) return;
    setPinSaving(true);
    try {
      await pinDiscussionPost(postId, isPinned);
      setPosts((current) =>
        current.map((p) => (p.issueNumber === postId ? { ...p, is_pinned: isPinned } : p)),
      );
    } catch {
      setStatus("置顶操作失败，请检查网络后重试。");
    } finally {
      setPinSaving(false);
    }
  }

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

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const post of posts) {
      for (const tag of post.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
      .slice(0, 8);
  }, [posts]);

  const visiblePosts = useMemo(() => {
    let base = compact ? posts.slice(0, 4) : [...posts];
    if (selectedTag) {
      base = base.filter((p) => p.tags.includes(selectedTag));
    }
    if (bookmarksOnly) {
      base = base.filter((p) => bookmarkedIds.has(p.issueNumber));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      base = base.filter((p) => {
        return (
          p.body.toLowerCase().includes(q) ||
          p.station?.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }
    // Sort pinned posts to top (stable within each group)
    const pinned = base.filter((p) => p.is_pinned);
    const unpinned = base.filter((p) => !p.is_pinned);
    if (sortOption === "mostReplies") {
      pinned.sort((a, b) => b.replyCount - a.replyCount);
      unpinned.sort((a, b) => b.replyCount - a.replyCount);
    } else if (sortOption === "mostLikes") {
      pinned.sort((a, b) => b.likes - a.likes);
      unpinned.sort((a, b) => b.likes - a.likes);
    }
    const sorted = [...pinned, ...unpinned];
    return typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  }, [compact, limit, posts, selectedTag, searchQuery, sortOption, bookmarksOnly, bookmarkedIds]);

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
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "发布失败，请检查网络后重试。");
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

  /** Open the reply box for a post. When replying to a specific author, auto-prepend @author
   *  and store the target reply body as a quote reference. */
  function openReplyBox(postId: string, targetAuthor = "楼主") {
    // Always expand the post and set reply target
    setExpandedPostId(postId);
    setReplyTargets((current) => ({ ...current, [postId]: targetAuthor }));

    // Auto-prepend @authorName when replying to a specific user (not the original post)
    if (targetAuthor !== "楼主") {
        setReplyDrafts((current) => {
          const existing = current[postId] ?? "";
          const mention = `@${targetAuthor} `;
          // Only prepend if not already present
          if (!existing.startsWith(mention)) {
            return { ...current, [postId]: mention + existing };
          }
          return current;
        });

        // Find the reply being replied to and store it as a quote
        const currentComments = commentsMap[postId];
        if (currentComments) {
          const targetReply = currentComments.find((r) => r.author === targetAuthor);
          if (targetReply) {
            setReplyQuotes((current) => ({
              ...current,
              [postId]: { author: targetReply.author, body: targetReply.body },
            }));
          }
        }
      } else {
        // Clear quote when replying to OP
        setReplyQuotes((current) => {
          const next = { ...current };
          delete next[postId];
          return next;
        });
      }

      void loadPostComments(postId);
  }

  async function handleReply(postId: string) {
    if (!isConnected) {
      showAuthModal();
      return;
    }
    if (replySubmitting.has(postId)) return;

    const draft = replyDrafts[postId]?.trim();
    if (!draft) {
      setStatus("先写一点回复内容。");
      return;
    }

    setReplySubmitting((prev) => new Set(prev).add(postId));
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
      setReplyQuotes((current) => {
        const next = { ...current };
        delete next[postId];
        return next;
      });
      setExpandedPostId(postId);
      setStatus("已回复。");
    } catch {
      setStatus("回复失败，请检查网络后重试。");
    } finally {
      setReplySubmitting((prev) => { const next = new Set(prev); next.delete(postId); return next; });
    }
  }

  function handleStartEdit(post: DiscussionPost) {
    setEditingPostId(post.issueNumber);
    setEditBody(post.body);
  }

  function handleCancelEdit() {
    setEditingPostId(null);
    setEditBody("");
  }

  async function handleSaveEdit(postId: string) {
    if (editSaving) return;
    const trimmed = editBody.trim();
    if (!trimmed) {
      setStatus("内容不能为空。");
      return;
    }
    setEditSaving(true);
    setStatus("保存中...");
    try {
      await updatePostBody(postId, trimmed);
      setPosts((current) =>
        current.map((p) =>
          p.issueNumber === postId ? { ...p, body: trimmed, updatedAt: new Date().toISOString() } : p,
        ),
      );
      setEditingPostId(null);
      setEditBody("");
      setStatus("已保存。");
    } catch {
      setStatus("保存失败，请检查网络后重试。");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeletePost(postId: string) {
    if (!window.confirm("确定要删除这条帖子吗？")) return;
    setStatus("删除中...");
    try {
      await deleteDiscussionPost(postId);
      setPosts((current) => current.filter((p) => p.issueNumber !== postId));
      setStatus("已删除。");
    } catch {
      setStatus("删除失败，请检查网络后重试。");
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
          <span className="text-sm text-[var(--color-muted)]">找到 {visiblePosts.length} 条讨论</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <input
              className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] pl-5 pr-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索帖子内容、站点名或标签..."
              value={searchQuery}
            />
          </div>
          <select
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)] cursor-pointer appearance-none text-[var(--color-ink)]"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as "latest" | "mostReplies" | "mostLikes")}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
              paddingRight: "36px",
            }}
          >
            <option value="latest">最新发布</option>
            <option value="mostReplies">最多回复</option>
            <option value="mostLikes">最多点赞</option>
          </select>
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

      {/* Tag filters + bookmark toggle */}
      <div className="border-b border-[var(--color-line)] px-5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {topTags.length > 0 ? (
            <>
              <button
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  selectedTag === null
                    ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                    : "bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                }`}
                onClick={() => setSelectedTag(null)}
                type="button"
              >
                全部
              </button>
              {topTags.map(([tag, count]) => (
                <button
                  key={tag}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    selectedTag === tag
                      ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                      : "bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                  }`}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  type="button"
                >
                  {tag} ({count})
                </button>
              ))}
            </>
          ) : null}
          {/* Bookmark filter toggle */}
          {user?.id ? (
            <button
              className={`ml-auto inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                bookmarksOnly
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                  : "bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
              }`}
              onClick={() => setBookmarksOnly(!bookmarksOnly)}
              type="button"
            >
              <ActionIcon kind={bookmarksOnly ? "bookmarkFilled" : "bookmark"} />
              <span className="ml-1.5">只看收藏</span>
            </button>
          ) : null}
        </div>
      </div>

      <div className="divide-y divide-[var(--color-line)]">
        {visiblePosts.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-6">
            {bookmarksOnly ? (
              <>
                <p className="text-base font-bold text-[var(--color-ink)]">还没有收藏过帖子。</p>
                <button
                  className="mt-3 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                  onClick={() => setBookmarksOnly(false)}
                  type="button"
                >
                  查看全部
                </button>
              </>
            ) : searchQuery.trim() ? (
              <>
                <p className="text-base font-bold text-[var(--color-ink)]">没有匹配的讨论，试试其他关键词</p>
              </>
            ) : selectedTag ? (
              <>
                <p className="text-base font-bold text-[var(--color-ink)]">没有带「{selectedTag}」标签的帖子。</p>
                <button
                  className="mt-3 rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                  onClick={() => setSelectedTag(null)}
                  type="button"
                >
                  查看全部
                </button>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-[var(--color-ink)]">还没有讨论。</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">在上面发第一条帖子，发布后即显示在讨论区。</p>
              </>
            )}
          </div>
        ) : null}

        {visiblePosts.map((post) => {
          const expanded = expandedPostId === post.issueNumber;
          const comments = commentsMap[post.issueNumber];
          const isBookmarked = bookmarkedIds.has(post.issueNumber);
          const replyTarget = replyTargets[post.issueNumber];
          const replyQuote = replyQuotes[post.issueNumber];

          return (
            <article id={post.issueNumber} key={post.issueNumber} className={`card-lift border-l-2 border-l-transparent px-5 py-5 transition hover:border-l-[var(--color-brand)] hover:bg-[var(--color-hover)] sm:px-6 ${
                post.is_pinned ? "bg-[var(--color-brand-soft)]/50" : ""
              }`}>
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
                    {post.is_pinned ? (
                      <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/30">
                        📌 置顶
                      </span>
                    ) : null}
                    {isAdmin ? (
                      <button
                        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#8b7355] transition hover:bg-[#f5f0e8] hover:text-[#6b5a45] disabled:opacity-50"
                        disabled={pinSaving}
                        onClick={() => handlePinPost(post.issueNumber, !post.is_pinned)}
                        title={post.is_pinned ? "取消置顶" : "置顶"}
                        type="button"
                      >
                        {post.is_pinned ? "📌 取消置顶" : "📌 置顶"}
                      </button>
                    ) : null}
                    {isConnected && user?.id === post.authorId && editingPostId !== post.issueNumber ? (
                      <>
                        <button
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#8b7355] transition hover:bg-[#f5f0e8] hover:text-[#6b5a45]"
                          onClick={() => handleStartEdit(post)}
                          title="编辑"
                          type="button"
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          编辑
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-[#8b7355] transition hover:bg-[#f5f0e8] hover:text-[#6b5a45]"
                          onClick={() => handleDeletePost(post.issueNumber)}
                          title="删除"
                          type="button"
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" />
                          </svg>
                          删除
                        </button>
                      </>
                    ) : null}
                    <span className="text-sm text-[var(--color-muted)]">{post.handle}</span>
                    <span className="text-sm text-[var(--color-muted)]">·</span>
                    <span className="text-sm text-[var(--color-muted)]">{formatRelativeTime(post.postedAt)}</span>
                    {post.createdAt && post.updatedAt && post.updatedAt !== post.createdAt ? (
                      (() => {
                        const created = new Date(post.createdAt).getTime();
                        const updated = new Date(post.updatedAt).getTime();
                        const diffMs = updated - created;
                        if (diffMs > 60000) {
                          return (
                            <span className="text-[11px] font-semibold text-[#8b7355]">(已编辑)</span>
                          );
                        }
                        return null;
                      })()
                    ) : null}
                    {post.station ? (
                      <span className="rounded-full bg-[var(--color-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {post.station}
                      </span>
                    ) : null}
                  </div>
                  <hr className="mt-2 border-t border-[var(--color-line)]" />
                  {editingPostId === post.issueNumber ? (
                    <div className="mt-3">
                      <textarea
                        className="min-h-32 w-full resize-none rounded-lg border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-base leading-7 outline-none transition focus:border-[#8b7355]"
                        onChange={(event) => setEditBody(event.target.value)}
                        value={editBody}
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          className="rounded-full bg-[#8b7355] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#6b5a45] disabled:opacity-50"
                          disabled={editSaving}
                          onClick={() => handleSaveEdit(post.issueNumber)}
                          type="button"
                        >
                          {editSaving ? "保存中..." : "保存"}
                        </button>
                        <button
                          className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                          disabled={editSaving}
                          onClick={handleCancelEdit}
                          type="button"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : post.body.length > 500 ? (
                    <>
                      <p className="mt-3 max-w-4xl text-[15px] leading-7 sm:text-base sm:leading-8 text-[var(--color-ink)]">
                        {expandedBodies.has(post.issueNumber)
                          ? renderBodyWithMentions(post.body)
                          : renderBodyWithMentions(`${post.body.slice(0, 500)}...`)}
                      </p>
                      <button
                        className="mt-1 min-h-[44px] rounded-lg px-3 py-2 text-xs font-semibold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-brand)]"
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
                        {expandedBodies.has(post.issueNumber) ? "收起 ▲" : "展开全文 ▼"}
                      </button>
                    </>
                  ) : (
                    <p className="mt-3 max-w-4xl text-[15px] leading-7 sm:text-base sm:leading-8 text-[var(--color-ink)]">
                      {renderBodyWithMentions(post.body)}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <button
                        key={`${post.issueNumber}-${tag}`}
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                          selectedTag === tag
                            ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                            : "bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                        }`}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        type="button"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between sm:justify-start sm:gap-7">
                    <ActionButton count={post.replyCount} icon="comment" onClick={() => openReplyBox(post.issueNumber)} />
                    <ActionButton count={post.likes} icon="like" onClick={() => handleLike(post.issueNumber)} />
                    {/* Bookmark button */}
                    <button
                      className="inline-flex items-center gap-2 text-[15px] text-[var(--color-muted)] transition hover:text-[var(--color-ink)] min-h-[44px] min-w-[44px]"
                      onClick={() => handleToggleBookmark(post.issueNumber)}
                      type="button"
                      title={isBookmarked ? "取消收藏" : "收藏"}
                    >
                      <ActionIcon kind={isBookmarked ? "bookmarkFilled" : "bookmark"} />
                    </button>
                    <button
                      className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-xs font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-brand-deep)]"
                      onClick={() => togglePost(post.issueNumber, expanded)}
                      type="button"
                    >
                      {expanded ? "收起 ▲" : "展开 ▼"}
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
                              <p className="mt-1 text-sm leading-7 text-[var(--color-ink)]">
                                {renderBodyWithMentions(reply.body)}
                              </p>
                              <div className="mt-1 flex items-center gap-3">
                                <button
                                  className="text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                                  onClick={() => openReplyBox(post.issueNumber, reply.author)}
                                  type="button"
                                >
                                  回复
                                </button>
                                <button
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-muted)] transition hover:text-red-400"
                                  onClick={async () => {
                                    if (!isConnected) { showAuthModal(); return; }
                                    try {
                                      const newLikes = await likeReply(reply.id);
                                      setCommentsMap((prev) => ({
                                        ...prev,
                                        [post.issueNumber]: (prev[post.issueNumber] ?? []).map((r) =>
                                          r.id === reply.id ? { ...r, likes: newLikes } : r
                                        ),
                                      }));
                                    } catch { /* ignore */ }
                                  }}
                                  type="button"
                                >
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 20.4s-7-4.355-7-9.24A4.16 4.16 0 0 1 9.2 7a4.62 4.62 0 0 1 2.8 1.1A4.62 4.62 0 0 1 14.8 7A4.16 4.16 0 0 1 19 11.16c0 4.885-7 9.24-7 9.24Z" />
                                  </svg>
                                  {reply.likes > 0 ? reply.likes : null}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Quote/reply reference preview */}
                  {replyQuote ? (
                    <div className="mt-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2">
                      <p className="text-[11px] font-semibold text-[var(--color-muted)]">
                        回复 <span className="text-[var(--color-brand)]">@{replyQuote.author}</span>：
                      </p>
                      <p className="mt-0.5 text-xs leading-5 text-[var(--color-muted)] line-clamp-2">
                        {replyQuote.body}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--color-line)] pt-4 sm:flex-row">
                    <input
                      className="min-w-0 flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3.5 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(event) =>
                        setReplyDrafts((current) => ({ ...current, [post.issueNumber]: event.target.value }))
                      }
                      placeholder={`回复 ${replyTarget ?? "楼主"}`}
                      value={replyDrafts[post.issueNumber] ?? ""}
                    />
                    <button
                      className="w-full rounded-full bg-[var(--color-brand)] px-4 py-3.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50 sm:w-auto"
                      disabled={replySubmitting.has(post.issueNumber)}
                      onClick={() => handleReply(post.issueNumber)}
                      type="button"
                    >
                      {replySubmitting.has(post.issueNumber) ? "发送中..." : "发送"}
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
