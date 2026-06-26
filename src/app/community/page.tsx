"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { OnlineIndicator } from "@/components/online-indicator";
import { CommunityPostPanel } from "@/components/community-post-panel";
import { DiscussionFeed } from "@/components/discussion-feed";
import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import HotTopicsPanel from "@/components/hot-topics-panel";
import UserRankPanel from "@/components/user-rank-panel";
import { useForumAuth } from "@/lib/forum-auth";
import { siteLinks } from "@/lib/site-links";

const collaborationCards = [
  {
    id: "01",
    title: "站内快反馈",
    summary: "补一句、报跳价、留试用。",
    actionLabel: "进入站内区",
    href: "#community-composer",
    external: false,
    accent:
      "border-[var(--color-brand)] bg-[linear-gradient(135deg,var(--color-brand),var(--color-brand-deep))] text-[var(--color-on-brand)] shadow-[0_20px_50px_var(--color-panel-glow)]",
    badge: "bg-white/18 text-white ring-1 ring-white/25",
  },
  {
    id: "02",
    title: "GitHub Discussions",
    summary: "专题归档、经验整理、长期追踪。",
    actionLabel: "进入 Discussions",
    href: siteLinks.discussions,
    external: true,
    accent:
      "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-ink)] shadow-[var(--shadow-card)]",
    badge:
      "bg-[var(--color-soft)] text-[var(--color-brand-deep)] ring-1 ring-[var(--color-line)]",
  },
  {
    id: "03",
    title: "QQ 群 602190132",
    summary: "急线索先同步，再回流站内。",
    actionLabel: "查看加群方式",
    href: "#qq-group-entry",
    external: false,
    accent:
      "border border-[var(--color-line)] bg-[linear-gradient(180deg,var(--color-panel),var(--color-brand-soft))] text-[var(--color-ink)] shadow-[var(--shadow-card)]",
    badge:
      "bg-[var(--color-panel)] text-[var(--color-brand-deep)] ring-1 ring-[var(--color-line)]",
  },
];

const decisionRules = [
  "一句话: 站内",
  "成专题: Discussions",
  "要同步: QQ 群",
];

const quickSignals = [
  {
    label: "快反馈",
    value: "站内",
  },
  {
    label: "专题帖",
    value: "Discussions",
  },
  {
    label: "急同步",
    value: "QQ 群",
  },
];

