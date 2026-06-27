"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createDiscussionPost,
  deleteDiscussionPost,
  likeDiscussionPost,
  likeReply,
  loadComments,
  loadDiscussionPostsPaginated,
  loadStationDiscussionPosts,
  pinDiscussionPost,
  replyDiscussionPost,
  searchDiscussionPosts,
  updatePostBody,
  uploadForumImage,
  type DiscussionPost,
  type DiscussionReply,
  type SearchResult,
} from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";
import { UserProfileCard } from "@/components/user-profile-card";

type DiscussionFeedProps = {
  compact?: boolean;
  title?: string;
  hideComposer?: boolean;
  limit?: number;
  stationFilter?: string;
  showSyncButton?: boolean;
};

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

function formatAbsoluteTime(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hour = `${date.getHours()}`.padStart(2, "0");
  const minute = `${date.getMinutes()}`.padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

function parsePostedAt(postedAt: string): Date | null {
  if (postedAt === "刚刚") return new Date();

  const shortMatch = postedAt.match(/^(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})$/);
  if (shortMatch) {
    const [, month, day, hour, minute] = shortMatch;
    const now = new Date();
    let date = new Date(
      now.getFullYear(),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10),
      Number.parseInt(hour, 10),
      Number.parseInt(minute, 10),
    );

    if (date > now) {
      date = new Date(
        now.getFullYear() - 1,
        Number.parseInt(month, 10) - 1,
        Number.parseInt(day, 10),
        Number.parseInt(hour, 10),
        Number.parseInt(minute, 10),
      );
    }

    return date;
  }

  const parsed = new Date(postedAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Parse @username patterns and forum image markdown into renderable content. */
function renderBodyContent(text: string, highlightAuthor?: string) {
  const parts = text.split(/(!\[[^\]]*]\([^)]+\)|@[\w一-鿿]+)/g);
  return parts.map((part, i) => {
    const imageMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imageMatch) {
      const [, alt, src] = imageMatch;
      return (
        <img
          key={i}
          alt={alt || "帖子图片"}
          className="my-3 max-h-96 w-auto max-w-full rounded-xl border border-[var(--color-line)] object-cover"
          loading="lazy"
          src={src}
        />
      );
    }

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

  const date = parsePostedAt(postedAt);
  if (!date) return postedAt;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return formatAbsoluteTime(date);

  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays === 1) return "昨天";
  if (diffDays < 7) return `${diffDays}天前`;
  return formatAbsoluteTime(date);
}

