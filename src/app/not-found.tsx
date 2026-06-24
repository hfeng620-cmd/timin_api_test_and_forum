import Link from "next/link";

import { siteLinks } from "@/lib/site-links";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-6 py-12 text-[var(--color-ink)] lg:px-10">
      <section className="mx-auto flex min-h-[70vh] max-w-5xl flex-col justify-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
          404 / 路径没找到
        </p>
        <h1 className="mt-5 max-w-3xl text-5xl font-black tracking-tight sm:text-6xl">
          这个入口可能还是旧仓库地址。
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
          Timix观察站已经迁到新的 GitHub Pages 路径。建议从首页、榜单页或 GitHub Discussions 重新进入。
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
            href="/"
          >
            回到首页
          </Link>
          <Link
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
            href="/stations"
          >
            打开榜单
          </Link>
          <a
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
            href={siteLinks.discussions}
            rel="noreferrer"
            target="_blank"
          >
            GitHub Discussions
          </a>
        </div>

        <div className="mt-10 border-t border-[var(--color-line)] pt-5 text-sm leading-7 text-[var(--color-muted)]">
          <p>当前线上地址：{siteLinks.pages}</p>
          <p>GitHub 仓库：{siteLinks.repo}</p>
        </div>
      </section>
    </main>
  );
}
