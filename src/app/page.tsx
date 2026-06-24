import Link from "next/link";

import { AuthButton } from "@/components/auth-button";
import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import { StationRowLink } from "@/components/station-row-link";
import {
  prioritizedStationNames,
  resourceLinks,
  stationComparisonRows,
  stationLinkMap,
  tickerItems,
} from "@/lib/site-data";

export default function Home() {
  type StationRow = (typeof stationComparisonRows)[number];
  const topRows = prioritizedStationNames
    .map((name) => stationComparisonRows.find((row) => row.name === name))
    .filter((row): row is StationRow => Boolean(row));
  const moreRows = stationComparisonRows.filter(
    (row) => !prioritizedStationNames.includes(row.name),
  );

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <style>{`
        @keyframes logo-pulse {
          0%, 100% { box-shadow: 0 10px 30px var(--color-panel-glow); }
          50% { box-shadow: 0 14px 38px var(--color-panel-glow); }
        }
        @keyframes ticker-slide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .logo-pulse {
          animation: logo-pulse 2.4s ease-in-out infinite;
        }
        .ticker-enter {
          animation: ticker-slide 480ms 200ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .stagger-in:nth-child(5) { animation-delay: 160ms; }
        .stagger-in:nth-child(6) { animation-delay: 200ms; }
        .stagger-in:nth-child(7) { animation-delay: 240ms; }
        .stagger-in:nth-child(8) { animation-delay: 280ms; }
        @media (prefers-reduced-motion: reduce) {
          .logo-pulse, .ticker-enter { animation: none; }
        }
      `}</style>
      <section className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="logo-pulse flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timin观察站</p>
              <p className="text-sm text-[var(--color-muted)]">
                先看榜单，再决定长期用谁。
              </p>
            </div>
            <div className="hidden lg:block hover:scale-105 transition-transform">
              <QqGroupModalButton />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-8 text-sm font-semibold text-[var(--color-muted)] lg:flex">
              <span className="text-[var(--color-ink)]">首页</span>
              <Link className="link-underline transition hover:text-[var(--color-ink)]" href="/stations">
                中转站榜单
              </Link>
              <Link className="link-underline transition hover:text-[var(--color-ink)]" href="/community">
                论坛入口
              </Link>
              <Link className="link-underline transition hover:text-[var(--color-ink)]" href="/models">
                模型择优
              </Link>
              <Link className="link-underline transition hover:text-[var(--color-ink)]" href="/guides">
                更多指南
              </Link>
            </nav>
            <AuthButton />
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] bg-[var(--color-panel)]">
          <div className="ticker-enter mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-3 text-sm whitespace-nowrap text-[var(--color-muted)] lg:px-10">
            <span className="font-semibold text-[var(--color-ink)]">站点速报</span>
            {tickerItems.map((item) => (
              item.href.startsWith("http") ? (
                <a
                  key={item.label}
                  className="flex items-center gap-2 transition hover:text-[var(--color-ink)]"
                  href={item.href}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </a>
              ) : (
                <Link
                  key={item.label}
                  className="flex items-center gap-2 transition hover:text-[var(--color-ink)]"
                  href={item.href}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </Link>
              )
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[var(--color-line)]">
        <div className="surface-in mx-auto max-w-7xl px-6 py-8 lg:px-10 lg:py-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                中转站榜单
              </p>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                中转站榜单
              </h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/stations"
                className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-black text-[var(--color-on-brand)] shadow-[0_12px_28px_var(--color-panel-glow)] transition hover:scale-105 hover:bg-[var(--color-brand-deep)]"
              >
                查看完整榜单
              </Link>
              <Link
                href="/community"
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:scale-105 hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
              >
                进入社区讨论
              </Link>
              <div className="lg:hidden hover:scale-105 transition-transform">
                <QqGroupModalButton />
              </div>
            </div>
          </div>

          <div className="surface-in overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] shadow-[var(--shadow-card)]">
            <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="px-6 py-6 lg:px-8 lg:py-7">
                <div className="hidden grid-cols-[0.55fr_1fr_0.95fr_0.75fr_1.35fr] border-b border-[var(--color-line)] pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)] md:grid">
                  <span>排名</span>
                  <span>站点</span>
                  <span>价格</span>
                  <span>倍率</span>
                  <span>一句判断</span>
                </div>

                <div className="mt-1">
                  {topRows.map((row, index) => (
                    <StationRowLink
                      key={`${row.name}-${index}`}
                      href={stationLinkMap[row.name]}
                      className="stagger-in grid cursor-pointer gap-4 border-b border-[var(--color-line)] py-5 transition hover:bg-[var(--color-hover)] md:grid-cols-[0.55fr_1fr_0.95fr_0.75fr_1.35fr] md:items-start"
                    >
                      <div className="flex min-w-0 items-center justify-between gap-3 md:block">
                        <span className="text-sm font-bold text-[var(--color-muted)] md:pt-1">
                          {(index + 1).toString().padStart(2, "0")}
                        </span>
                        <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)] md:hidden">
                          {row.badge}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black">{row.name}</h3>
                          <span className="hidden text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-deep)] md:inline">
                            {row.badge}
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-black">{row.price}</p>
                        <p className="mt-2 truncate text-sm leading-6 text-[var(--color-brand-deep)]">{row.entry}</p>
                      </div>
                      <p className="min-w-0 truncate pt-1 text-base font-black">{row.multiplier}</p>
                      <div className="min-w-0">
                        <p className="truncate text-base font-black">{row.verdict}</p>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">{row.note}</p>
                      </div>
                    </StationRowLink>
                  ))}
                </div>
              </div>

              <aside className="border-t border-[var(--color-line)] bg-[var(--color-panel)] px-6 py-6 lg:border-t-0 lg:border-l lg:px-8 lg:py-7">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  社区入口
                </p>
                <div className="mt-4 space-y-5">
                  <div className="border-b border-[var(--color-line)] pb-5">
                    <p className="text-sm text-[var(--color-muted)]">站内讨论</p>
                    <p className="mt-1 text-2xl font-black">站点反馈、价格变化、试用线索</p>
                    <Link
                      href="/community"
                      className="mt-4 inline-flex rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-black text-[var(--color-on-brand)] transition hover:scale-105 hover:bg-[var(--color-brand-deep)]"
                    >
                      进入讨论区
                    </Link>
                  </div>
                  <div className="border-b border-[var(--color-line)] pb-5">
                    <p className="text-sm text-[var(--color-muted)]">QQ群</p>
                    <p className="mt-1 text-xl font-black">602190132</p>
                  </div>
                  <div className="border-b border-[var(--color-line)] pb-5">
                    <p className="text-sm text-[var(--color-muted)]">GitHub</p>
                    <a
                      className="mt-1 inline-flex text-base font-black text-[var(--color-brand-deep)] transition hover:scale-105 hover:text-[var(--color-brand)]"
                      href="https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions"
                      rel="noreferrer"
                      target="_blank"
                    >
                      打开 GitHub Discussions
                    </a>
                  </div>
                  <div className="space-y-3">
                    {resourceLinks.slice(0, 2).map((link) => (
                      <a
                        key={link.title}
                        className="block border-b border-[var(--color-line)] pb-3 transition hover:border-[var(--color-brand)]"
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <p className="text-base font-black text-[var(--color-ink)]">{link.title}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)] line-clamp-2">
                          {link.note}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)]">
        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
          <div className="flex items-end justify-between gap-6 border-b border-[var(--color-line)] pb-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                更多中转站
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">更多站点</h2>
            </div>
            <Link
              href="/stations"
              className="inline-flex items-center text-sm font-bold text-[var(--color-brand-deep)]"
            >
              完整榜单 →
            </Link>
          </div>
          <div className="mt-3">
            {moreRows.map((row, index) => (
              <article
                key={`${row.name}-extended-${index}`}
                className="stagger-in card-lift grid gap-3 border-b border-[var(--color-line)] py-5 transition hover:bg-[var(--color-hover)] md:grid-cols-[0.9fr_0.9fr_0.6fr_1.4fr]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-black">{row.name}</h3>
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                      {row.badge}
                    </span>
                  </div>
                  <p className="mt-2 truncate text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black">{row.price}</p>
                  <p className="mt-2 truncate text-sm leading-6 text-[var(--color-muted)]">
                    {row.packageType}
                  </p>
                </div>
                <p className="min-w-0 truncate font-black">{row.multiplier}</p>
                <p className="min-w-0 text-sm leading-6 text-[var(--color-muted)] line-clamp-2">{row.note}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}



