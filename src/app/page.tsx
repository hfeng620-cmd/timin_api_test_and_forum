import Link from "next/link";

import { QqGroupModalButton } from "@/components/qq-group-modal-button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  faqPreview,
  forumHighlights,
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
      <section className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-white shadow-[0_12px_40px_var(--color-panel-glow)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timin观察站</p>
              <p className="text-sm text-[var(--color-muted)]">
                先看榜单，再决定长期用谁。
              </p>
            </div>
            <div className="hidden lg:block">
              <QqGroupModalButton />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <nav className="hidden items-center gap-8 text-sm font-semibold text-[var(--color-muted)] lg:flex">
              <span className="text-[var(--color-ink)]">首页</span>
              <Link className="transition hover:text-[var(--color-ink)]" href="/stations">
                中转站榜单
              </Link>
              <Link className="transition hover:text-[var(--color-ink)]" href="/community">
                论坛入口
              </Link>
              <Link className="transition hover:text-[var(--color-ink)]" href="/guides">
                更多指南
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] bg-white/70">
          <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-3 text-sm whitespace-nowrap text-[var(--color-muted)] lg:px-10">
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
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.32fr_0.68fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-brand-deep)]">
                API Relay Index
              </p>
              <h1 className="mt-6 max-w-5xl text-5xl font-black tracking-[-0.06em] text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
                各大中转站榜单，
                <br />
                进来先看表。
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--color-muted)]">
                这一版首页不再先讲概念，直接把你最想先看的站点放在第一屏。价格、倍率、试用入口和社区备注先给到，再决定要不要继续往下看更多站点和讨论。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/stations"
                  className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
                >
                  直接看完整榜单
                </Link>
                <Link
                  href="/community"
                  className="rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                >
                  去讨论区发帖
                </Link>
                <div className="lg:hidden">
                  <QqGroupModalButton />
                </div>
              </div>

              <div className="mt-10 flex flex-wrap gap-4">
                <div className="min-w-36 border-l-2 border-[var(--color-brand)] pl-4">
                  <p className="text-sm text-[var(--color-muted)]">优先关注</p>
                  <p className="mt-1 text-2xl font-black">4 个主站</p>
                </div>
                <div className="min-w-36 border-l-2 border-[var(--color-line)] pl-4">
                  <p className="text-sm text-[var(--color-muted)]">最低已知倍率</p>
                  <p className="mt-1 text-2xl font-black">0.058x</p>
                </div>
                <div className="min-w-36 border-l-2 border-[var(--color-line)] pl-4">
                  <p className="text-sm text-[var(--color-muted)]">试用 / 免费入口</p>
                  <p className="mt-1 text-2xl font-black">4+</p>
                </div>
              </div>
            </div>

            <div className="grid content-start gap-8 border-t border-[var(--color-line)] pt-8 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  三个入口
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">榜单、讨论和加群各走各的，不再混在一起</h2>
                <div className="mt-5 space-y-4">
                  <Link
                    href="/stations"
                    className="block border-b border-[var(--color-line)] pb-4 transition hover:border-[var(--color-brand)]"
                  >
                    <p className="text-lg font-black text-[var(--color-ink)]">先看榜单</p>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted)]">
                      价格、倍率、模型口径和一句判断先在榜单里横向比较。
                    </p>
                  </Link>
                  <Link
                    href="/community"
                    className="block border-b border-[var(--color-line)] pb-4 transition hover:border-[var(--color-brand)]"
                  >
                    <p className="text-lg font-black text-[var(--color-ink)]">再进讨论区</p>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted)]">
                      价格变化、避坑、活动失效和高峰稳定性统一进帖子流继续补。
                    </p>
                  </Link>
                  <div className="border-b border-[var(--color-line)] pb-4">
                    <p className="text-lg font-black text-[var(--color-ink)]">即时协作走 QQ 群</p>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted)]">
                      群里负责线索流和实时反馈，站里负责定稿流和正式收录。
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-[var(--color-line)] pt-8">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  快捷入口
                </p>
                <div className="mt-4 space-y-4">
                  {resourceLinks.map((link) => (
                    link.href.startsWith("http") ? (
                      <a
                        key={link.title}
                        className="block border-b border-[var(--color-line)] pb-4 transition hover:border-[var(--color-brand)]"
                        href={link.href}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <p className="text-lg font-black text-[var(--color-ink)]">{link.title}</p>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted)]">
                          {link.note}
                        </p>
                      </a>
                    ) : (
                      <Link
                        key={link.title}
                        className="block border-b border-[var(--color-line)] pb-4 transition hover:border-[var(--color-brand)]"
                        href={link.href}
                      >
                        <p className="text-lg font-black text-[var(--color-ink)]">{link.title}</p>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-[var(--color-muted)]">
                          {link.note}
                        </p>
                      </Link>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 overflow-hidden rounded-[34px] border border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(244,248,255,0.92))] shadow-[var(--shadow-card)]">
            <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
              <div className="px-6 py-6 lg:px-8 lg:py-7">
                <div className="grid grid-cols-[0.55fr_1fr_0.95fr_0.75fr_1.35fr] border-b border-[var(--color-line)] pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-muted)]">
                  <span>排名</span>
                  <span>站点</span>
                  <span>价格</span>
                  <span>倍率</span>
                  <span>一句判断</span>
                </div>

                <div className="mt-1">
                  {topRows.map((row, index) => (
                    <article
                      key={`${row.name}-${index}`}
                      className="grid grid-cols-[0.55fr_1fr_0.95fr_0.75fr_1.35fr] items-start gap-4 border-b border-[var(--color-line)] py-5 transition hover:bg-white/70"
                    >
                      <span className="pt-1 text-sm font-bold text-[var(--color-muted)]">
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black">{row.name}</h3>
                          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                            {row.badge}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
                      </div>
                      <div>
                        <p className="text-base font-black">{row.price}</p>
                        <a
                          className="mt-2 inline-flex text-sm leading-6 text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                          href={stationLinkMap[row.name]}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {row.entry}
                        </a>
                      </div>
                      <p className="pt-1 text-base font-black">{row.multiplier}</p>
                      <div>
                        <p className="text-base font-black">{row.verdict}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{row.note}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <aside className="border-t border-[var(--color-line)] bg-white/72 px-6 py-6 lg:border-t-0 lg:border-l lg:px-8 lg:py-7">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  首屏入口
                </p>
                <div className="mt-4 space-y-5">
                  <div className="border-b border-[var(--color-line)] pb-5">
                    <p className="text-sm text-[var(--color-muted)]">推荐路径</p>
                    <p className="mt-1 text-2xl font-black">先看榜单，再进社区，再进群协作。</p>
                  </div>
                  <div className="border-b border-[var(--color-line)] pb-5">
                    <p className="text-sm text-[var(--color-muted)]">群协作</p>
                    <p className="mt-1 text-base font-black">QQ群 602190132</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      实时线索、试用活动、站点失效和高峰表现先在群里同步。
                    </p>
                  </div>
                  <div className="border-b border-[var(--color-line)] pb-5">
                    <p className="text-sm text-[var(--color-muted)]">长讨论沉淀</p>
                    <a
                      className="mt-1 inline-flex text-base font-black text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                      href="https://github.com/hfeng620-cmd/api_test_and_forum/discussions"
                      rel="noreferrer"
                      target="_blank"
                    >
                      打开 GitHub Discussions
                    </a>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      适合把群里的高质量结论整理成长帖和公开共识。
                    </p>
                  </div>
                  <div>
                    <Link
                      href="/stations"
                      className="inline-flex rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
                    >
                      查看完整榜单
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)]">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
          <div>
            <div className="flex items-end justify-between gap-6 border-b border-[var(--color-line)] pb-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                  更多中转站
                </p>
                <h2 className="mt-3 text-3xl font-black tracking-tight">继续往下看剩余站点</h2>
              </div>
              <Link
                href="/stations"
                className="inline-flex items-center text-sm font-bold text-[var(--color-brand-deep)]"
              >
                更多中转站 →
              </Link>
            </div>
            <div className="mt-3">
              {moreRows.map((row, index) => (
                <article
                  key={`${row.name}-extended-${index}`}
                  className="grid gap-3 border-b border-[var(--color-line)] py-5 md:grid-cols-[0.9fr_0.9fr_0.6fr_1.4fr]"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-black">{row.name}</h3>
                      <span className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                        {row.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
                  </div>
                  <div>
                    <p className="font-black">{row.price}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {row.packageType}
                    </p>
                  </div>
                  <p className="font-black">{row.multiplier}</p>
                  <p className="text-sm leading-6 text-[var(--color-muted)]">{row.note}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="grid content-start gap-10">
            <div>
              <div className="flex items-end justify-between gap-4 border-b border-[var(--color-line)] pb-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                    常见问题
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-tight">先看这两个问题</h2>
                </div>
                <Link
                  href="/guides"
                  className="text-sm font-bold text-[var(--color-brand-deep)]"
                >
                  更多问题 →
                </Link>
              </div>
              <div className="mt-4 space-y-5">
                {faqPreview.map((item) => (
                  <article key={item.question} className="border-b border-[var(--color-line)] pb-5">
                    <h3 className="text-xl font-black">{item.question}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {item.answer}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="border-t border-[var(--color-line)] pt-8">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-muted)]">
                社区重点
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-[var(--color-muted)]">
                {forumHighlights.map((item) => (
                  <span key={item.title}>{item.title}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