export default function CommunityPage() {
  const { isAdmin } = useForumAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"hot" | "rank" | null>(null);
  const [feedbackCard, discussionsCard, qqCard] = collaborationCards;

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
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
              <p className="text-sm text-[var(--color-muted)]">协作路由桌面</p>
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
                协作桌面
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

            <OnlineIndicator />
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-3 py-4 sm:px-6 lg:px-10">
        <div className="mb-5 overflow-hidden rounded-[32px] border border-[var(--color-line)] bg-[var(--surface-gradient)] shadow-[var(--shadow-card)]">
          <div className="grid gap-6 px-5 py-6 sm:px-6 lg:grid-cols-[1.12fr_0.88fr] lg:px-8 lg:py-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                Community Routing Desk
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">
                先分流，再协作。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                快反馈走站内，专题进 Discussions，急线索先到 QQ 群。
              </p>

              <div className="mt-5 flex flex-wrap gap-2.5">
                {quickSignals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                  >
                    <span className="text-[var(--color-muted)]">{signal.label}</span>
                    <span className="mx-2 text-[var(--color-line)]">/</span>
                    <span className="font-bold text-[var(--color-ink)]">{signal.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1.18fr)_minmax(260px,0.82fr)]">
                <div className="grid gap-3">
                  <Link
                    className={`group flex min-h-[148px] flex-col justify-between rounded-[24px] border px-5 py-5 transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] sm:flex-row sm:items-end ${feedbackCard.accent}`}
                    href={feedbackCard.href}
                  >
                    <div className="max-w-xl">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${feedbackCard.badge}`}
                      >
                        {feedbackCard.id}
                      </span>
                      <p className="mt-3 text-lg font-black sm:text-xl">{feedbackCard.title}</p>
                      <p className="mt-2 text-sm leading-6 opacity-90">{feedbackCard.summary}</p>
                    </div>
                    <p className="mt-5 text-sm font-black sm:mt-0 sm:text-right">
                      {feedbackCard.actionLabel} <span aria-hidden>→</span>
                    </p>
                  </Link>

                  <a
                    className={`group flex min-h-[148px] flex-col justify-between rounded-[24px] border px-5 py-5 transition hover:-translate-y-1 hover:border-[var(--color-brand)] hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] sm:flex-row sm:items-end ${discussionsCard.accent}`}
                    href={discussionsCard.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="max-w-xl">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${discussionsCard.badge}`}
                      >
                        {discussionsCard.id}
                      </span>
                      <p className="mt-3 text-lg font-black sm:text-xl">{discussionsCard.title}</p>
                      <p className="mt-2 text-sm leading-6 opacity-85">{discussionsCard.summary}</p>
                    </div>
                    <p className="mt-5 text-sm font-black sm:mt-0 sm:text-right">
                      {discussionsCard.actionLabel} <span aria-hidden>→</span>
                    </p>
                  </a>
                </div>

                <Link
                  className={`group flex min-h-[188px] flex-col justify-between rounded-[24px] border px-5 py-5 transition hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] xl:min-h-full ${qqCard.accent}`}
                  href={qqCard.href}
                >
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${qqCard.badge}`}
                    >
                      {qqCard.id}
                    </span>
                    <p className="mt-3 text-lg font-black sm:text-xl">{qqCard.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{qqCard.summary}</p>
                  </div>
                  <p className="mt-6 text-sm font-black">
                    {qqCard.actionLabel} <span aria-hidden>→</span>
                  </p>
                </Link>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[linear-gradient(180deg,var(--color-panel),rgba(255,255,255,0.72))] p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  分流规则
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                  先快，后沉淀。
                </p>
                <div className="mt-4 grid gap-3">
                  {decisionRules.map((rule, index) => (
                    <div
                      key={rule}
                      className="flex items-start gap-3 rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-sm font-black text-[var(--color-brand-deep)]">
                        {index + 1}
                      </span>
                      <p className="pt-1 text-sm leading-6 text-[var(--color-ink)]">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-brand-soft)] p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                  移动端直达
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  主内容前先选入口，不用翻侧栏。
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Link
                    className="rounded-[18px] bg-[var(--color-brand)] px-4 py-3 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_12px_24px_var(--color-panel-glow)]"
                    href="#community-composer"
                  >
                    发站内反馈
                  </Link>
                  <a
                    className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                    href={siteLinks.discussions}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    去 Discussions
                  </a>
                  <div className="sm:col-span-2 md:hidden">
                    <QqGroupModalButton />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-line)] pb-3 text-sm text-[var(--color-muted)]">
            <span>这里先接短反馈，再把可沉淀内容转去 Discussions。</span>
            <a
              className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
              href={siteLinks.discussions}
              rel="noopener noreferrer"
              target="_blank"
            >
              去 Discussions 归档
            </a>
          </div>
          <div className="mt-3 grid gap-2 text-sm text-[var(--color-muted)] md:grid-cols-3">
            <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
              <p className="font-bold text-[var(--color-ink)]">站内快反馈</p>
              <p className="mt-1 leading-6">适合短消息、价格变化和一线试用。</p>
            </div>
            <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
              <p className="font-bold text-[var(--color-ink)]">长期主题</p>
              <p className="mt-1 leading-6">适合整理经验、对比方案和持续追踪。</p>
            </div>
            <div
              id="qq-group-entry"
              className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3"
            >
              <p className="font-bold text-[var(--color-ink)]">QQ 群同步</p>
              <p className="mt-1 leading-6">适合先拉齐情况，再回流成结构化内容。</p>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-2 sm:grid-cols-3 xl:hidden">
          <Link
            className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
            href="#community-composer"
          >
            30 秒发站内反馈
          </Link>
          <a
            className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
            href={siteLinks.discussions}
            rel="noopener noreferrer"
            target="_blank"
          >
            去长期讨论区
          </a>
          <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-bold text-[var(--color-ink)]">打开 QQ 群入口</span>
              <QqGroupModalButton />
            </div>
          </div>
        </div>

        <div className="mb-4 flex gap-2 xl:hidden">
          <button
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              mobilePanel === "hot"
                ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                : "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)]"
            }`}
            onClick={() => setMobilePanel(mobilePanel === "hot" ? null : "hot")}
            type="button"
          >
            热门
          </button>
          <button
            className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
              mobilePanel === "rank"
                ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                : "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)]"
            }`}
            onClick={() => setMobilePanel(mobilePanel === "rank" ? null : "rank")}
            type="button"
          >
            排行
          </button>
        </div>

        <div className="xl:flex xl:gap-6">
          <div className="min-w-0 flex-1 space-y-5">
            <div id="community-composer" className="scroll-mt-24">
              <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((value) => value + 1)} />
            </div>
            <DiscussionFeed
              key={feedRefreshKey}
              hideComposer
              title="站内流转"
              limit={8}
            />
          </div>

          <aside className="hidden w-[320px] shrink-0 xl:block">
            <div className="sticky top-24 space-y-5">
              <HotTopicsPanel onTopicClick={handleTopicClick} />

              <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  群内同步入口
                </p>
                <p className="mt-3 text-lg font-black tracking-tight">群号 602190132</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  扫码或搜索群号加入，先同步，再回流。
                </p>
              </div>

              <UserRankPanel />
            </div>
          </aside>
        </div>

        {mobilePanel === "hot" && (
          <div className="mt-5 space-y-5 xl:hidden">
            <HotTopicsPanel onTopicClick={handleTopicClick} />
            <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                群内同步入口
              </p>
              <p className="mt-3 text-lg font-black tracking-tight">群号 602190132</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                扫码或搜索群号加入，先同步，再回流。
              </p>
              <div className="mt-4">
                <QqGroupModalButton />
              </div>
            </div>
          </div>
        )}
        {mobilePanel === "rank" && (
          <div className="mt-5 xl:hidden">
            <UserRankPanel />
          </div>
        )}
      </section>
    </main>
  );
}
