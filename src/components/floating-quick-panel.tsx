"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ThemeToggleInline } from "@/components/theme-toggle";

export function FloatingQuickPanel() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-30" data-selection-comments="off" ref={wrapperRef}>
      {open ? (
        <div className="mb-3 w-[272px] overflow-hidden rounded-[26px] border border-[var(--color-line)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,248,255,0.98))] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] pb-3">
            <p className="text-sm font-bold text-[var(--color-ink)]">站点快捷入口</p>
            <p className="mt-2 text-xs leading-6 text-[var(--color-muted)]">
              这里统一放讨论入口和配色切换，不再单独留一个突兀的小黑块。
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            <a
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
              href="https://github.com/hfeng620-cmd/api_test_and_forum/discussions"
              rel="noreferrer"
              target="_blank"
            >
              打开 GitHub Discussions
            </a>
            <Link
              className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
              href="/community"
            >
              打开站内讨论区
            </Link>
          </div>
          <div className="mt-4">
            <ThemeToggleInline />
          </div>
        </div>
      ) : null}

      <button
        aria-label="打开快捷面板"
        className="flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-white/96 px-4 text-sm font-bold text-[var(--color-brand-deep)] shadow-[0_10px_26px_rgba(15,23,42,0.10)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        配色
      </button>
    </div>
  );
}
