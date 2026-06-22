import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { demoVideos, stationComparisonRows } from "@/lib/site-data";

const filters = [
  "全部站点",
  "可试用",
  "低倍率",
  "多档位",
  "卡制",
  "待核验",
  "特殊入口",
];

const sorts = ["精选", "价格最低", "倍率最低", "试用优先", "口径清楚", "社区备注"];

export default function StationsPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-white shadow-[0_10px_30px_var(--color-panel-glow)]">
              Z
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timin观察站</p>
              <p className="text-sm text-[var(--color-muted)]">
                中转站价格、倍率、口径与社区备注入口
              </p>
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
              <span className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-white">
                中转站榜单
              </span>
            </nav>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
        <div className="rounded-[36px] border border-[var(--color-line)] bg-white p-7 shadow-[0_18px_60px_rgba(13,25,48,0.08)]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-sm font-bold text-[var(--color-brand-deep)]">
                单一核心入口
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                先看价格口径，再看社区备注
              </h1>
              <p className="mt-4 text-lg leading-8 text-[var(--color-muted)]">
                这页不把所有站硬压成一个统一指标，而是把入口、套餐类型、倍率、试用方式和风险备注拆开给你看。适合这批真实中转站数据，也更适合后面让群友一起补。
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] bg-[var(--color-soft)] px-5 py-4">
                <p className="text-sm text-[var(--color-muted)]">当前最低倍率</p>
                <p className="mt-2 text-3xl font-black">0.01x</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  来自 viptoken 站，但仍要继续核验口径和实际可用性
                </p>
              </div>
              <div className="rounded-[26px] bg-[var(--color-soft)] px-5 py-4">
                <p className="text-sm text-[var(--color-muted)]">当前最值钱的信息</p>
                <p className="mt-2 text-3xl font-black">试用入口</p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  新来的人先别急着充值，先试再决定长期用谁
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  站点关键词
                </span>
                <input
                  className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                  defaultValue="虎虎 / Aether / viptoken / xiaoya"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  口径类型
                </span>
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 font-medium">
                  试用入口 / 低倍率 / 多档位
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-[var(--color-muted)]">
                  侧重点
                </span>
                <div className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 font-medium">
                  新手先试 + 口径清楚
                </div>
              </label>
              <button className="self-end rounded-full bg-[var(--color-brand)] px-7 py-3.5 text-base font-bold text-white shadow-[0_14px_36px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)]">
                开始筛选
              </button>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {filters.map((filter, index) => (
                <span
                  key={filter}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-[var(--color-brand)] text-white"
                      : "bg-white text-[var(--color-muted)] ring-1 ring-[var(--color-line)]"
                  }`}
                >
                  {filter}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-10">
        <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                演示视频
              </p>
              <h2 className="mt-2 text-3xl font-black">这里同样给你留了录屏展示区</h2>
            </div>
            <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
              榜单演示占位
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {demoVideos.map((video) => (
              <article
                key={`${video.title}-stations`}
                className="rounded-[28px] border border-dashed border-[var(--color-line)] bg-[var(--color-soft)] p-5"
              >
                <div className="flex aspect-video items-center justify-center rounded-[22px] bg-white text-center shadow-[inset_0_0_0_1px_var(--color-line)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-brand-deep)]">
                      {video.title}
                    </p>
                    <p className="mt-2 px-6 text-sm text-[var(--color-muted)]">
                      后面可替换成榜单页操作视频
                    </p>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-bold">{video.subtitle}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  {video.note}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
        <div className="rounded-[36px] border border-[var(--color-line)] bg-white p-7 shadow-[0_18px_60px_rgba(13,25,48,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                中转站比较
              </p>
              <h2 className="mt-2 text-3xl font-black">入口、套餐口径、倍率和社区备注一眼横向对齐</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {sorts.map((sort, index) => (
                <span
                  key={sort}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    index === 0
                      ? "bg-[var(--color-ink)] text-white"
                      : "bg-[var(--color-soft)] text-[var(--color-muted)]"
                  }`}
                >
                  {sort}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-7 overflow-hidden rounded-[28px] border border-[var(--color-line)]">
            <div className="grid grid-cols-[1.05fr_1fr_0.9fr_0.8fr_0.8fr_1.25fr] bg-[var(--color-soft)] px-5 py-4 text-sm font-bold text-[var(--color-muted)]">
              <span>站点</span>
              <span>入口/域名</span>
              <span>套餐类型</span>
              <span>标称价格</span>
              <span>倍率展示</span>
              <span>状态与备注</span>
            </div>

            {stationComparisonRows.map((row, index) => (
              <article
                key={row.name}
                className={`grid grid-cols-[1.05fr_1fr_0.9fr_0.8fr_0.8fr_1.25fr] items-center px-5 py-5 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#f9fbfe]"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {row.badge}
                    </span>
                    <h3 className="font-bold">{row.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-[var(--color-muted)]">{row.group}</p>
                </div>
                <div className="text-sm leading-6 text-[var(--color-muted)]">
                  {row.entry}
                </div>
                <div>
                  <p className="font-bold">{row.packageType}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{row.models}</p>
                </div>
                <div className="font-bold">{row.price}</div>
                <div className="font-bold">{row.multiplier}</div>
                <div>
                  <p className="font-bold">{row.status}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">{row.note}</p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {stationComparisonRows.slice(0, 3).map((row) => (
              <article
                key={`${row.name}-detail`}
                className="rounded-[30px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black">{row.name}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                    {row.badge}
                  </span>
                </div>
                <p className="mt-4 text-sm font-semibold text-[var(--color-brand-deep)]">
                  数据来源
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {row.source}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--color-brand-deep)]">
                  优点
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {row.advantage}
                </p>
                <p className="mt-4 text-sm font-semibold text-[var(--color-brand-deep)]">
                  风险点
                </p>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                  {row.risk}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
