"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ThemeToggleInline } from "@/components/theme-toggle";
import { siteLinks } from "@/lib/site-links";

const HINT_DISMISSED_KEY = "relay-theme-hint-seen";

export function FloatingQuickPanel() {
  const [open, setOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(HINT_DISMISSED_KEY)) return;
    setShowHint(true);
  }, []);

  function dismissHint() {
    setShowHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_DISMISSED_KEY, "1");
    }
  }

  return (
    <div className="fixed bottom-20 left-4 z-[70] lg:bottom-4" data-selection-comments="off" ref={wrapperRef}>
      {open ? (
        <div className="surface-in mb-3 w-[328px] overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[var(--color-ink)]">观察站导航台</p>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                  常用入口、协作出口、背景主题和配色都收在这里。
                </p>
              </div>
              <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
                UI
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_76%,white)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  主题
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">背景板</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_76%,white)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  配色
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">主色系</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_76%,white)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  导航
                </p>
                <p className="mt-1 text-sm font-bold text-[var(--color-ink)]">直达页</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              站内页
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href="/stations"
              >
                榜单页
              </Link>
              <Link
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href="/community"
              >
                讨论区
              </Link>
              <Link
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href="/guides"
              >
                指南页
              </Link>
              <Link
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href="/models"
              >
                模型页
              </Link>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              外部入口
            </p>
            <div className="mt-2 grid gap-2">
              <a
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.pages}
                rel="noopener noreferrer"
                target="_blank"
              >
                打开线上站点
              </a>
              <a
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.discussions}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub Discussions
              </a>
              <a
                className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                href={siteLinks.repo}
                rel="noopener noreferrer"
                target="_blank"
              >
                GitHub 仓库
              </a>
            </div>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              外观
            </p>
            <ThemeToggleInline />
          </div>
        </div>
      ) : null}

      <button
        aria-label="打开快捷面板"
        className={`relative flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-bold text-[var(--color-brand-deep)] shadow-[0_12px_34px_rgba(15,23,42,0.14)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] ${showHint ? "theme-hint-pulse" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          dismissHint();
        }}
        type="button"
      >
        <span className="mr-1.5 text-base leading-none" aria-hidden="true">✦</span>
        导航
      </button>
    </div>
  );
}
