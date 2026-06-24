"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import { siteLinks } from "@/lib/site-links";

export default function CommunityPage() {
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

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
            </nav>

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

        <div className="space-y-5">
          <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((value) => value + 1)} />
          <DiscussionFeed
            key={feedRefreshKey}
            hideComposer
            title="讨论"
            limit={8}
          />
        </div>
      </section>

    </main>
  );
}
