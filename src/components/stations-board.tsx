"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SubmissionPanel } from "@/components/submission-panel";
import {
  prioritizedStationNames,
  stationComparisonRows,
  stationLinkMap,
} from "@/lib/site-data";

type FilterId = "all" | "featured" | "trial" | "free" | "lowRate" | "pending";
type StationRow = (typeof stationComparisonRows)[number];

const filters: { id: FilterId; label: string; description: string }[] = [
  { id: "all", label: "全部站点", description: "完整总表" },
  { id: "featured", label: "首页重点", description: "虎虎 / Aether / 杂货铺 / 秋天中转站" },
  { id: "trial", label: "可先试用", description: "低门槛入口" },
  { id: "free", label: "免费入口", description: "公益或免费" },
  { id: "lowRate", label: "低倍率", description: "0.15x 及以下" },
  { id: "pending", label: "待补测", description: "缺数据" },
];

function matchesFilter(filter: FilterId, row: StationRow) {
  if (filter === "all") {
    return true;
  }

  if (filter === "featured") {
    return prioritizedStationNames.includes(row.name);
  }

  if (filter === "trial") {
    return (
      row.badge.includes("试用") ||
      row.note.includes("试用") ||
      row.note.includes("注册送") ||
      row.status.includes("试用")
    );
  }

  if (filter === "free") {
    return row.badge.includes("免费") || row.price.includes("免费");
  }

  if (filter === "lowRate") {
    return ["0.058x", "0.06x", "0.12x", "0.15x"].some((value) =>
      row.multiplier.includes(value),
    );
  }

  return (
    row.badge.includes("待补") ||
    row.badge.includes("未实测") ||
    row.status.includes("待") ||
    row.status.includes("缺")
  );
}

function rankingBadge(index: number) {
  return `#${(index + 1).toString().padStart(2, "0")}`;
}

