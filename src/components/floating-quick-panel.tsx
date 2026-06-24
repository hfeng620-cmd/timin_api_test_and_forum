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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        <div className="surface-in mb-3 w-[272px] overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="border-b border-[var(--color-line)] pb-3">
            <p className="text-sm font-bold text-[var(--color-ink)]">站点快捷入口</p>
          </div>
          <div className="mt-4 grid gap-2">
            <a
              className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
              href={siteLinks.pages}
              rel="noreferrer"
              target="_blank"
            >
              打开线上站点
            </a>
            <a
              className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
              href={siteLinks.discussions}
              rel="noreferrer"
              target="_blank"
            >
              打开 GitHub Discussions
            </a>
            <a
              className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
              href={siteLinks.repo}
              rel="noreferrer"
              target="_blank"
            >
              打开 GitHub 仓库
            </a>
            <Link
              className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3.5 text-sm font-semibold text-[var(--color-ink)] transition-all duration-300 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
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
        className={`relative flex h-11 min-w-11 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 text-sm font-bold text-[var(--color-brand-deep)] shadow-[0_12px_34px_rgba(15,23,42,0.14)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] ${showHint ? "theme-hint-pulse" : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          dismissHint();
        }}
        type="button"
      >
        <span className="mr-1.5 text-base leading-none" aria-hidden="true">🎨</span>
        配色
      </button>
    </div>
  );
}
