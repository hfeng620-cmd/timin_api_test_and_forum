"use client";

import Link from "next/link";

import { siteLinks } from "@/lib/site-links";

const footerLinks = [
  {
    label: "GitHub Discussions",
    href: siteLinks.discussions,
    external: true,
  },
  {
    label: "GitHub 仓库",
    href: siteLinks.repo,
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
  {
    label: "模型择优",
    href: "/models",
    external: false,
  },
  {
    label: "管理员",
    href: "/admin",
    external: false,
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-line)] bg-[var(--color-panel)] backdrop-blur">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[1fr_1fr] lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--color-brand-deep)]">
            Timix观察站
          </p>
          <h2 className="mt-3 max-w-2xl text-2xl font-black tracking-tight text-[var(--color-ink)]">
            中转站榜单与社区反馈。
          </h2>
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
              <p>QQ群：602190132</p>
              <a
                className="inline-flex font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                href={siteLinks.pages}
                rel="noreferrer"
                target="_blank"
              >
                打开线上站点
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
