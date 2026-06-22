import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import {
  collaborationSteps,
  contributionTasks,
  communityPosts,
  demoVideos,
  featuredColumns,
  guideSteps,
  highlightMetrics,
  pendingVerifications,
  resourceLinks,
  stationSnapshots,
  tickerItems,
  updateBoard,
} from "@/lib/site-data";

export default function Home() {
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
                先看数据，再看口碑，再决定用谁。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1 md:flex">
              <span className="rounded-full bg-[var(--color-ink)] px-4 py-2 text-sm font-semibold text-white">
                首页
              </span>
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/stations"
              >
                中转站榜单
              </Link>
              <span className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)]">
                经验讨论
              </span>
            </nav>
          </div>
        </div>

        <div className="border-t border-[var(--color-line)] bg-[var(--color-soft)]">
          <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-6 py-3 text-sm whitespace-nowrap text-[var(--color-muted)] lg:px-10">
            <span className="font-semibold text-[var(--color-ink)]">站点速报</span>
            {tickerItems.map((item) => (
              <span key={item.label} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:px-10">
        <div className="space-y-8">
          <div className="max-w-4xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--color-muted)] shadow-[0_10px_30px_rgba(13,25,48,0.06)] ring-1 ring-[var(--color-line)]">
              <span className="rounded-full bg-[var(--color-brand-soft)] px-2 py-0.5 text-xs font-bold text-[var(--color-brand-deep)]">
                新
              </span>
              先把你这批真实中转站集合挂上来，再慢慢补实测和共建
            </div>
            <h1 className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl">
              挑选靠谱的中转站，
              <br />
              不再靠群里刷屏碰运气
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--color-muted)]">
              首页负责讨论、经验分享和避坑沉淀；真正的核心入口只有一个，进入中转站榜单后直接按价格、倍率、特殊口径、试用入口和社区备注做判断。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="rounded-[30px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                快速判断
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {guideSteps.map((step) => (
                  <article
                    key={step.title}
                    className="rounded-3xl bg-[var(--color-soft)] p-4"
                  >
                    <p className="text-sm font-bold text-[var(--color-brand-deep)]">
                      {step.index}
                    </p>
                    <h2 className="mt-2 text-lg font-bold">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <Link
              href="/stations"
              className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-8 py-4 text-lg font-bold text-white shadow-[0_16px_40px_var(--color-panel-glow)] transition hover:translate-y-[-1px] hover:bg-[var(--color-brand-deep)]"
            >
              进入中转站入口
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            {highlightMetrics.map((metric) => (
              <article
                key={metric.label}
                className="rounded-[28px] border border-[var(--color-line)] bg-white p-5 shadow-[0_14px_40px_rgba(13,25,48,0.05)]"
              >
                <p className="text-sm text-[var(--color-muted)]">{metric.label}</p>
                <p className="mt-3 text-3xl font-black tracking-tight">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  {metric.note}
                </p>
              </article>
            ))}
          </div>

          <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              今日更新看板
            </p>
            <h2 className="mt-2 text-3xl font-black">今天社区又补了什么</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {updateBoard.map((item, index) => (
                <article
                  key={item}
                  className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                >
                  <p className="text-sm font-bold text-[var(--color-brand-deep)]">
                    更新 {index + 1}
                  </p>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {item}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[30px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  今日快览
                </p>
                <h2 className="mt-2 text-2xl font-black">榜单侧重点</h2>
              </div>
              <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                实测样例
              </span>
            </div>

            <div className="mt-5 space-y-4">
              {stationSnapshots.map((station) => (
                <article
                  key={station.name}
                  className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-soft)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{station.name}</h3>
                      <p className="mt-1 text-sm text-[var(--color-muted)]">
                        {station.group}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {station.tag}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[var(--color-muted)]">价格</p>
                      <p className="mt-1 font-bold">{station.price}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted)]">倍率</p>
                      <p className="mt-1 font-bold">{station.multiplier}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted)]">在线率</p>
                      <p className="mt-1 font-bold">{station.uptime}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted)]">延迟</p>
                      <p className="mt-1 font-bold">{station.latency}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              快速入口
            </p>
            <h2 className="mt-2 text-2xl font-black">先试再决定</h2>
            <div className="mt-5 space-y-4">
              {resourceLinks.map((link) => (
                <article
                  key={link.title}
                  className="rounded-3xl border border-[var(--color-line)] bg-[var(--color-soft)] p-4"
                >
                  <a
                    className="text-base font-bold text-[var(--color-brand-deep)]"
                    href={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {link.title}
                  </a>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    {link.note}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-10 lg:px-10">
        <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                演示视频
              </p>
              <h2 className="mt-2 text-3xl font-black">这里留给你后面自己放录屏</h2>
            </div>
            <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
              可替换占位区
            </span>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {demoVideos.map((video) => (
              <article
                key={video.title}
                className="rounded-[28px] border border-dashed border-[var(--color-line)] bg-[var(--color-soft)] p-5"
              >
                <div className="flex aspect-video items-center justify-center rounded-[22px] bg-white text-center shadow-[inset_0_0_0_1px_var(--color-line)]">
                  <div>
                    <p className="text-sm font-bold text-[var(--color-brand-deep)]">
                      {video.title}
                    </p>
                    <p className="mt-2 px-6 text-sm text-[var(--color-muted)]">
                      你后面把录好的演示视频替换到这里
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
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  社区讨论
                </p>
                <h2 className="mt-2 text-3xl font-black">大家真正会聊什么</h2>
              </div>
              <div className="inline-flex rounded-full bg-[var(--color-soft)] p-1">
                <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-white">
                  精选经验
                </span>
                <span className="px-4 py-2 text-sm font-semibold text-[var(--color-muted)]">
                  最新讨论
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-4">
              {communityPosts.map((post) => (
                <article
                  key={post.title}
                  className="rounded-[28px] border border-[var(--color-line)] p-5 transition hover:border-[var(--color-brand)] hover:bg-[var(--color-soft)]"
                >
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 font-semibold text-[var(--color-brand-deep)]">
                      {post.category}
                    </span>
                    <span className="text-[var(--color-muted)]">{post.meta}</span>
                  </div>
                  <h3 className="mt-4 text-xl font-bold">{post.title}</h3>
                  <p className="mt-3 max-w-3xl leading-7 text-[var(--color-muted)]">
                    {post.summary}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                新手入口
              </p>
              <h2 className="mt-2 text-2xl font-black">第一次来先看这 4 件事</h2>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-[var(--color-muted)]">
                <li>价格：你实际充值后每种模型大概花多少钱。</li>
                <li>倍率：同样用量是不是被放大收费。</li>
                <li>可用性：高峰期会不会掉线、报错、限流。</li>
                <li>模型支持：你要的模型能不能稳定用上。</li>
              </ul>
            </div>

            <div className="rounded-[30px] border border-[var(--color-line)] bg-[linear-gradient(140deg,#102548,#1d4ed8)] p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.18)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                协作维护
              </p>
              <h2 className="mt-2 text-2xl font-black">号召大家一起把它做起来</h2>
              <p className="mt-4 text-sm leading-7 text-white/85">
                你群里愿意帮忙的人，不需要后台权限也能一起共建。讨论走
                Discussions，收录走 Issues，最终入库走 PR。
              </p>
              <div className="mt-5 space-y-3">
                {collaborationSteps.map((step) => (
                  <div
                    key={step.title}
                    className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur"
                  >
                    <p className="font-bold">{step.title}</p>
                    <p className="mt-1 text-sm text-white/75">{step.description}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/stations"
                className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
              >
                先看核心榜单页
              </Link>
            </div>

            <div className="rounded-[30px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                待补实测
              </p>
              <h2 className="mt-2 text-2xl font-black">这些站还缺第一手反馈</h2>
              <div className="mt-5 space-y-3">
                {pendingVerifications.map((item) => (
                  <article
                    key={item.name}
                    className="rounded-2xl bg-[var(--color-soft)] px-4 py-4"
                  >
                    <p className="font-bold">{item.name}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {item.need}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              如何贡献
            </p>
            <h2 className="mt-2 text-3xl font-black">现在就能帮上的 4 件小事</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
              不会写代码也能贡献，先提线索和补证据就很有价值。
            </p>
            <div className="mt-6 grid gap-3">
              {contributionTasks.map((task) => (
                <div
                  key={task}
                  className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 text-sm font-semibold text-[var(--color-ink)]"
                >
                  {task}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              后续专题
            </p>
            <h2 className="mt-2 text-3xl font-black">可以继续扩成这些内容板块</h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {featuredColumns.map((column) => (
                <article
                  key={column.title}
                  className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                >
                  <h3 className="text-lg font-bold">{column.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {column.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
