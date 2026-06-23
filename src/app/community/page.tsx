"use client";

import Link from "next/link";
import { useState } from "react";

import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { forumHighlights } from "@/lib/site-data";

export default function CommunityPage() {
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-white shadow-[0_10px_30px_var(--color-panel-glow)]">
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
            <ThemeToggle />
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1 md:flex">
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
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_var(--color-panel-glow)]">
                论坛入口
              </span>
            </nav>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="grid gap-8 border-b border-[var(--color-line)] pb-10 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.56fr)] xl:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
              Community Desk
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight lg:text-6xl">
              社区入口先承接实时反馈，
              <br />
              再把有价值的讨论沉淀下来。
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--color-muted)]">
              这里负责两件事：一是把价格变化、试用线索、避坑记录先接住；二是把值得长期保留的话题继续沉淀到 GitHub Discussions。站内帖子流负责轻量更新，QQ群负责即时协作。
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {forumHighlights.map((item) => (
                <span
                  key={item.title}
                  className="rounded-full border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-muted)]"
                >
                  {item.title}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-[30px] border border-[var(--color-line)] bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  协作入口
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">即时协作和长讨论分开走</h2>
              </div>
              <div className="hidden md:block">
                <QqGroupModalButton />
              </div>
            </div>

            <div className="grid gap-3">
              <a
                className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 transition hover:border-[var(--color-brand)]"
                href="https://github.com/hfeng620-cmd/api_test_and_forum/discussions"
                rel="noreferrer"
                target="_blank"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
                  GitHub Discussions
                </p>
                <p className="mt-2 text-lg font-black">适合沉淀长讨论、整理固定结论</p>
              </a>

              <Link
                href="/stations"
                className="rounded-[24px] border border-[var(--color-line)] bg-white px-4 py-4 transition hover:border-[var(--color-brand)]"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  回到榜单
                </p>
                <p className="mt-2 text-lg font-black">先看站点，再回这里补帖子和回复</p>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-[26px] border border-[var(--color-line)] bg-white/92 p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm text-[var(--color-muted)]">站内帖子流</p>
            <p className="mt-2 text-2xl font-black">轻量同步</p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              适合发价格变化、试用活动、避坑记录和快速追问。
            </p>
          </div>
          <div className="rounded-[26px] border border-[var(--color-line)] bg-white/92 p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm text-[var(--color-muted)]">GitHub Discussions</p>
            <p className="mt-2 text-2xl font-black">长期沉淀</p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              适合把群里的高质量结论整理成长帖和公开共识。
            </p>
          </div>
          <div className="rounded-[26px] border border-[var(--color-line)] bg-white/92 p-5 shadow-[var(--shadow-card)]">
            <p className="text-sm text-[var(--color-muted)]">QQ群 602190132</p>
            <p className="mt-2 text-2xl font-black">实时线索</p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
              适合先报站点新增、失效活动、异常价格和高峰期表现。
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(300px,0.42fr)] xl:justify-between">
          <div className="space-y-6">
            <DiscussionFeed
              key={feedRefreshKey}
              hideComposer
              title="最新讨论"
              subtitle="这里优先承接站点更新、试用线索、避坑记录和正式回复。可以先在站内轻量发帖，再把长期话题沉淀到 GitHub Discussions。"
              limit={8}
            />
          </div>

          <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((value) => value + 1)} />
        </div>
      </section>
    </main>
  );
}
