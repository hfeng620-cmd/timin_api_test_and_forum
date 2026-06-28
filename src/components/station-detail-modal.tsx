"use client";

import { useEffect } from "react";

import { isOfficialStationId, type Station } from "@/lib/station-storage";
import { StationReviewPanel } from "@/components/station-review-panel";
import { getSafeExternalHref } from "@/lib/url-safety";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StationDetailModalProps = {
  station: Station | null;
  open: boolean;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("正常") || s.includes("可用") || s.includes("在线")) return "#22c55e";
  if (s.includes("维护") || s.includes("限") || s.includes("排队") || s.includes("测试")) return "#f59e0b";
  if (s.includes("关") || s.includes("停") || s.includes("不可") || s.includes("失效")) return "#ef4444";
  return "var(--color-muted)";
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StationDetailModal({ station, open, onClose }: StationDetailModalProps) {
  // Escape key closes
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !station) return null;
  const stationHref = getSafeExternalHref(station.url);
  const isOfficialStation = isOfficialStationId(station.id);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal-enter w-full max-w-lg rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
        {/* ── Header: name, badge, close button ── */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-xl font-black tracking-tight text-[var(--color-ink)]">
              {station.name}
            </h2>
            {station.badge ? (
              <span className="mt-1.5 inline-block rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                {station.badge}
              </span>
            ) : null}
          </div>
          <button
            aria-label="关闭"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] transition hover:border-[var(--color-ink)] hover:text-[var(--color-ink)]"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        {/* ── Direct link to relay station ── */}
        {stationHref ? (
          <a
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
            href={stationHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            打开站点入口
            <span className="text-xs">→</span>
          </a>
        ) : null}

        {/* ── Quick stats grid ── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-3">
            <p className="text-xs text-[var(--color-muted)]">价格</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--color-ink)]">
              {station.price || "--"}
            </p>
          </div>
          <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-3">
            <p className="text-xs text-[var(--color-muted)]">倍率</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--color-ink)]">
              {station.multiplier || "--"}
            </p>
          </div>
          <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-3">
            <p className="text-xs text-[var(--color-muted)]">模型</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--color-ink)]">
              {station.models || "--"}
            </p>
          </div>
          <div className="rounded-[16px] bg-[var(--color-soft)] px-3 py-3">
            <p className="text-xs text-[var(--color-muted)]">收费方式</p>
            <p className="mt-1 truncate text-sm font-bold text-[var(--color-ink)]">
              {station.packageType || "--"}
            </p>
          </div>
        </div>

        {/* ── Status with colored indicator ── */}
        <div className="mt-4 flex items-center gap-2.5 rounded-[16px] bg-[var(--color-soft)] px-4 py-3">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: statusColor(station.status) }}
          />
          <span className="text-sm font-bold text-[var(--color-ink)]">
            {station.status || "--"}
          </span>
          {station.uptime ? (
            <span className="text-xs text-[var(--color-muted)]">在线率 {station.uptime}</span>
          ) : null}
          {station.latency ? (
            <span className="text-xs text-[var(--color-muted)]">延迟 {station.latency}</span>
          ) : null}
        </div>

        {/* ── Community notes ── */}
        {(station.verdict || station.note || station.advantage || station.risk) ? (
          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              社区备注
            </p>
            {station.verdict ? (
              <div className="rounded-[16px] bg-[var(--color-soft)] px-4 py-3">
                <p className="text-xs text-[var(--color-muted)]">评价</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">{station.verdict}</p>
              </div>
            ) : null}
            {station.note ? (
              <div className="rounded-[16px] bg-[var(--color-soft)] px-4 py-3">
                <p className="text-xs text-[var(--color-muted)]">备注</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">{station.note}</p>
              </div>
            ) : null}
            {station.advantage ? (
              <div className="rounded-[16px] bg-[var(--color-soft)] px-4 py-3">
                <p className="text-xs text-[var(--color-muted)]">优势</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">{station.advantage}</p>
              </div>
            ) : null}
            {station.risk ? (
              <div className="rounded-[16px] bg-[var(--color-soft)] px-4 py-3">
                <p className="text-xs text-[var(--color-muted)]">风险</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-ink)]">{station.risk}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Source & last update ── */}
        <div className="mt-5 border-t border-[var(--color-line)] pt-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--color-muted)]">
            {station.source ? (
              <span>
                来源：<span className="text-[var(--color-ink)]">{station.source}</span>
              </span>
            ) : null}
            {station.lastEditAt ? (
              <span>
                最后更新：<span className="text-[var(--color-ink)]">{formatTime(station.lastEditAt)}</span>
              </span>
            ) : null}
            {station.lastEditorName ? (
              <span>
                编辑者：<span className="text-[var(--color-ink)]">{station.lastEditorName}</span>
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Community discussion link ── */}
        <div className="mt-4">
          <a
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
            href={`https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions?discussions_q=${encodeURIComponent(station.name)}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            查看社区讨论
            <span>→</span>
          </a>
        </div>

        {/* ── Station reviews ── */}
        <div className="mt-5">
          {isOfficialStation ? (
            <StationReviewPanel stationId={station.id} />
          ) : (
            <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                社区评价
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">
                这条还是本地兜底数据，先保存为正式站点后再写评价或查看历史。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
