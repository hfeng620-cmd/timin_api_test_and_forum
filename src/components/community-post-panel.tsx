"use client";

import { useState } from "react";

import { createDiscussionPost } from "@/lib/discussion-storage";

type CommunityPostPanelProps = {
  onPostCreated?: () => void;
};

export function CommunityPostPanel({ onPostCreated }: CommunityPostPanelProps) {
  const [open, setOpen] = useState(false);
  const [station, setStation] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("先发一条新帖，左侧帖子流会立刻接住它。");

  function handleSubmit() {
    if (!body.trim()) {
      setStatus("先写一点正文，再发布。");
      return;
    }

    const tags = station
      .split(/[，,\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    createDiscussionPost({
      body: body.trim(),
      station: station.trim(),
      tags,
    });

    setBody("");
    setStation("");
    setOpen(false);
    setStatus("已发到左侧帖子流，下面就可以继续回复、点赞和收藏。");
    onPostCreated?.();
  }

  return (
    <div
      className="rounded-[28px] border border-[var(--color-line)] bg-white/96 p-5 shadow-[0_16px_50px_rgba(13,25,48,0.06)] backdrop-blur xl:sticky xl:top-24 xl:ml-auto xl:w-[352px]"
      data-selection-comments="off"
    >
      <div className="border-b border-[var(--color-line)] pb-4">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          发帖动作区
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight">先发一条短帖，把线索接住</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
          站内适合先发轻量帖子和短回复；QQ群适合即时协作；GitHub Discussions 适合把结论沉淀成长期讨论。
        </p>
      </div>

      {!open ? (
        <div className="mt-4">
          <div className="grid gap-3">
            <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
                适合先发
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  价格变化
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  试用入口
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  模型口径
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  避坑记录
                </span>
              </div>
            </div>

            <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                继续协作
              </p>
              <div className="mt-4 grid gap-3">
                <a
                  className="inline-flex w-full items-center justify-between rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                  href="https://github.com/hfeng620-cmd/api_test_and_forum/discussions"
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>GitHub Discussions</span>
                  <span className="text-[var(--color-muted)]">沉淀长讨论</span>
                </a>
                <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">
                  <p className="font-semibold text-[var(--color-ink)]">QQ 群 602190132</p>
                  <p className="mt-1">适合先报线索、同步倍率变化、拉群友一起补测。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <button
              className="w-full rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
              onClick={() => setOpen(true)}
              type="button"
            >
              发布新帖
            </button>
          </div>

          <p className="mt-4 text-xs leading-6 text-[var(--color-muted)]">{status}</p>
        </div>
      ) : (
        <div className="mt-5 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4">
          <p className="text-lg font-black">发布一个新帖</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            先写你看到的价格变化、试用活动、模型口径或避坑记录。发出去后，左侧帖子流会直接承接回复、点赞和收藏。
          </p>

          <input
            className="mt-4 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setStation(event.target.value)}
            placeholder="关联站点，例如 虎虎 / Aether / 杂货铺"
            value={station}
          />

          <textarea
            className="mt-3 min-h-40 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[var(--color-brand)]"
            onChange={(event) => setBody(event.target.value)}
            placeholder="例如：Aether 这两天口径没变，但高峰期速度比上周好一些。"
            value={body}
          />

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              onClick={() => setOpen(false)}
              type="button"
            >
              先收起
            </button>

            <button
              className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
              onClick={handleSubmit}
              type="button"
            >
              发布帖子
            </button>
          </div>

          <p className="mt-3 text-xs leading-6 text-[var(--color-muted)]">{status}</p>
        </div>
      )}
    </div>
  );
}
