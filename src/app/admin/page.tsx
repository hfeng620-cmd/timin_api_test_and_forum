"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { GithubIssueReviewPanel } from "@/components/github-issue-review-panel";
import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient } from "@/lib/supabase";

import {
  clearFeaturedStationDrafts,
  loadFeaturedStationDrafts,
  saveFeaturedStationDrafts,
} from "@/lib/featured-station-storage";
import { homeFeaturedStations, type HomeFeaturedStation } from "@/lib/site-data";
import {
  loadStationSubmissions,
  saveStationSubmissions,
  type StationSubmission,
  updateSubmissionReview,
} from "@/lib/submission-storage";

export default function AdminPage() {
  const { isConnected } = useForumAuth();
  const [stations, setStations] = useState<HomeFeaturedStation[]>(
    () => loadFeaturedStationDrafts() ?? homeFeaturedStations,
  );
  const [importText, setImportText] = useState(() =>
    JSON.stringify(loadFeaturedStationDrafts() ?? homeFeaturedStations, null, 2),
  );
  const [status, setStatus] = useState("这里先做成管理员文案面板原型，后面可以接真实后台。");
  const [submissions, setSubmissions] = useState<StationSubmission[]>(() =>
    loadStationSubmissions(),
  );
  const [forumHistory, setForumHistory] = useState<{ id: string; body: string; status: "approved" | "rejected"; time: string }[]>([]);
  const [forumHistoryLoaded, setForumHistoryLoaded] = useState(false);

  useEffect(() => {
    if (!isConnected || forumHistoryLoaded) return;

    let cancelled = false;
    getSupabaseClient()
      .from("forum_posts")
      .select("id, body, created_at")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setForumHistory(
            (data as { id: string; body: string; created_at: string }[]).map((row) => ({
              id: row.id,
              body: row.body,
              status: "approved" as const,
              time: row.created_at,
            })),
          );
        }
        setForumHistoryLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected, forumHistoryLoaded]);

  function updateStation(index: number, field: keyof HomeFeaturedStation, value: string) {
    setStations((current) =>
      current.map((station, stationIndex) =>
        stationIndex === index ? { ...station, [field]: value } : station,
      ),
    );
  }

  function saveAll() {
    saveFeaturedStationDrafts(stations);
    setImportText(JSON.stringify(stations, null, 2));
    setStatus("已保存到本地管理员草稿。现在首页会读这份描述。");
  }

  function resetAll() {
    clearFeaturedStationDrafts();
    setStations(homeFeaturedStations);
    setImportText(JSON.stringify(homeFeaturedStations, null, 2));
    setStatus("已重置为默认描述。");
  }

  function importJson() {
    try {
      const parsed = JSON.parse(importText) as HomeFeaturedStation[];
      if (!Array.isArray(parsed) || parsed.length !== homeFeaturedStations.length) {
        setStatus("导入失败：JSON 结构不对，数量也要和当前首页精选一致。");
        return;
      }

      setStations(parsed);
      saveFeaturedStationDrafts(parsed);
      setStatus("导入成功，首页会直接使用这份管理员描述。");
    } catch {
      setStatus("导入失败：JSON 解析错误。");
    }
  }

  function updateSubmissionField(
    id: string,
    field: keyof Pick<
      StationSubmission,
      "stationName" | "url" | "priceOrRate" | "note" | "contact" | "adminNote"
    >,
    value: string,
  ) {
    setSubmissions((current) =>
      current.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  }

  function reviewSubmission(
    id: string,
    statusValue: StationSubmission["status"],
    mode: "direct" | "edited" = "direct",
  ) {
    saveStationSubmissions(submissions);
    const target = submissions.find((item) => item.id === id);
    const next = updateSubmissionReview(id, {
      status: statusValue,
      adminNote: target?.adminNote ?? "",
    });
    setSubmissions(next);
    setStatus(
      statusValue === "approved"
        ? mode === "edited"
          ? "已保存你改过的内容，并通过这条提交。"
          : "已直接通过这条提交。"
        : "已驳回这条提交。",
    );
  }

  const pendingSubmissions = submissions.filter((item) => item.status === "pending");
  const reviewedSubmissions = submissions.filter((item) => item.status !== "pending");

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-white shadow-[0_10px_30px_var(--color-panel-glow)]">
              A
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timin观察站</p>
              <p className="text-sm text-[var(--color-muted)]">管理员文案面板</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-white p-1 lg:flex">
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/"
              >
                首页
              </Link>
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/stations"
              >
                中转站榜单
              </Link>
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_var(--color-panel-glow)]">
                管理员页
              </span>
            </nav>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  首页精选站文案
                </p>
                <h1 className="mt-2 text-3xl font-black">把虎虎、Aether、杂货铺、秋天中转站放在最上面</h1>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
                  onClick={saveAll}
                  type="button"
                >
                  保存到首页
                </button>
                <button
                  className="rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
                  onClick={resetAll}
                  type="button"
                >
                  重置默认
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {stations.map((station, index) => (
                <article
                  key={station.name}
                  className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black">{station.name}</h2>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                      {station.badge}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--color-muted)]">价格</span>
                      <input
                        className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) => updateStation(index, "price", event.target.value)}
                        value={station.price}
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-[var(--color-muted)]">倍率</span>
                      <input
                        className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(event) =>
                          updateStation(index, "multiplier", event.target.value)
                        }
                        value={station.multiplier}
                      />
                    </label>
                  </div>

                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">首页简介</span>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(event) => updateStation(index, "summary", event.target.value)}
                      value={station.summary}
                    />
                  </label>

                  <label className="mt-4 block space-y-2">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">推荐理由</span>
                    <textarea
                      className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(event) => updateStation(index, "reason", event.target.value)}
                      value={station.reason}
                    />
                  </label>
                </article>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <GithubIssueReviewPanel />

            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  已审核论坛帖子
                </p>
                <button
                  className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                  onClick={() => { setForumHistory([]); setForumHistoryLoaded(false); }}
                  type="button"
                >
                  刷新
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {!isConnected ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    管理员登录后可查看已审核论坛帖子
                  </div>
                ) : !forumHistoryLoaded ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    加载中...
                  </div>
                ) : forumHistory.length === 0 ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    暂无已审核论坛帖子
                  </div>
                ) : (
                  forumHistory.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm leading-6 text-[var(--color-muted)] line-clamp-2">
                          {item.body.length > 120 ? item.body.slice(0, 120) + "..." : item.body}
                        </p>
                        <span className="shrink-0 rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-bold text-[#15803d]">
                          已通过
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--color-muted)]">
                        {new Date(item.time).toLocaleString("zh-CN")}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                当前状态
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{status}</p>
              <div className="mt-5 rounded-[24px] bg-[var(--color-soft)] p-4 text-sm leading-7 text-[var(--color-muted)]">
                现在这套是前端原型：
                你可以把管理员页交给某个人改描述，再导出 JSON 给你。
                如果你想让“一个管理员改完，所有访问者都直接看到同一份结果”，下一步我建议接：
                `GitHub OAuth + Supabase` 或 `Cloudflare D1 + Pages Functions`。
              </div>
            </div>

            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    待审核提交
                  </p>
                  <h2 className="mt-2 text-2xl font-black">你点通过才会上榜，也可以自己改完再通过</h2>
                </div>
                <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                  {pendingSubmissions.length} 条待处理
                </span>
              </div>

              <div className="mt-5 space-y-4">
                {pendingSubmissions.length === 0 ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    现在还没有新的待审核提交。用户在中转站榜单页点“提交给管理员审核”后，会先进入这里。
                  </div>
                ) : (
                  pendingSubmissions.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--color-brand-deep)]">
                            {item.kind}
                          </p>
                          <h3 className="mt-1 text-xl font-black">{item.stationName}</h3>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                          待审核
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">站点名</span>
                          <input
                            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                            onChange={(event) =>
                              updateSubmissionField(item.id, "stationName", event.target.value)
                            }
                            value={item.stationName}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">地址或入口</span>
                          <input
                            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                            onChange={(event) =>
                              updateSubmissionField(item.id, "url", event.target.value)
                            }
                            value={item.url}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">倍率或价格</span>
                          <input
                            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                            onChange={(event) =>
                              updateSubmissionField(item.id, "priceOrRate", event.target.value)
                            }
                            value={item.priceOrRate}
                          />
                        </label>
                        <label className="space-y-2">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">来源或联系方式</span>
                          <input
                            className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                            onChange={(event) =>
                              updateSubmissionField(item.id, "contact", event.target.value)
                            }
                            value={item.contact}
                          />
                        </label>
                      </div>

                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-[var(--color-muted)]">用户提交说明</span>
                        <textarea
                          className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                          onChange={(event) =>
                            updateSubmissionField(item.id, "note", event.target.value)
                          }
                          value={item.note}
                        />
                      </label>

                      <label className="mt-4 block space-y-2">
                        <span className="text-sm font-semibold text-[var(--color-muted)]">管理员备注</span>
                        <textarea
                          className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                          onChange={(event) =>
                            updateSubmissionField(item.id, "adminNote", event.target.value)
                          }
                          placeholder="你可以先改内容，再备注为什么通过，或者写驳回原因。"
                          value={item.adminNote}
                        />
                      </label>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--color-brand-deep)]"
                          onClick={() => reviewSubmission(item.id, "approved", "direct")}
                          type="button"
                        >
                          直接通过
                        </button>
                        <button
                          className="rounded-full border border-[var(--color-line)] bg-white px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
                          onClick={() => reviewSubmission(item.id, "approved", "edited")}
                          type="button"
                        >
                          保存改动并通过
                        </button>
                        <button
                          className="rounded-full bg-[#fff1f2] px-5 py-3 text-sm font-bold text-[#be123c] transition hover:bg-[#ffe4e6]"
                          onClick={() => reviewSubmission(item.id, "rejected")}
                          type="button"
                        >
                          驳回
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    导入导出
                  </p>
                  <h2 className="mt-2 text-2xl font-black">管理员可以直接改 JSON</h2>
                </div>
                <button
                  className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                  onClick={importJson}
                  type="button"
                >
                  导入 JSON
                </button>
              </div>
              <textarea
                className="mt-5 min-h-[420px] w-full rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 font-mono text-sm outline-none transition focus:border-[var(--color-brand)]"
                onChange={(event) => setImportText(event.target.value)}
                value={importText}
              />
            </div>

            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                已处理记录
              </p>
              <div className="mt-5 space-y-3">
                {reviewedSubmissions.length === 0 ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    这里会记录你已经通过或驳回的提交。
                  </div>
                ) : (
                  reviewedSubmissions.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="font-bold">{item.stationName}</h3>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            item.status === "approved"
                              ? "bg-[#ecfdf3] text-[#15803d]"
                              : "bg-[#fff1f2] text-[#be123c]"
                          }`}
                        >
                          {item.status === "approved" ? "已通过" : "已驳回"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                      {item.adminNote ? (
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          管理员备注：{item.adminNote}
                        </p>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
