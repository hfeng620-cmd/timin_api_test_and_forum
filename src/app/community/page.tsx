"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
  "短反馈",
  "长主题",
  "急同步",
];

const ambientOrbs = [
  "left-[6%] top-16 h-56 w-56 bg-[var(--color-brand-soft)] opacity-70 animate-[pulse_8s_ease-in-out_infinite]",
  "right-[8%] top-28 h-64 w-64 bg-[var(--color-panel-glow)] opacity-55 animate-[pulse_10s_ease-in-out_infinite]",
  "left-[44%] top-[420px] h-72 w-72 bg-[var(--color-soft)] opacity-75 animate-[pulse_12s_ease-in-out_infinite]",
];

export default function CommunityPage() {
  const { isAdmin } = useForumAuth();
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"hot" | "rank" | null>(null);
  const [feedbackCard, discussionsCard, qqCard] = collaborationCards;
  const heroRef = useRef<HTMLDivElement | null>(null);
  const deskRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [revealedSections, setRevealedSections] = useState<Record<string, boolean>>({
    hero: false,
    desk: false,
    content: false,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches || !("IntersectionObserver" in window)) {
      setRevealedSections({ hero: true, desk: true, content: true });
      return;
    }

    const entries = [
      { key: "hero", node: heroRef.current },
      { key: "desk", node: deskRef.current },
      { key: "content", node: contentRef.current },
    ].filter((entry): entry is { key: "hero" | "desk" | "content"; node: HTMLDivElement } => Boolean(entry.node));

    const observer = new IntersectionObserver(
      (items) => {
        items.forEach((item) => {
          if (!item.isIntersecting) return;
          const key = item.target.getAttribute("data-reveal-key");
          if (!key) return;
          setRevealedSections((current) =>
            current[key] ? current : { ...current, [key]: true },
          );
          observer.unobserve(item.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -2% 0px" },
    );

    entries.forEach(({ key, node }) => {
      node.setAttribute("data-reveal-key", key);
      observer.observe(node);
    });

    // Safety fallback: reveal all sections after 1.5s if observer doesn't fire
    const fallbackTimer = setTimeout(() => {
      setRevealedSections({ hero: true, desk: true, content: true });
    }, 1500);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleTopicClick = useCallback((postId: string) => {
    const el = document.getElementById(postId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <main className="theme-stage relative min-h-screen overflow-hidden bg-transparent text-[var(--color-ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[760px] bg-[radial-gradient(circle_at_10%_8%,var(--color-brand-soft),transparent_32%),radial-gradient(circle_at_88%_14%,var(--color-panel-glow),transparent_30%),linear-gradient(180deg,var(--color-header),transparent_74%)] opacity-80"
      />
      {ambientOrbs.map((orb) => (
        <div
          key={orb}
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-full blur-3xl motion-reduce:animate-none ${orb}`}
        />
      ))}
      <section className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
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

            <OnlineIndicator />
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-3 py-4 sm:px-6 lg:px-10">
        <div
          ref={heroRef}
          className={`relative mb-5 overflow-hidden rounded-[36px] border border-[var(--color-line)] bg-[linear-gradient(145deg,var(--color-panel),var(--color-brand-soft)_54%,var(--color-panel))] shadow-[0_28px_90px_rgba(15,23,42,0.1)] transition-[opacity,transform] duration-700 ease-out motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
            revealedSections.hero ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-panel-glow),transparent_28%),radial-gradient(circle_at_18%_18%,var(--color-soft),transparent_24%),linear-gradient(180deg,transparent,var(--color-header))] opacity-70"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-panel),transparent)]"
          />
          <div className="relative grid gap-5 px-5 py-6 sm:px-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-stretch lg:px-8 lg:py-9">
            <div className="flex min-h-[420px] flex-col justify-between rounded-[28px] border border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-panel)_82%,transparent)] p-5 shadow-[0_18px_44px_rgba(15,23,42,0.07)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-[var(--color-brand-deep)] shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                  Forum Gate
                </span>
                <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  3 个入口
                </span>
              </div>
              <div className="py-7">
                <h1 className="max-w-xl text-3xl font-black tracking-tight sm:text-4xl lg:text-[3.6rem] lg:leading-[1.02]">
                  先选入口，再开始讨论。
                </h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-[var(--color-muted)] sm:text-[15px] sm:leading-7">
                  站内接短反馈，Discussions 沉淀专题，QQ 群处理急同步。
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {decisionRules.map((rule, index) => (
                  <span
                    key={rule}
                    className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-2 text-xs font-black text-[var(--color-brand-deep)]"
                  >
                    0{index + 1} / {rule}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                className={`group flex min-h-[210px] flex-col justify-between rounded-[26px] border px-5 py-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] motion-reduce:hover:translate-y-0 sm:col-span-2 lg:min-h-0 ${feedbackCard.accent}`}
                href={feedbackCard.href}
              >
                <div className="max-w-xl">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${feedbackCard.badge}`}
                  >
                    {feedbackCard.id}
                  </span>
                  <p className="mt-4 text-2xl font-black">{feedbackCard.title}</p>
                  <p className="mt-2 text-sm leading-6 opacity-90">{feedbackCard.summary}</p>
                </div>
                <p className="mt-6 text-sm font-black">
                  {feedbackCard.actionLabel} <span aria-hidden>→</span>
                </p>
              </Link>

              <a
                className={`group flex min-h-[188px] flex-col justify-between rounded-[26px] border px-5 py-5 transition duration-300 hover:-translate-y-1 hover:border-[var(--color-brand)] hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] motion-reduce:hover:translate-y-0 ${discussionsCard.accent}`}
                href={discussionsCard.href}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${discussionsCard.badge}`}
                  >
                    {discussionsCard.id}
                  </span>
                  <p className="mt-4 text-xl font-black">{discussionsCard.title}</p>
                  <p className="mt-2 text-sm leading-6 opacity-85">{discussionsCard.summary}</p>
                </div>
                <p className="mt-6 text-sm font-black">
                  {discussionsCard.actionLabel} <span aria-hidden>→</span>
                </p>
              </a>

              <Link
                id="qq-group-entry"
                className={`group flex min-h-[188px] flex-col justify-between rounded-[26px] border px-5 py-5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_44px_rgba(15,23,42,0.12)] motion-reduce:hover:translate-y-0 ${qqCard.accent}`}
                href={qqCard.href}
              >
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-black tracking-[0.18em] ${qqCard.badge}`}
                  >
                    {qqCard.id}
                  </span>
                  <p className="mt-4 text-xl font-black">{qqCard.title}</p>
                  <p className="mt-2 text-sm leading-6 opacity-90">{qqCard.summary}</p>
                </div>
                <p className="mt-6 text-sm font-black">
                  {qqCard.actionLabel} <span aria-hidden>→</span>
                </p>
              </Link>
            </div>
          </div>
        </div>

        <div
          ref={deskRef}
          className={`mb-4 rounded-[28px] border border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.94))] px-4 py-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)] transition-[opacity,transform] duration-700 ease-out delay-75 motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
            revealedSections.desk ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                Discussion Desk
              </p>
              <p className="mt-2 text-lg font-black tracking-tight text-[var(--color-ink)]">
                先把站内短反馈处理掉，再转长期讨论区。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="rounded-[16px] bg-[var(--color-brand)] px-4 py-3 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_12px_24px_var(--color-panel-glow)]"
                href="#community-composer"
              >
                发站内反馈
              </Link>
              <a
                className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.discussions}
                rel="noopener noreferrer"
                target="_blank"
              >
                去 Discussions
              </a>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-[var(--color-muted)]">
            {decisionRules.map((rule) => (
              <span
                key={rule}
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5"
              >
                {rule}
              </span>
            ))}
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

        <div
          ref={contentRef}
          className={`xl:flex xl:gap-6 transition-[opacity,transform] duration-700 ease-out delay-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 ${
            revealedSections.content ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
        >
          <div className="min-w-0 flex-1 space-y-5">
            <div id="community-composer" className="scroll-mt-24">
              <CommunityPostPanel onPostCreated={() => setFeedRefreshKey((value) => value + 1)} />
            </div>
            <DiscussionFeed
              key={feedRefreshKey}
              hideComposer
              title="讨论工作台"
              limit={8}
            />
          </div>

          <aside className="hidden w-[320px] shrink-0 xl:block">
            <div className="sticky top-24 space-y-5">
              <HotTopicsPanel onTopicClick={handleTopicClick} />
              <UserRankPanel />
            </div>
          </aside>
        </div>

        {mobilePanel === "hot" && (
          <div className="mt-5 xl:hidden">
            <HotTopicsPanel onTopicClick={handleTopicClick} />
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
