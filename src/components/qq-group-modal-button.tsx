"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export function QqGroupModalButton() {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        className="inline-flex items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 text-sm font-bold text-[var(--color-brand-deep)] shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-brand-soft)] text-[10px] font-black text-[var(--color-brand-deep)]">
          Q
        </span>
        加入QQ群
      </button>

      {open ? (
        <div className="surface-in absolute right-0 top-[calc(100%+14px)] z-50 w-[min(320px,calc(100vw-32px))] overflow-hidden rounded-[22px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur sm:left-0 sm:right-auto">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                加入 QQ 群
              </p>
              <h2 className="mt-2 text-xl font-black tracking-tight">群号 602190132</h2>
            </div>
            <button
              className="rounded-full px-2 py-1 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              onClick={() => setOpen(false)}
              type="button"
            >
              关闭
            </button>
          </div>

          <div className="mt-5 rounded-[18px] bg-[var(--color-soft)] p-4">
            <div className="flex justify-center rounded-[14px] bg-[var(--color-panel-strong)] p-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
              <Image
                src="/qq-group-qrcode.jpg"
                alt="Timix观察站 QQ群二维码"
                width={248}
                height={248}
                className="h-auto w-[248px] rounded-[18px]"
                unoptimized
                priority
              />
            </div>
            <div className="mt-4 grid gap-2 text-center">
              <p className="text-sm font-bold text-[var(--color-ink)]">扫码加入 QQ 群</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
