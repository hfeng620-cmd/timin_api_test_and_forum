import Link from "next/link";

import { NotificationBell } from "@/components/notification-bell";
import {
  collaborationChannels,
  faqEntries,
  guideCards,
  guideSteps,
  resourceLinks,
} from "@/lib/site-data";

export default function GuidesPage() {
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
              <p className="text-sm text-[var(--color-muted)]">常见问题与更多指南</p>
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
                更多指南
              </span>
            </nav>
            <NotificationBell />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                先看这几个
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                先把第一次最容易问错的事讲清楚
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                首页先负责给你看榜单，这里负责把倍率怎么看、同站不同模型怎么拆、免费入口怎么判断，以及 QQ 群和 GitHub 共建入口分别拿来做什么说清楚。
              </p>
            </div>

            <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                先按这个顺序看
              </p>
              <div className="mt-5 grid gap-4">
                {guideSteps.map((step) => (
                  <article
                    key={step.index}
                    className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                      {step.index}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{step.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                新手指南
              </p>
              <div className="mt-5 grid gap-4">
                {guideCards.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <h2 className="text-xl font-bold">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--color-line)] bg-[var(--color-soft)] p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                试用入口
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                这几条入口更适合先试水，再结合群友反馈判断要不要长期用。
              </p>
              <div className="mt-4 grid gap-3">
                {resourceLinks.map((item) => (
                  item.href.startsWith("http") ? (
                    <a
                      key={item.title}
                      className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 transition hover:border-[var(--color-brand)]"
                      href={item.href}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <p className="font-bold text-[var(--color-brand-deep)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                    </a>
                  ) : (
                    <Link
                      key={item.title}
                      className="rounded-2xl border border-[var(--color-line)] bg-white px-4 py-4 transition hover:border-[var(--color-brand)]"
                      href={item.href}
                    >
                      <p className="font-bold text-[var(--color-brand-deep)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                    </Link>
                  )
                ))}
              </div>
            </div>

            <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                共建入口
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                这站不是只读榜单。QQ 群负责第一时间发线索，Discussions 负责沉淀经验讨论，Issues 负责提交明确纠错，管理员审核后再把正式口径收进榜单。
              </p>
              <div className="mt-4 grid gap-3">
                {collaborationChannels.map((item) => (
                  <a
                    key={item.title}
                    className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 transition hover:border-[var(--color-brand)]"
                    href={item.href}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                  >
                    <p className="font-bold text-[var(--color-brand-deep)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {item.note}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--color-line)] bg-white p-6 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              常见问题
            </p>
            <div className="mt-5 space-y-4">
              {faqEntries.map((item) => (
                <article
                  key={item.question}
                  className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                >
                  <h2 className="text-lg font-bold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {item.answer}
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