function ActionIcon({ kind, liked }: { kind: "comment" | "like" | "bookmark" | "bookmarkFilled"; liked?: boolean }) {
  if (kind === "comment") {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
        <path d="M20 11.2C20 15.508 16.195 19 11.5 19a9.18 9.18 0 0 1-3.515-.68L4 19.5l1.202-3.396A7.398 7.398 0 0 1 3 11.2C3 6.892 6.805 3.4 11.5 3.4S20 6.892 20 11.2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    );
  }

  if (kind === "bookmark") {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
        <path d="M5 3h14a2 2 0 0 1 2 2v16l-7-4-7 4V5a2 2 0 0 1 2-2z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
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

  // Like — filled red when liked
  if (liked) {
    return (
      <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="#ef4444" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="1.5">
        <path d="M12 20.4s-7-4.355-7-9.24A4.16 4.16 0 0 1 9.2 7a4.62 4.62 0 0 1 2.8 1.1A4.62 4.62 0 0 1 14.8 7A4.16 4.16 0 0 1 19 11.16c0 4.885-7 9.24-7 9.24Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24">
      <path d="M12 20.4s-7-4.355-7-9.24A4.16 4.16 0 0 1 9.2 7a4.62 4.62 0 0 1 2.8 1.1A4.62 4.62 0 0 1 14.8 7A4.16 4.16 0 0 1 19 11.16c0 4.885-7 9.24-7 9.24Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function ActionButton({
  count,
  icon,
  onClick,
  liked,
}: {
  count: number;
  icon: "comment" | "like";
  onClick?: () => void;
  liked?: boolean;
}) {
  const content = (
    <>
      <ActionIcon kind={icon} liked={liked} />
      <span className={liked ? "text-[#ef4444]" : ""}>{count}</span>
    </>
  );

  if (!onClick) {
    return <div className="inline-flex items-center gap-2 text-[15px] text-[var(--color-muted)]">{content}</div>;
  }

  return (
    <button
      className="inline-flex min-h-[40px] min-w-[40px] items-center gap-2 rounded-full px-2 text-[15px] text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)] sm:min-h-[44px] sm:min-w-[44px]"
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
  stationFilter,
  showSyncButton = false,
}: DiscussionFeedProps) {
  const { isConnected, displayName, adminUserIds, ownerUserIds, showAuthModal, user, isAdmin } = useForumAuth();

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
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<"latest" | "mostReplies" | "mostLikes">("latest");
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [activeProfileCard, setActiveProfileCard] = useState<{ userId: string; position: { x: number; y: number } } | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [isSectionRevealed, setIsSectionRevealed] = useState(true);

  // ── Server-side search + pagination state ──
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchCursor, setSearchCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const pageSize = limit ?? 20;

  // Execute server-side search with debounce
  const executeSearch = useCallback(
    async (query: string, tag: string | null, sort: string, cursor: string | null = null, append = false) => {
      if (!query.trim() && !tag && !stationFilter) {
        // No search active — use regular paginated load
        return;
      }
      if (!append) {
        setSearchLoading(true);
        setSearchResult(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const result = await searchDiscussionPosts({
          query: query.trim() || undefined,
          tag: tag ?? undefined,
          sort: sort as "latest" | "mostReplies" | "mostLikes",
          limit: pageSize,
          cursor,
          station: stationFilter,
        });
        if (append) {
          setSearchResult((current) =>
            current
              ? {
                  ...result,
                  posts: [...current.posts, ...result.posts],
                }
              : result,
          );
        } else {
          setSearchResult(result);
          setTotalCount(result.totalCount);
        }
        setSearchCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch {
        // fallback handled in searchDiscussionPosts
      } finally {
        setSearchLoading(false);
        setLoadingMore(false);
      }
    },
    [pageSize, stationFilter],
  );

  // Debounced search effect
  useEffect(() => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      if (searchQuery.trim() || selectedTag) {
        executeSearch(searchQuery, selectedTag, sortOption);
      } else {
        setSearchResult(null);
        setSearchCursor(null);
        setHasMore(Boolean(feedCursor));
        setTotalCount(0);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [executeSearch, feedCursor, searchQuery, selectedTag, sortOption]);

  // ═══ Load more (pagination) ═══
  async function handleLoadMore() {
    if (loadingMore) return;
    if (searchQuery.trim() || selectedTag) {
      // Server-side search pagination
      await executeSearch(searchQuery, selectedTag, sortOption, searchCursor, true);
    } else {
      await loadMoreFeed();
    }
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
      const result = stationFilter
        ? await loadStationDiscussionPosts(stationFilter, pageSize)
        : await loadDiscussionPostsPaginated(pageSize);
      setPosts(result.posts);
      setFeedCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      setError("讨论暂时没有加载出来，可以重试或稍后再看。");
    } finally {
      if (setLoadingState) setLoading(false);
    }
  }, [pageSize, stationFilter]);

  const loadMoreFeed = useCallback(async () => {
    if (!feedCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const result = stationFilter
        ? await loadStationDiscussionPosts(stationFilter, pageSize, feedCursor)
        : await loadDiscussionPostsPaginated(pageSize, feedCursor);
      setPosts((prev) => [...prev, ...result.posts]);
      setFeedCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch {
      // ignore
    }
    setLoadingMore(false);
  }, [feedCursor, loadingMore, pageSize, stationFilter]);

  useEffect(() => {
    let cancelled = false;

    const loadFn = stationFilter
      ? () => loadStationDiscussionPosts(stationFilter, pageSize)
      : () => loadDiscussionPostsPaginated(pageSize);

    loadFn()
      .then((result) => {
        if (cancelled) return;
        setPosts(result.posts);
        setFeedCursor(result.nextCursor);
        setHasMore(result.hasMore);
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
  }, [pageSize, stationFilter]);

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
    // Use server-side search results when available
    if (searchResult) {
      let result = searchResult.posts;
      if (bookmarksOnly) {
        result = result.filter((p) => bookmarkedIds.has(p.issueNumber));
      }
      if (compact) return result.slice(0, 4);
      return result;
    }

    // Fallback: client-side filtering (no search active)
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
    return sorted;
  }, [bookmarkedIds, bookmarksOnly, compact, posts, searchQuery, searchResult, selectedTag, sortOption]);

  const resultCount = searchResult ? totalCount : visiblePosts.length;
  const sortLabel =
    sortOption === "mostReplies"
      ? "按回复优先"
      : sortOption === "mostLikes"
        ? "按点赞优先"
        : "按最新优先";
  const activeFilters = [
    stationFilter ? `站点 ${stationFilter}` : null,
    searchQuery.trim() ? `搜索 ${searchQuery.trim()}` : null,
    selectedTag ? `标签 #${selectedTag}` : null,
    bookmarksOnly ? "只看收藏" : null,
  ].filter((value): value is string => Boolean(value));
  const hasActiveFilters = activeFilters.length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches || !("IntersectionObserver" in window)) {
      setIsSectionRevealed(true);
      return;
    }

    const node = sectionRef.current;
    if (!node) {
      // No ref yet, reveal immediately
      setIsSectionRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          setIsSectionRevealed(true);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -2% 0px" },
    );

    observer.observe(node);

    // Safety fallback: reveal after 800ms if observer doesn't fire
    const fallbackTimer = setTimeout(() => {
      setIsSectionRevealed(true);
    }, 800);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

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
        author: displayName || "噜噜",
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

    const alreadyLiked = likedPosts.has(postId);
    // Optimistic toggle
    setLikedPosts((prev) => { const next = new Set(prev); if (alreadyLiked) next.delete(postId); else next.add(postId); return next; });
    setPosts((current) =>
      current.map((p) => (p.issueNumber === postId ? { ...p, likes: alreadyLiked ? p.likes - 1 : p.likes + 1 } : p)),
    );

    try {
      if (!alreadyLiked) {
        const confirmedLikes = await likeDiscussionPost(postId, currentPost.likes);
        setPosts((current) =>
          current.map((p) => (p.issueNumber === postId ? { ...p, likes: confirmedLikes } : p)),
        );
      }
    } catch {
      setLikedPosts((prev) => { const next = new Set(prev); if (alreadyLiked) next.add(postId); else next.delete(postId); return next; });
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
  function openReplyBox(postId: string, targetAuthor = "楼主", targetReply?: DiscussionReply) {
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

        if (targetReply) {
          setReplyQuotes((current) => ({
            ...current,
            [postId]: { author: targetReply.author, body: targetReply.body },
          }));
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

  function handleAvatarClick(userId: string | undefined, event: React.MouseEvent) {
    if (!userId) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveProfileCard({
      userId,
      position: { x: rect.left, y: rect.bottom + 8 },
    });
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
      ref={sectionRef}
      className={`card-lift overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition-[opacity,transform,box-shadow] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
        isSectionRevealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-70"
      }`}
      data-selection-comments="off"
    >
      <div className="border-b border-[var(--color-line)] bg-[linear-gradient(145deg,var(--color-header),var(--color-panel)_58%,var(--color-brand-soft))] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
              Discussion Workbench
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              {stationFilter
                ? `围绕 ${stationFilter} 聚合最新反馈，优先处理当下短流。`
                : "把新动态、筛选和重点讨论收在同一工作台里。"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
            <div className="rounded-[18px] border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-panel)_76%,transparent)] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                结果
              </p>
              <p className="mt-1 text-lg font-black text-[var(--color-ink)]">{resultCount}</p>
            </div>
            <div className="rounded-[18px] border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-panel)_76%,transparent)] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                排序
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">{sortLabel}</p>
            </div>
            <div className="rounded-[18px] border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-panel)_76%,transparent)] px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                状态
              </p>
              <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">
                {searchLoading ? "更新中" : hasActiveFilters ? "筛选中" : "全量查看"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-[22px] border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-panel)_64%,transparent)] p-3 backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative min-w-0">
            <input
              className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-input)] py-3 pl-5 pr-4 text-sm text-[var(--color-ink)] outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-brand)] focus:bg-[var(--color-panel)]"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="搜索内容、站点名或标签..."
              value={searchQuery}
            />
          </div>
          <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
            <select
              className="w-full cursor-pointer appearance-none rounded-[18px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)] sm:w-auto sm:rounded-full"
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
            {hasActiveFilters ? (
              <button
                className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-semibold text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-soft)] hover:text-[var(--color-brand-deep)] sm:rounded-full"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTag(null);
                  setBookmarksOnly(false);
                }}
                type="button"
              >
                清空筛选
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {hasActiveFilters ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                当前上下文
              </span>
              {activeFilters.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--color-brand-deep)]"
                >
                  {item}
                </span>
              ))}
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">
              当前显示全部讨论，可直接搜索、筛标签或只看收藏。
            </p>
          )}
        </div>
      </div>

      {!hideComposer ? (
        <div className="border-b border-[var(--color-line)] bg-[var(--color-soft)]/40 px-4 py-5 sm:px-6">
          <div className="rounded-[24px] border border-[var(--color-line)] bg-[linear-gradient(180deg,var(--color-panel),var(--color-soft))] p-5 shadow-[inset_0_1px_0_var(--color-panel)]">
            <textarea
              className="min-h-28 w-full resize-none bg-transparent text-base leading-7 text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]"
              onChange={(event) => setBody(event.target.value)}
              onPaste={async (e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { setStatus("图片不能超过 5MB。"); return; }
                    setUploadingImage(true);
                    setStatus("图片上传中...");
                    try {
                      const url = await uploadForumImage(file);
                      const textarea = e.currentTarget;
                      const start = textarea.selectionStart ?? body.length;
                      const before = body.slice(0, start);
                      const after = body.slice(start);
                      setBody((before + `\n![图片](${url})\n` + after).trim());
                      setStatus("图片已插入。");
                    } catch { setStatus("图片上传失败。"); }
                    finally { setUploadingImage(false); }
                    return;
                  }
                }
              }}
              placeholder="一句反馈、一个价格变化、一次试用观察，都可以先发在这里。"
              value={body}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line)] pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <input
                  className="min-w-52 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2 text-sm outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(event) => setStation(event.target.value)}
                  placeholder="带一个站点名或标签"
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
                <span className="text-[11px] text-[var(--color-muted)]">支持粘贴图片 (Ctrl+V)</span>
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
      <div className="border-b border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              高频标签
            </span>
            {topTags.length > 0 ? (
              <>
                <button
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    selectedTag === null
                      ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                      : "border border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
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
                        : "border border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                    }`}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    type="button"
                  >
                    {tag} ({count})
                  </button>
                ))}
              </>
            ) : (
              <span className="text-sm text-[var(--color-muted)]">还没有可聚合的标签。</span>
            )}
          </div>
          {user?.id ? (
            <button
              className={`inline-flex items-center self-start rounded-full px-3.5 py-1.5 text-xs font-semibold transition lg:self-auto ${
                bookmarksOnly
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                  : "border border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
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

      {/* Search loading indicator */}
      {searchLoading && !loadingMore ? (
        <div className="border-b border-[var(--color-line)] bg-[var(--color-soft)]/70 px-5 py-3">
          <p className="text-sm text-[var(--color-muted)]">正在更新结果...</p>
        </div>
      ) : null}

      <div className="grid gap-4 bg-[var(--color-soft)]/35 p-3 sm:p-5 xl:grid-cols-2">
        {visiblePosts.length === 0 ? (
          <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-10 text-center sm:px-6 xl:col-span-2">
            {bookmarksOnly ? (
              <>
                <p className="text-base font-bold text-[var(--color-ink)]">还没有收藏过帖子。</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">先在讨论流里标记重点，再回来集中处理。</p>
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
                <p className="text-base font-bold text-[var(--color-ink)]">没有匹配的讨论。</p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">换个关键词，或者清空筛选后查看全部工作流。</p>
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
                <p className="mt-2 text-sm text-[var(--color-muted)]">第一条短反馈发出后，这里就会开始形成可跟进的讨论流。</p>
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
            <article id={post.issueNumber} key={post.issueNumber} className={`card-lift rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 transition duration-200 hover:border-[var(--color-brand)] hover:bg-[linear-gradient(180deg,var(--color-panel),var(--color-soft))] sm:px-5 ${
                post.is_pinned ? "bg-[linear-gradient(180deg,var(--color-brand-soft),var(--color-panel))] shadow-[0_16px_44px_var(--color-panel-glow)]" : ""
              } ${expanded || stationFilter ? "xl:col-span-2" : ""}`}>
              <div className="flex items-start gap-3 sm:gap-4">
                {post.authorAvatarUrl ? (
                  <img
                    alt={post.author}
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-[var(--color-line)] object-cover transition hover:ring-2 hover:ring-[var(--color-brand)]"
                    src={post.authorAvatarUrl}
                    onClick={(e) => handleAvatarClick(post.authorId, e)}
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] text-sm font-bold text-[var(--color-muted)] transition hover:ring-2 hover:ring-[var(--color-brand)]"
                    onClick={(e) => handleAvatarClick(post.authorId, e)}
                  >
                    {post.author.charAt(0)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3
                      className="cursor-pointer text-base font-black text-[var(--color-ink)] transition hover:text-[var(--color-brand)]"
                      onClick={(e) => handleAvatarClick(post.authorId, e)}
                    >
                      {post.author}
                    </h3>
                    {post.authorId && ownerUserIds.has(post.authorId) ? (
                      <span className="rounded-full border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)]">
                        站主
                      </span>
                    ) : post.authorId && adminUserIds.has(post.authorId) ? (
                      <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)]">
                        管理员
                      </span>
                    ) : null}
                    {post.is_pinned ? (
                      <span className="rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-on-brand)] ring-1 ring-[var(--color-brand)]/30">
                        📌 置顶
                      </span>
                    ) : null}
                    {isAdmin ? (
                      <button
                        className="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)] disabled:opacity-50"
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
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
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
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
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
                          return <span className="text-[11px] font-semibold text-[var(--color-brand-deep)]">(已编辑)</span>;
                        }
                        return null;
                      })()
                    ) : null}
                    {post.station ? (
                      <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {post.station}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[var(--color-muted)]">
                    {post.is_pinned ? (
                      <span className="rounded-full border border-[var(--color-brand)]/20 bg-[var(--color-brand-soft)] px-2.5 py-1 text-[var(--color-brand-deep)]">
                        优先处理
                      </span>
                    ) : null}
                    {post.replyCount > 0 ? (
                      <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1">
                        {post.replyCount} 条回复
                      </span>
                    ) : null}
                    {post.likes > 0 ? (
                      <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1">
                        {post.likes} 个赞
                      </span>
                    ) : null}
                  </div>
                  {editingPostId === post.issueNumber ? (
                    <div className="mt-3">
                      <textarea
                        className="min-h-32 w-full resize-none rounded-[18px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-base leading-7 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) => setEditBody(event.target.value)}
                        value={editBody}
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-xs font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
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
                      <p className="mt-4 max-w-4xl text-[15px] leading-7 text-[var(--color-ink)] sm:text-base sm:leading-8">
                        <span className="whitespace-pre-wrap break-words">
                          {expandedBodies.has(post.issueNumber)
                            ? renderBodyContent(post.body)
                            : renderBodyContent(`${post.body.slice(0, 500)}...`)}
                        </span>
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
                    <p className="mt-4 max-w-4xl whitespace-pre-wrap break-words text-[15px] leading-7 text-[var(--color-ink)] sm:text-base sm:leading-8">
                      {renderBodyContent(post.body)}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <button
                        key={`${post.issueNumber}-${tag}`}
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                          selectedTag === tag
                            ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                            : "border border-[var(--color-line)] bg-[var(--color-soft)] text-[var(--color-muted)] hover:bg-[var(--color-hover)] hover:text-[var(--color-ink)]"
                        }`}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        type="button"
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-[var(--color-line)] pt-3 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                    <button
                      className="rounded-full bg-[var(--color-brand)] px-3 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)] sm:px-4"
                      onClick={() => openReplyBox(post.issueNumber)}
                      type="button"
                    >
                      回复讨论
                    </button>
                    <ActionButton count={post.replyCount} icon="comment" onClick={() => openReplyBox(post.issueNumber)} />
                    <ActionButton count={post.likes} icon="like" liked={likedPosts.has(post.issueNumber)} onClick={() => handleLike(post.issueNumber)} />
                    {/* Bookmark button */}
                    <button
                      className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-2 rounded-full px-2 text-[15px] text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)] sm:min-h-[44px] sm:min-w-[44px] sm:justify-start"
                      onClick={() => handleToggleBookmark(post.issueNumber)}
                      type="button"
                      title={isBookmarked ? "取消收藏" : "收藏"}
                    >
                      <ActionIcon kind={isBookmarked ? "bookmarkFilled" : "bookmark"} />
                      <span className="text-xs font-semibold">{isBookmarked ? "已收藏" : "收藏"}</span>
                    </button>
                    {/* Sync to main discussion button (only in station view) */}
                    {showSyncButton && stationFilter && (
                      <a
                        className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)] sm:min-h-[44px] sm:min-w-[44px]"
                        href="/community"
                        title="同步到站内讨论区"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                          <polyline points="16 6 12 2 8 6" />
                          <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                        同步
                      </a>
                    )}
                    <button
                      className="min-h-[40px] rounded-full border border-[var(--color-line)] px-3 py-2 text-xs font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-brand-deep)] sm:min-h-[44px]"
                      onClick={() => togglePost(post.issueNumber, expanded)}
                      type="button"
                    >
                      {expanded ? "收起讨论" : "查看详情"}
                    </button>
                  </div>
                </div>
              </div>

              {expanded ? (
                <div className="mt-4 origin-top animate-[discussionExpand_220ms_ease-out] rounded-[20px] border border-[var(--color-line)] bg-[var(--color-soft)]/70 p-4 motion-reduce:animate-none">
                  <div className="space-y-4">
                    {comments === undefined ? (
                      <p className="text-sm text-[var(--color-muted)]">正在加载回复...</p>
                    ) : comments.length === 0 ? (
                      <p className="text-sm text-[var(--color-muted)]">还没有回复，可以先补充处理结论或下一步判断。</p>
                    ) : (
                      comments.map((reply) => (
                        <div key={reply.id} className="group">
                          <div className="flex items-start gap-2">
                            {reply.avatar ? (
                              <img
                                alt={reply.author}
                                className="h-9 w-9 shrink-0 cursor-pointer rounded-full object-cover transition hover:ring-2 hover:ring-[var(--color-brand)]"
                                src={reply.avatar}
                                onClick={(e) => handleAvatarClick(reply.authorId, e)}
                              />
                            ) : (
                              <div
                                className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-[var(--color-soft)] text-sm font-bold text-[var(--color-muted)] transition hover:ring-2 hover:ring-[var(--color-brand)]"
                                onClick={(e) => handleAvatarClick(reply.authorId, e)}
                              >
                                {reply.author.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 text-sm">
                                <span
                                  className="cursor-pointer font-bold text-[var(--color-ink)] transition hover:text-[var(--color-brand)]"
                                  onClick={(e) => handleAvatarClick(reply.authorId, e)}
                                >
                                  {reply.author}
                                </span>
                                {reply.authorId && ownerUserIds.has(reply.authorId) ? (
                                  <span className="rounded-full border border-[var(--color-brand)]/25 bg-[var(--color-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-deep)]">
                                    站主
                                  </span>
                                ) : reply.authorId && adminUserIds.has(reply.authorId) ? (
                                  <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)]">
                                    管理员
                                  </span>
                                ) : null}
                                <span className="text-[var(--color-muted)]">·</span>
                                <span className="text-[var(--color-muted)]">{formatRelativeTime(reply.postedAt)}</span>
                              </div>
                              <p className="mt-1 text-sm leading-7 text-[var(--color-ink)]">
                                <span className="whitespace-pre-wrap break-words">
                                  {renderBodyContent(reply.body)}
                                </span>
                              </p>
                              <div className="mt-1 flex items-center gap-3">
                                <button
                                  className="text-xs font-semibold text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                                  onClick={() => openReplyBox(post.issueNumber, reply.author, reply)}
                                  type="button"
                                >
                                  回复
                                </button>
                                <button
                                  className={`inline-flex items-center gap-1 text-xs font-semibold transition ${likedReplies.has(reply.id) ? "text-[#ef4444]" : "text-[var(--color-muted)] hover:text-red-400"}`}
                                  onClick={async () => {
                                    if (!isConnected) { showAuthModal(); return; }
                                    const alreadyLiked = likedReplies.has(reply.id);
                                    // Optimistic toggle
                                    setLikedReplies((prev) => {
                                      const next = new Set(prev);
                                      if (alreadyLiked) next.delete(reply.id);
                                      else next.add(reply.id);
                                      return next;
                                    });
                                    try {
                                      const result = await likeReply(reply.id);
                                      // Update with server response
                                      setLikedReplies((prev) => {
                                        const next = new Set(prev);
                                        if (result.liked) next.add(reply.id);
                                        else next.delete(reply.id);
                                        return next;
                                      });
                                      setCommentsMap((prev) => ({
                                        ...prev,
                                        [post.issueNumber]: (prev[post.issueNumber] ?? []).map((r) =>
                                          r.id === reply.id ? { ...r, likes: result.count } : r
                                        ),
                                      }));
                                    } catch {
                                      // Revert on error
                                      setLikedReplies((prev) => {
                                        const next = new Set(prev);
                                        if (alreadyLiked) next.add(reply.id);
                                        else next.delete(reply.id);
                                        return next;
                                      });
                                    }
                                  }}
                                  type="button"
                                >
                                  <svg className="h-3.5 w-3.5" fill={likedReplies.has(reply.id) ? "#ef4444" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    <textarea
                      className="min-h-[48px] min-w-0 flex-1 resize-none rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--color-brand)]"
                      rows={1}
                      onChange={(event) =>
                        setReplyDrafts((current) => ({ ...current, [post.issueNumber]: event.target.value }))
                      }
                      onPaste={async (e) => {
                        const items = e.clipboardData?.items;
                        if (!items) return;
                        for (const item of items) {
                          if (item.type.startsWith("image/")) {
                            e.preventDefault();
                            const file = item.getAsFile();
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) { setStatus("图片不能超过 5MB。"); return; }
                            setUploadingImage(true);
                            setStatus("图片上传中...");
                            try {
                              const url = await uploadForumImage(file);
                              const currentDraft = replyDrafts[post.issueNumber] ?? "";
                              setReplyDrafts((prev) => ({ ...prev, [post.issueNumber]: (currentDraft + `\n![图片](${url})`).trim() }));
                              setStatus("图片已插入。");
                            } catch { setStatus("图片上传失败。"); }
                            finally { setUploadingImage(false); }
                            return;
                          }
                        }
                      }}
                      placeholder={`回复 ${replyTarget ?? "楼主"}（支持粘贴图片）`}
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

      {/* Load more button */}
      {hasMore && !compact ? (
        <div className="border-t border-[var(--color-line)] px-5 py-4 text-center">
          <button
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-6 py-3 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)] hover:border-[var(--color-brand)] disabled:opacity-50"
            disabled={loadingMore}
            onClick={handleLoadMore}
            type="button"
          >
            {loadingMore
              ? "加载中..."
              : searchResult
                ? `加载更多 (${visiblePosts.length} / ${totalCount})`
                : "加载更多讨论"}
          </button>
        </div>
      ) : null}

      {/* User profile popup */}
      {activeProfileCard ? (
        <UserProfileCard
          userId={activeProfileCard.userId}
          position={activeProfileCard.position}
          onClose={() => setActiveProfileCard(null)}
        />
      ) : null}

      <style jsx>{`
        @keyframes discussionExpand {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

    </section>
  );
}
