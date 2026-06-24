"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import HotTopicsPanel from "@/components/hot-topics-panel";
import UserRankPanel from "@/components/user-rank-panel";
import { useForumAuth } from "@/lib/forum-auth";
import { siteLinks } from "@/lib/site-links";

export default function CommunityPage() {
  const { isAdmin } = useForumAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const handleTopicClick = useCallback((postId: string) => {
    const el = document.getElementById(postId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timin观察站</p>
              <p className="text-sm text-[var(--color-muted)]">讨论区与共建入口</p>
            </div>
            <div className="hidden md:block">
              <QqGroupModalButton />
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
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
                论坛入口
              </span>
              {isAdmin ? (
                <Link
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                  href="/admin"
                >
                  管理面板
                </Link>
              ) : null}
            </nav>

            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3 text-sm text-[var(--color-muted)]">
          <span>站点反馈、价格变化、试用线索。</span>
          <a
            className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
            href={siteLinks.discussions}
            rel="noreferrer"
            target="_blank"
          >
            GitHub Discussions
          </a>
        </div>

        {/* Two-column layout: single column on mobile, sidebar appears at xl */}
        <div className="xl:flex xl:gap-6">
          {/* Left column: main content */}
          <div className="min-w-0 flex-1 space-y-5">
            <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((value) => value + 1)} />
            <DiscussionFeed
              key={feedRefreshKey}
              hideComposer
              title="讨论"
              limit={8}
            />
          </div>

          {/* Right sidebar: visible only on xl+ screens */}
          <aside className="hidden xl:block w-[320px] shrink-0">
            <div className="sticky top-24 space-y-5">
              <HotTopicsPanel onTopicClick={handleTopicClick} />

              {/* QQ群入口 */}
              <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  QQ群入口
                </p>
                <p className="mt-3 text-lg font-black tracking-tight">群号 602190132</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  扫码或搜索群号加入，一起交流讨论
                </p>
              </div>

              {/* 贡献排行 */}
              <UserRankPanel />
            </div>
          </aside>
        </div>

        {/* Mobile: UserRankPanel visible below main content on screens smaller than xl */}
        <div className="mt-5 xl:hidden">
          <UserRankPanel />
        </div>
      </section>

    </main>
  );
}
