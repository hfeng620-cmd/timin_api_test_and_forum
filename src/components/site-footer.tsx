"use client";

import Link from "next/link";

const footerLinks = [
  {
    label: "GitHub Discussions",
    href: "https://github.com/hfeng620-cmd/api_test_and_forum/discussions",
    external: true,
  },
  {
    label: "中转站榜单",
    href: "/stations",
    external: false,
  },
  {
    label: "社区讨论区",
    href: "/community",
    external: false,
  },
  {
    label: "常见问题",
    href: "/guides",
    external: false,
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-line)] bg-white/82 backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.25fr_0.75fr] lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-deep)]">
            Timin观察站
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-[var(--color-ink)]">
            榜单负责先给判断，社区负责持续纠偏，QQ群负责实时共建。
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
            这里不是单纯导航页，而是一个能持续更新价格、倍率、模型口径、试用入口和避坑结论的共建观察站。你可以直接发帖、进群报线索，也可以去 GitHub Discussions 留更完整的长讨论。
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              协作入口
            </p>
            <div className="mt-4 grid gap-3 text-sm">
              {footerLinks.map((item) =>
                item.external ? (
                  <a
                    key={item.label}
                    className="transition hover:text-[var(--color-brand-deep)]"
                    href={item.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.label}
                    className="transition hover:text-[var(--color-brand-deep)]"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              共建方式
            </p>
            <div className="mt-4 space-y-2 text-sm leading-7 text-[var(--color-muted)]">
              <p>QQ群：`602190132`</p>
              <p>适合先报价格变化、试用线索、失效活动和高峰期表现。</p>
              <p>站内发帖适合轻量同步，GitHub 更适合沉淀长期结论。</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