export function StationsBoard() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [showAllRows, setShowAllRows] = useState(false);

  const featuredRows = useMemo<StationRow[]>(
    () =>
      prioritizedStationNames
        .map((name) => stationComparisonRows.find((row) => row.name === name))
        .filter((row): row is StationRow => Boolean(row)),
    [],
  );

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return stationComparisonRows.filter((row) => {
      const matchFilter = matchesFilter(activeFilter, row);
      if (!matchFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystacks = [
        row.name,
        row.group,
        row.entry,
        row.packageType,
        row.models,
        row.price,
        row.multiplier,
        row.status,
        row.note,
        row.badge,
      ];

      return haystacks.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [activeFilter, query]);

  const visibleRows = showAllRows ? filteredRows : filteredRows.slice(0, 8);

  return (
    <>
      <section className="mx-auto max-w-[1600px] px-6 py-8 lg:px-10">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.48fr)_320px] xl:items-start">
          <div>
            <div className="border-b border-[var(--color-line)] pb-5">
              <div className="flex flex-wrap items-start justify-between gap-6">
                <div className="max-w-4xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                    API Relay Index
                  </p>
                  <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                    中转站榜单
                  </h1>
                </div>

                <div className="grid min-w-[220px] grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-[var(--color-muted)]">站点</p>
                    <p className="mt-1 text-2xl font-black">{stationComparisonRows.length}</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-muted)]">最低</p>
                    <p className="mt-1 text-2xl font-black">0.058x</p>
                  </div>
                  <div>
                    <p className="text-[var(--color-muted)]">试用</p>
                    <p className="mt-1 text-2xl font-black">4+</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featuredRows.map((row, index) => (
                <a
                  key={`${row.name}-hero`}
                  href={stationLinkMap[row.name]}
                  rel="noreferrer"
                  target="_blank"
                  className="stagger-in group min-h-[238px] rounded-[8px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-[2px] hover:border-[var(--color-brand)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        {rankingBadge(index)}
                      </p>
                      <h2 className="mt-2 text-2xl font-black">{row.name}</h2>
                    </div>
                    <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {row.badge}
                    </span>
                  </div>

                  <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{row.note}</p>

                  <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] pt-4 text-sm">
                    <div>
                      <p className="text-[var(--color-muted)]">价格</p>
                      <p className="mt-1 font-black">{row.price}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-muted)]">倍率</p>
                      <p className="mt-1 font-black">{row.multiplier}</p>
                    </div>
                  </div>

                  <div className="mt-5 inline-flex items-center text-sm font-bold text-[var(--color-brand-deep)]">
                    打开站点入口
                    <span className="ml-2 transition group-hover:translate-x-1">→</span>
                  </div>
                </a>
              ))}
            </div>

            <div className="surface-in mt-8 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)] backdrop-blur">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    快速查找
                  </p>
                  <h2 className="mt-2 text-2xl font-black">搜索 / 筛选</h2>
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  当前结果 <span className="font-bold text-[var(--color-ink)]">{filteredRows.length}</span> 条
                </p>
              </div>

              <div className="mt-5">
                <input
                  className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-5 py-3.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜站点名、倍率、试用、免费、Claude、Grok、入口域名都可以"
                  value={query}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {filters.map((filter) => (
                  <button
                    key={filter.id}
                    className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                      activeFilter === filter.id
                        ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]"
                        : "border border-[var(--color-line)] bg-[var(--color-panel)] text-[var(--color-muted)] hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                    }`}
                    onClick={() => setActiveFilter(filter.id)}
                    type="button"
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-sm text-[var(--color-muted)]">
                {filters
                  .filter((filter) => filter.id !== "all")
                  .map((filter) => (
                    <span key={`${filter.id}-desc`} className="rounded-full bg-[var(--color-soft)] px-3 py-2">
                      {filter.label}：{filter.description}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          <aside className="xl:pt-2">
            <div className="border-b border-[var(--color-line)] pb-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    讨论入口
                  </p>
                  <h2 className="mt-2 text-[28px] font-black leading-[1.1] tracking-tight">
                    榜单看结果，
                    <br />
                    论坛接变化
                  </h2>
                </div>
                <Link
                  aria-label="打开论坛入口"
                  href="/community"
                  title="打开论坛入口"
                  className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] px-5 text-sm font-black text-[var(--color-on-brand)] shadow-[0_10px_28px_var(--color-panel-glow)] transition hover:scale-[1.03] hover:bg-[var(--color-brand-deep)]"
                >
                  讨论
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Link
                href="/community"
                className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-center text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
              >
                进入站内讨论区
              </Link>
              <a
                href="https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions"
                rel="noreferrer"
                target="_blank"
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-center text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
              >
                GitHub Discussions
              </a>
            </div>

            <div className="mt-6 border-t border-[var(--color-line)] pt-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                快速跳转
              </p>
              <div className="mt-4 grid gap-3">
                <a
                  href="https://huhuai.xyz/register?aff=BCPA5AKW3KHX"
                  rel="noreferrer"
                  target="_blank"
                  className="border-b border-[var(--color-line)] pb-3 text-sm leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  虎虎注册链接：直接送额度
                </a>
                <a
                  href="https://www.kdocs.cn/l/cj84YbmlJswN"
                  rel="noreferrer"
                  target="_blank"
                  className="border-b border-[var(--color-line)] pb-3 text-sm leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  历史填表记录：以前群里有过填表送额度
                </a>
                <a
                  href="https://www.kdocs.cn/l/cr2932V6f6bH"
                  rel="noreferrer"
                  target="_blank"
                  className="border-b border-[var(--color-line)] pb-3 text-sm leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  API 中转站集合统计表：继续补更多站点
                </a>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] bg-[var(--color-soft)] px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">
              <p className="font-semibold text-[var(--color-ink)]">QQ群 602190132</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
        <div className="surface-in overflow-hidden rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
            <div>
              <h2 className="text-3xl font-black">中转站总表</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                onClick={() => setShowAllRows((value) => !value)}
                type="button"
              >
                {showAllRows ? "收起部分结果" : "展开更多中转站"}
              </button>
              <Link
                href="/community"
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
              >
                去论坛补反馈
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1180px]">
              <div className="grid grid-cols-[0.8fr_1.05fr_1fr_0.92fr_0.9fr_0.8fr_1.3fr] bg-[var(--color-soft)] px-6 py-4 text-sm font-bold text-[var(--color-muted)]">
                <span>排序</span>
                <span>站点</span>
                <span>入口 / 地址</span>
                <span>收费方式</span>
                <span>标称价格</span>
                <span>倍率</span>
                <span>状态与社区备注</span>
              </div>

              {visibleRows.map((row, index) => (
                <article
                  key={`${row.name}-${index}`}
                  className={`grid grid-cols-[0.8fr_1.05fr_1fr_0.92fr_0.9fr_0.8fr_1.3fr] items-start px-6 py-5 ${
                    index % 2 === 0 ? "bg-[var(--color-panel)]" : "bg-[var(--color-row-alt)]"
                  }`}
                >
                  <div className="font-bold text-[var(--color-muted)]">{rankingBadge(index)}</div>

                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-bold">{row.name}</h3>
                      <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {row.badge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{row.group}</p>
                  </div>

                  <div className="text-sm leading-6 text-[var(--color-muted)]">
                    {stationLinkMap[row.name] ? (
                      <a
                        href={stationLinkMap[row.name]}
                        rel="noreferrer"
                        target="_blank"
                        className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                      >
                        {row.entry}
                      </a>
                    ) : (
                      row.entry
                    )}
                  </div>

                  <div>
                    <p className="font-bold">{row.packageType}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{row.models}</p>
                  </div>

                  <div className="font-bold">{row.price}</div>
                  <div className="font-bold">{row.multiplier}</div>

                  <div>
                    <p className="font-bold">{row.status}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{row.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line)] px-6 py-5">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              {filteredRows.length === 0
                ? "当前筛选没有结果。"
                : `当前显示 ${visibleRows.length} / ${filteredRows.length} 条。`}
            </p>
            {!showAllRows && filteredRows.length > visibleRows.length ? (
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                onClick={() => setShowAllRows(true)}
                type="button"
              >
                查看剩余 {filteredRows.length - visibleRows.length} 条
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <SubmissionPanel />
      </section>
    </>
  );
}
