"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { getUserPosts, type DiscussionPost } from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";

export default function ProfilePage() {
  const { isConnected, user, email, displayName, showAuthModal } = useForumAuth();
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!isConnected || !user) return;
    setLoading(true);
    try {
      const data = await getUserPosts(user.id);
      setPosts(data);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Derived stats
  const postCount = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + p.likes, 0);
  const totalReplies = posts.reduce((sum, p) => sum + p.replyCount, 0);

  // Format join date from Supabase user created_at
  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "未知";

  const name = displayName || email?.split("@")[0] || "用户";
  const initial = name.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      {/* Header */}
      <section className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]"
              href="/"
            >
              T
            </Link>
            <div>
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
              <p className="text-sm text-[var(--color-muted)]">个人主页</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 md:flex">
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/"
              >
                首页
              </Link>
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/stations"
              >
                中转站榜单
              </Link>
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/community"
              >
                论坛入口
              </Link>
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
                个人主页
              </span>
            </nav>

            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
        {!isConnected ? (
          /* Not logged in */
          <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-10 text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-soft)] text-3xl font-black text-[var(--color-muted)]">
              ?
            </div>
            <h2 className="mt-6 text-2xl font-black tracking-tight">请先登录查看个人主页</h2>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              登录后可查看个人资料、发帖记录与互动统计。
            </p>
            <button
              className="mt-6 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)] btn-press"
              onClick={showAuthModal}
              type="button"
            >
              登录
            </button>
          </div>
        ) : (
          <>
            {/* User info card */}
            <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] sm:p-8">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                {/* Avatar */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-3xl font-black text-[var(--color-muted)] ring-1 ring-[var(--color-line)]">
                  {initial}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <h1 className="text-2xl font-black tracking-tight">{name}</h1>
                  {email ? (
                    <p className="mt-1 text-sm text-[var(--color-muted)]">{email}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {joinDate} 加入
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    这个人很懒，什么都没写...
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div className="mt-6 grid grid-cols-3 gap-3 rounded-[16px] bg-[var(--color-soft)] p-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-[var(--color-brand-deep)]">{postCount}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">发帖</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[var(--color-brand-deep)]">{totalReplies}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">回复数</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-[var(--color-brand-deep)]">{totalLikes}</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">收到赞</p>
                </div>
              </div>
            </div>

            {/* Recent posts */}
            <div className="mt-6 rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--color-line)] px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-black tracking-tight">最近发帖</h2>
                  <span className="text-sm text-[var(--color-muted)]">{posts.length} 条</span>
                </div>
              </div>

              {loading ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-[var(--color-muted)]">正在加载...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-bold text-[var(--color-ink)]">暂无发帖。</p>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">
                    去
                    <Link
                      className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                      href="/community"
                    >
                      讨论区
                    </Link>
                    发布你的第一条帖子吧。
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--color-line)]">
                  {posts.slice(0, 10).map((post) => (
                    <article
                      key={post.issueNumber}
                      className="px-6 py-4 transition hover:bg-[var(--color-hover)]"
                    >
                      <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                        {post.station ? (
                          <span className="rounded-full bg-[var(--color-soft)] px-2 py-0.5 font-bold text-[var(--color-brand-deep)]">
                            {post.station}
                          </span>
                        ) : null}
                        <span>{post.postedAt}</span>
                        <span>·</span>
                        <span>{post.likes} 赞</span>
                        <span>·</span>
                        <span>{post.replyCount} 回复</span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm leading-7 text-[var(--color-ink)]">
                        {post.body}
                      </p>
                      {post.tags.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {post.tags.map((tag) => (
                            <span
                              key={`${post.issueNumber}-${tag}`}
                              className="text-xs font-semibold text-[var(--color-muted)]"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
