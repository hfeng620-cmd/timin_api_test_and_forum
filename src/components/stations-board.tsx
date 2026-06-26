"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { stationComparisonRows, stationLinkMap } from "@/lib/site-data";
import { StationDetailModal } from "@/components/station-detail-modal";
import { DiscussionFeed } from "@/components/discussion-feed";
import { SubmissionPanel } from "@/components/submission-panel";
import { useForumAuth } from "@/lib/forum-auth";
import { getSafeExternalHref } from "@/lib/url-safety";
import {
  createStation,
  deleteStation,
  loadStationEditHistory,
  loadStations,
  updateStation,
  type Station,
  type StationEditRecord,
} from "@/lib/station-storage";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type FilterId = "all" | "featured" | "trial" | "free" | "lowRate" | "pending";

type SortOption = "default" | "priceAsc" | "recentUpdate";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "default", label: "默认排序" },
  { value: "priceAsc", label: "价格从低到高" },
  { value: "recentUpdate", label: "最近更新" },
];

const FEATURED_NAMES = ["虎虎", "Aether", "杂货铺", "秋天中转站"];

const filters: { id: FilterId; label: string; description: string }[] = [
  { id: "all", label: "全部站点", description: "完整总表" },
  { id: "featured", label: "首页重点", description: "虎虎 / Aether / 杂货铺 / 秋天中转站" },
  { id: "trial", label: "可先试用", description: "低门槛入口" },
  { id: "free", label: "免费入口", description: "公益或免费" },
  { id: "lowRate", label: "低倍率", description: "0.15x 及以下" },
  { id: "pending", label: "待补测", description: "缺数据" },
];

/** Editable fields shown in the edit / create form. */
const EDITABLE_FIELDS: { key: keyof Station; label: string; type: "input" | "textarea" }[] = [
  { key: "name", label: "站点名", type: "input" },
  { key: "url", label: "网址", type: "input" },
  { key: "entry", label: "入口 / 地址", type: "input" },
  { key: "price", label: "标称价格", type: "input" },
  { key: "multiplier", label: "倍率", type: "input" },
  { key: "packageType", label: "收费方式", type: "input" },
  { key: "status", label: "状态", type: "input" },
  { key: "models", label: "模型", type: "textarea" },
  { key: "uptime", label: "在线率", type: "input" },
  { key: "latency", label: "延迟", type: "input" },
  { key: "source", label: "来源", type: "input" },
  { key: "verdict", label: "评价", type: "input" },
  { key: "note", label: "备注", type: "textarea" },
  { key: "advantage", label: "优势", type: "textarea" },
  { key: "risk", label: "风险", type: "textarea" },
  { key: "badge", label: "标签", type: "input" },
  { key: "groupName", label: "分组", type: "input" },
  { key: "sortOrder", label: "排序", type: "input" },
];

/** Human-readable labels for snake_case field names returned from edit history. */
const FIELD_LABELS: Record<string, string> = {
  name: "站点名",
  url: "网址",
  price: "标称价格",
  multiplier: "倍率",
  entry: "入口 / 地址",
  package_type: "收费方式",
  status: "状态",
  models: "模型",
  uptime: "在线率",
  latency: "延迟",
  source: "来源",
  verdict: "评价",
  note: "备注",
  advantage: "优势",
  risk: "风险",
  badge: "标签",
  group_name: "分组",
  sort_order: "排序",
};

const EMPTY_FORM: Partial<Station> = {
  name: "",
  url: "",
  entry: "",
  price: "",
  multiplier: "",
  packageType: "",
  status: "",
  models: "",
  uptime: "",
  latency: "",
  source: "",
  verdict: "",
  note: "",
  advantage: "",
  risk: "",
  badge: "",
  groupName: "",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesFilter(filter: FilterId, station: Station) {
  if (filter === "all") return true;

  if (filter === "featured") {
    return FEATURED_NAMES.includes(station.name);
  }

  if (filter === "trial") {
    return (
      station.badge.includes("试用") ||
      station.note.includes("试用") ||
      station.note.includes("注册送") ||
      station.status.includes("试用")
    );
  }

  if (filter === "free") {
    return station.badge.includes("免费") || station.price.includes("免费");
  }

  if (filter === "lowRate") {
    return ["0.058x", "0.06x", "0.15x"].some((value) =>
      station.multiplier.includes(value),
    );
  }

  // pending
  return (
    station.badge.includes("待补") ||
    station.badge.includes("未实测") ||
    station.status.includes("待") ||
    station.status.includes("缺")
  );
}

function rankingBadge(index: number) {
  return `#${(index + 1).toString().padStart(2, "0")}`;
}

function freshnessInfo(lastEditAt: string | undefined): {
  label: string;
  isRecent: boolean;
  isThisWeek: boolean;
} | null {
  if (!lastEditAt) return null;
  const updated = new Date(lastEditAt).getTime();
  if (isNaN(updated)) return null;
  const hours = (Date.now() - updated) / (1000 * 60 * 60);
  if (hours <= 24) return { label: "最近更新", isRecent: true, isThisWeek: true };
  if (hours <= 24 * 7) return { label: "本周更新", isRecent: false, isThisWeek: true };
  const d = new Date(updated);
  return {
    label: `${d.getMonth() + 1}/${d.getDate()}更新`,
    isRecent: false,
    isThisWeek: false,
  };
}

function formatTime(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fieldLabel(snakeName: string): string {
  return FIELD_LABELS[snakeName] ?? snakeName;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StationsBoard() {
  const { isConnected, displayName, isAdmin, isOwner } = useForumAuth();
  const canDeleteStations = isAdmin || isOwner;

  // ---- data ---------------------------------------------------------------
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- filters ------------------------------------------------------------
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [showAllRows, setShowAllRows] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ---- editing ------------------------------------------------------------
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Station>>({});
  const [saving, setSaving] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  // ---- detail modal -------------------------------------------------------
  const [detailStation, setDetailStation] = useState<Station | null>(null);

  // ---- station discussion modal --------------------------------------------
  const [discussionStation, setDiscussionStation] = useState<Station | null>(null);

  // ---- history ------------------------------------------------------------
  const [historyStationId, setHistoryStationId] = useState<string | null>(null);
  const [editHistory, setEditHistory] = useState<StationEditRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // =========================================================================
  // Data loading
  // =========================================================================

  const refreshStations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadStations();
      setStations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载站点数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Data loading ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    let resolved = false;
    // 10s fallback — don't hang forever if Supabase is unreachable
    const timeout = setTimeout(() => {
      if (!cancelled && !resolved) {
        setError("加载超时，请刷新页面重试。");
        setLoading(false);
      }
    }, 10_000);
    loadStations()
      .then((data) => {
        clearTimeout(timeout);
        if (!cancelled) {
          resolved = true;
          if (data.length === 0) {
            // Fallback to static data when Supabase has no stations yet
            const staticStations: Station[] = stationComparisonRows.map((row, i) => ({
              id: `static-${i}`,
              name: row.name,
              url: stationLinkMap[row.name] ?? "",
              price: row.price,
              multiplier: row.multiplier,
              entry: row.entry ?? "",
              packageType: row.packageType ?? "",
              status: row.status ?? "",
              models: row.models ?? "",
              uptime: row.uptime ?? "",
              latency: row.latency ?? "",
              source: row.source ?? "",
              verdict: row.verdict ?? "",
              note: row.note ?? "",
              advantage: row.advantage ?? "",
              risk: row.risk ?? "",
              badge: row.badge ?? "",
              groupName: row.group ?? "",
              sortOrder: i + 1,
            }));
            setStations(staticStations);
          } else {
            setStations(data);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        clearTimeout(timeout);
        resolved = true;
        if (!cancelled) { setError("数据暂时加载失败，请稍后刷新重试。"); setLoading(false); }
      });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, []);

  // ---- Edit history loading -----------------------------------------------
  useEffect(() => {
    if (!historyStationId) return;
    let cancelled = false;
    loadStationEditHistory(historyStationId)
      .then((records) => {
        if (!cancelled) setEditHistory(records);
      })
      .catch(() => {
        if (!cancelled) setEditHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyStationId]);

  // ---- Debounce search query -----------------------------------------------
  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // ---- Ctrl+K keyboard shortcut -------------------------------------------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // =========================================================================
  // Derived data
  // =========================================================================

  const featuredStations = useMemo<Station[]>(
    () =>
      FEATURED_NAMES.map((name) => stations.find((s) => s.name === name)).filter(
        (s): s is Station => Boolean(s),
      ),
    [stations],
  );

  const filteredRows = useMemo(() => {
    return stations.filter((station) => {
      const matchFilter = matchesFilter(activeFilter, station);
      if (!matchFilter) return false;

      if (!debouncedQuery) return true;

      const haystacks = [
        station.name,
        station.groupName,
        station.entry,
        station.packageType,
        station.models,
        station.price,
        station.multiplier,
        station.status,
        station.note,
        station.badge,
      ];

      return haystacks.some((value) => value.toLowerCase().includes(debouncedQuery));
    });
  }, [activeFilter, debouncedQuery, stations]);

  const sortedRows = useMemo(() => {
    if (sortBy === "default") return filteredRows;

    return [...filteredRows].sort((a, b) => {
      if (sortBy === "priceAsc") {
        const numA = parseFloat(a.multiplier.replace(/[xX]/, ""));
        const numB = parseFloat(b.multiplier.replace(/[xX]/, ""));
        const validA = !isNaN(numA) && numA > 0;
        const validB = !isNaN(numB) && numB > 0;
        if (validA && validB) return numA - numB;
        if (validA) return -1;
        if (validB) return 1;
        return 0;
      }
      if (sortBy === "recentUpdate") {
        const timeA = a.lastEditAt ? new Date(a.lastEditAt).getTime() : 0;
        const timeB = b.lastEditAt ? new Date(b.lastEditAt).getTime() : 0;
        return timeB - timeA;
      }
      return 0;
    });
  }, [filteredRows, sortBy]);

  const visibleRows = showAllRows ? sortedRows : sortedRows.slice(0, 8);

  const lowestMultiplier = useMemo(() => {
    const nums = stations
      .map((s) => parseFloat(s.multiplier.replace(/[xX]/, "")))
      .filter((n) => !isNaN(n) && n > 0);
    if (nums.length === 0) return "--";
    return Math.min(...nums) + "x";
  }, [stations]);

  const trialCount = useMemo(
    () =>
      stations.filter(
        (s) =>
          s.badge.includes("试用") ||
          s.note.includes("试用") ||
          s.status.includes("试用"),
      ).length,
    [stations],
  );

  const freshnessStats = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const week = 7 * 24 * 60 * 60 * 1000;
    let updatedThisWeek = 0;
    for (const s of stations) {
      if (s.lastEditAt) {
        const t = new Date(s.lastEditAt).getTime();
        if (!isNaN(t) && now - t <= week) updatedThisWeek++;
      }
    }
    return { updatedThisWeek, total: stations.length };
  }, [stations]);

  // =========================================================================
  // Edit / create / delete handlers
  // =========================================================================

  const startEdit = useCallback((station: Station) => {
    setEditingId(station.id);
    setAddingNew(false);
    setEditForm({ ...station });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const editorName = displayName || "匿名用户";
    setSaving(true);
    try {
      await updateStation(editingId, editForm, editorName);
      await refreshStations();
      setEditingId(null);
      setEditForm({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "保存失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }, [editingId, editForm, displayName, refreshStations]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("确定要删除这个站点吗？此操作不可撤销。")) return;
      try {
        await deleteStation(id);
        await refreshStations();
        if (editingId === id) {
          setEditingId(null);
          setEditForm({});
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "删除失败，请稍后重试。");
      }
    },
    [editingId, refreshStations],
  );

  const startAdd = useCallback(() => {
    setAddingNew(true);
    setEditingId(null);
    setEditForm({ ...EMPTY_FORM });
  }, []);

  const cancelAdd = useCallback(() => {
    setAddingNew(false);
    setEditForm({});
  }, []);

  const saveNew = useCallback(async () => {
    if (!editForm.name?.trim()) {
      alert("站点名不能为空。");
      return;
    }
    setSaving(true);
    try {
      await createStation({
        name: editForm.name.trim(),
        url: editForm.url,
        price: editForm.price,
        multiplier: editForm.multiplier,
        entry: editForm.entry,
        packageType: editForm.packageType,
        status: editForm.status,
        models: editForm.models,
        uptime: editForm.uptime,
        latency: editForm.latency,
        source: editForm.source,
        verdict: editForm.verdict,
        note: editForm.note,
        advantage: editForm.advantage,
        risk: editForm.risk,
        badge: editForm.badge,
        groupName: editForm.groupName,
      });
      await refreshStations();
      setAddingNew(false);
      setEditForm({});
    } catch (err) {
      alert(err instanceof Error ? err.message : "创建失败，请稍后重试。");
    } finally {
      setSaving(false);
    }
  }, [editForm, refreshStations]);

  const toggleHistory = useCallback((stationId: string) => {
    setHistoryStationId((prev) => (prev === stationId ? null : stationId));
  }, []);

  const updateField = useCallback((key: keyof Station, value: string) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // =========================================================================
  // Sub-renderers
  // =========================================================================

  function renderEditPanel() {
    return (
      <div className="bg-[var(--color-soft)] rounded-[18px] p-5 my-2 border border-[var(--color-line)]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EDITABLE_FIELDS.map(({ key, label, type }) => {
            const value = editForm[key] ?? "";
            const inputClass =
              "w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white";

            return (
              <div key={key} className={type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {label}
                </label>
                {type === "textarea" ? (
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                ) : (
                  <input
                    className={inputClass}
                    type="text"
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <button
            className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
            disabled={saving}
            onClick={saveEdit}
            type="button"
          >
            {saving ? "保存中..." : "保存修改"}
          </button>
          <button
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
            onClick={cancelEdit}
            type="button"
          >
            取消
          </button>
          <span className="flex-1" />
          {canDeleteStations ? (
            <button
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
              onClick={() => editingId && handleDelete(editingId)}
              type="button"
            >
              删除站点
            </button>
          ) : (
            <p className="text-xs text-[var(--color-muted)]">
              社区用户可以补充和修正资料；删除站点仅管理员可操作。
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderCreatePanel() {
    return (
      <div className="bg-[var(--color-soft)] rounded-[18px] p-5 my-4 mx-6 border border-dashed border-[var(--color-brand-soft)]">
        <h3 className="mb-4 text-lg font-black text-[var(--color-brand-deep)]">添加新站点</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EDITABLE_FIELDS.map(({ key, label, type }) => {
            const value = editForm[key] ?? "";
            const inputClass =
              "w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white";

            return (
              <div key={key} className={type === "textarea" ? "sm:col-span-2 lg:col-span-3" : ""}>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  {label}
                </label>
                {type === "textarea" ? (
                  <textarea
                    className={inputClass}
                    rows={2}
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                ) : (
                  <input
                    className={inputClass}
                    type="text"
                    value={String(value)}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--color-line)] pt-4">
          <button
            className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
            disabled={saving}
            onClick={saveNew}
            type="button"
          >
            {saving ? "创建中..." : "创建站点"}
          </button>
          <button
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
            onClick={cancelAdd}
            type="button"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  function renderHistoryPanel(station: Station) {
    return (
      <div className="bg-[var(--color-soft)] rounded-[18px] p-5 my-2 border border-[var(--color-line)]">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <h4 className="text-sm font-bold text-[var(--color-brand-deep)]">
            {station.name} 编辑历史
          </h4>
          {station.lastEditorName && (
            <span className="text-xs text-[var(--color-muted)]">
              最后编辑：{station.lastEditorName}
              {station.lastEditAt ? ` · ${formatTime(station.lastEditAt)}` : ""}
            </span>
          )}
        </div>
        {historyLoading ? (
          <p className="text-sm text-[var(--color-muted)]">加载中...</p>
        ) : editHistory.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">暂无编辑记录。发现信息有变化？点击编辑按钮来更新。</p>
        ) : (
          <ul className="space-y-2">
            {editHistory.map((record) => (
              <li
                key={record.id}
                className="rounded-xl bg-[var(--color-panel)] px-4 py-2.5 text-sm leading-6"
              >
                <span className="font-bold text-[var(--color-ink)]">{record.editorName}</span>
                <span className="text-[var(--color-muted)]"> 把 </span>
                <span className="font-semibold text-[var(--color-brand-deep)]">
                  {fieldLabel(record.fieldName)}
                </span>
                <span className="text-[var(--color-muted)]"> 从 &quot;</span>
                <span className="text-[var(--color-ink)]">
                  {record.oldValue || "(空)"}
                </span>
                <span className="text-[var(--color-muted)]">&quot; 改为 &quot;</span>
                <span className="font-semibold text-[var(--color-ink)]">
                  {record.newValue || "(空)"}
                </span>
                <span className="text-[var(--color-muted)]">&quot;</span>
                <span className="ml-2 text-xs text-[var(--color-muted)]">
                  · {formatTime(record.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // =========================================================================
  // Loading / error states
  // =========================================================================

  if (loading) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-10">
        <p className="text-lg font-bold text-[var(--color-muted)]">正在加载站点数据...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-20 text-center lg:px-10">
        <p className="text-lg font-bold text-red-500">加载失败</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{error}</p>
        <button
          className="mt-4 rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
          onClick={refreshStations}
          type="button"
        >
          重新加载
        </button>
      </section>
    );
  }

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <>
      {/* ---- Hero + Filters ---- */}
      <section className="mx-auto max-w-[1680px] px-5 py-6 lg:px-8">
        <div className="border-b border-[var(--color-line)] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-4xl">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                API Relay Index
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                中转站榜单
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                先用这张工作台缩出 2 到 3 个候选，再回社区补变化和风险，不用在多页之间来回切。
              </p>
            </div>

            <div className="grid min-w-[280px] grid-cols-3 gap-3 rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3.5 text-sm shadow-[var(--shadow-card)]">
              <div>
                <p className="text-[var(--color-muted)]">站点</p>
                <p className="mt-1 text-2xl font-black">{stations.length}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted)]">最低</p>
                <p className="mt-1 text-2xl font-black">{lowestMultiplier}</p>
              </div>
              <div>
                <p className="text-[var(--color-muted)]">试用</p>
                <p className="mt-1 text-2xl font-black">{trialCount}+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          {featuredStations.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {featuredStations.map((station, index) => {
                const stationHref = getSafeExternalHref(station.url);
                const cardContent = (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {rankingBadge(index)} · 首批候选
                        </p>
                        <h2 className="mt-2 text-2xl font-black">{station.name}</h2>
                      </div>
                      <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                        {station.badge}
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">{station.note}</p>

                    <div className="mt-4 grid grid-cols-3 gap-2.5 border-t border-[var(--color-line)] pt-3.5 text-sm">
                      <div>
                        <p className="text-[var(--color-muted)]">价格</p>
                        <p className="mt-1 font-black">{station.price}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-muted)]">倍率</p>
                        <p className="mt-1 font-black">{station.multiplier}</p>
                      </div>
                      <div>
                        <p className="text-[var(--color-muted)]">门槛</p>
                        <p className="mt-1 line-clamp-1 font-black">{station.packageType || "待补"}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {stationHref ? (
                        <div className="inline-flex items-center text-sm font-bold text-[var(--color-brand-deep)]">
                          打开站点入口
                          <span className="ml-2 transition-all duration-300 group-hover:translate-x-1.5">→</span>
                        </div>
                      ) : null}

                      <button
                        className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-brand-soft)] hover:text-[var(--color-brand-deep)]"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDiscussionStation(station);
                        }}
                        type="button"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        讨论区
                      </button>
                    </div>
                  </>
                );

                if (stationHref) {
                  return (
                    <a
                      key={`${station.id}-hero`}
                      href={stationHref}
                      rel="noopener noreferrer"
                      target="_blank"
                      className="stagger-in card-lift group min-h-[202px] rounded-[22px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-[3px] hover:border-[var(--color-brand)] hover:shadow-[0_28px_72px_rgba(15,23,42,0.10)]"
                    >
                      {cardContent}
                    </a>
                  );
                }

                return (
                  <div
                    key={`${station.id}-hero`}
                    className="stagger-in card-lift group min-h-[202px] rounded-[22px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-5 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-[3px] hover:border-[var(--color-brand)] hover:shadow-[0_28px_72px_rgba(15,23,42,0.10)]"
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div />
          )}

          <aside className="surface-in rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              先这样看
            </p>
            <p className="mt-3 text-lg font-black text-[var(--color-ink)]">
              先筛，再看总表，最后回社区补风险。
            </p>

            <div className="mt-4 grid gap-2.5">
              <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  第一步
                </p>
                <p className="mt-2 text-sm font-black text-[var(--color-ink)]">先锁 2 到 3 个候选</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">先用价格、倍率和门槛缩小决策面。</p>
              </div>
              <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  第二步
                </p>
                <p className="mt-2 text-sm font-black text-[var(--color-ink)]">再看备注和更新</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">把总表备注当摘要看，细节再进历史和讨论区。</p>
              </div>
              <div className="rounded-[18px] bg-[var(--color-brand-soft)] px-4 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  第三步
                </p>
                <p className="mt-2 text-sm font-black text-[var(--color-ink)]">最后补反馈</p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">价格负责初筛，真实变化继续靠社区回流。</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[var(--color-line)] pt-4">
              <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">本周更新</p>
                <p className="mt-2 text-lg font-black text-[var(--color-ink)]">{freshnessStats.updatedThisWeek}</p>
              </div>
              <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">试用样本</p>
                <p className="mt-2 text-lg font-black text-[var(--color-ink)]">{trialCount}+</p>
              </div>
            </div>
          </aside>
        </div>

        <div className="surface-in mt-5 rounded-[26px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[var(--shadow-card)] backdrop-blur">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px] xl:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                快速查找
              </p>
              <h2 className="mt-2 text-2xl font-black">搜索 / 筛选</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                先把结果收成可比较的一批，再往下看总表，不要在第一屏就读完所有备注。
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-3.5 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  当前结果面
                </p>
                <p className="mt-2 text-lg font-black text-[var(--color-ink)]">
                  找到 {filteredRows.length} 个站点
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  先看前 {Math.min(visibleRows.length, filteredRows.length)} 条，再决定要不要展开更多。
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-3.5 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  当前筛选
                </p>
                <p className="mt-2 text-sm font-black text-[var(--color-ink)]">
                  {filters.find((filter) => filter.id === activeFilter)?.label ?? "全部站点"}
                </p>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {sortOptions.find((option) => option.value === sortBy)?.label}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px] flex-1">
              <input
                id="station-search"
                ref={searchInputRef}
                className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] py-3.5 pl-5 pr-[88px] text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜站点名、倍率、试用、免费、Claude、Grok、入口域名都可以"
                value={query}
              />
              <div className="absolute right-3.5 top-1/2 flex -translate-y-1/2 items-center gap-2">
                {query ? (
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-line)] hover:text-[var(--color-ink)]"
                    onClick={() => { setQuery(""); setDebouncedQuery(""); }}
                    type="button"
                    aria-label="清除搜索"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : null}
                <span className="select-none rounded-md border border-[var(--color-line)] px-1.5 py-0.5 text-[11px] leading-tight text-[var(--color-muted)]">
                  Ctrl+K
                </span>
              </div>
            </div>
            <select
              className="cursor-pointer appearance-none rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3.5 pr-9 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-brand)]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                  activeFilter === filter.id
                    ? "pill-pulse bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]"
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

          <div className="mt-4 grid gap-3 border-t border-[var(--color-line)] pt-4 lg:grid-cols-4">
            <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">结果</p>
              <p className="mt-2 text-lg font-black text-[var(--color-ink)]">{filteredRows.length} 个站点</p>
            </div>
            <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">本周更新</p>
              <p className="mt-2 text-lg font-black text-[var(--color-ink)]">{freshnessStats.updatedThisWeek} 个</p>
            </div>
            <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">最低倍率</p>
              <p className="mt-2 text-lg font-black text-[var(--color-ink)]">{lowestMultiplier}</p>
            </div>
            <div className="rounded-[18px] bg-[var(--color-brand-soft)] px-4 py-3.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">下一步</p>
              <p className="mt-2 text-lg font-black text-[var(--color-ink)]">缩候选，再补反馈</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Table ---- */}
      <section className="mx-auto max-w-[1680px] px-5 pb-12 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px] 2xl:grid-cols-[minmax(0,1fr)_300px] xl:items-start">
          <div className="surface-in overflow-hidden rounded-[26px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          {/* Table header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
            <div>
              <h2 className="text-2xl font-black">中转站总表</h2>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  数据新鲜度
                </span>
                <span className="text-xs text-[var(--color-muted)]">
                  {freshnessStats.updatedThisWeek}/{freshnessStats.total} 站点本周有更新
                </span>
                <span
                  className="inline-block h-1.5 rounded-full bg-[var(--color-soft)]"
                  style={{ width: 96 }}
                >
                  <span
                    className="inline-block h-full rounded-full bg-[var(--color-brand-soft)] transition-all"
                    style={{
                      width: `${freshnessStats.total ? (freshnessStats.updatedThisWeek / freshnessStats.total) * 100 : 0}%`,
                    }}
                  />
                </span>
              </div>
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

          {/* ---- Mobile card layout (below lg) ---- */}
          <div className="lg:hidden space-y-4">
            {visibleRows.length === 0 ? (
              <div className="rounded-[20px] shadow-[var(--shadow-card)] bg-[var(--color-panel)] px-6 py-16 text-center">
                {stations.length === 0 ? (
                  <>
                    <p className="text-lg font-bold text-[var(--color-muted)]">暂无站点数据</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      站点数据需要通过 Supabase 初始化。详见 README 的 Supabase 配置说明。
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-[var(--color-muted)]">没有匹配的站点</p>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                      试试调整搜索关键词或切换筛选标签
                    </p>
                    <button
                      className="mt-4 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] transition hover:border-[var(--color-brand)]"
                      onClick={() => { setQuery(""); setDebouncedQuery(""); setActiveFilter("all"); }}
                      type="button"
                    >
                      清除所有筛选
                    </button>
                  </>
                )}
              </div>
            ) : (
              visibleRows.map((station, index) => {
                const isEditing = editingId === station.id;
                const isShowingHistory = historyStationId === station.id;
                const stationHref = getSafeExternalHref(station.url);

                return (
                  <div key={station.id}>
                    <div className="rounded-[20px] shadow-[var(--shadow-card)] bg-[var(--color-panel)] p-5">
                      {/* Header row: rank + name + badge */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                            {rankingBadge(index)}
                          </p>
                          <button
                            className="mt-1 cursor-pointer text-xl font-black transition hover:text-[var(--color-brand)] break-words text-left"
                            onClick={() => setDetailStation(station)}
                            type="button"
                          >
                            {station.name}
                          </button>
                          {(() => {
                            const fi = freshnessInfo(station.lastEditAt);
                            if (!fi) return null;
                            return (
                              <span
                                className={`ml-2 inline-flex items-center gap-1 text-[11px] ${
                                  fi.isRecent
                                    ? "text-[var(--color-brand-deep)]"
                                    : "text-[var(--color-muted)]"
                                }`}
                              >
                                <span
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                                    fi.isRecent ? "bg-green-500" : "bg-[var(--color-muted)]"
                                  }`}
                                />
                                {fi.label}
                              </span>
                            );
                          })()}
                        </div>
                        <span className="shrink-0 rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                          {station.badge}
                        </span>
                      </div>

                      {/* Price + Multiplier */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-[var(--color-muted)]">标称价格</p>
                          <p className="mt-1 font-bold">{station.price}</p>
                        </div>
                        <div>
                          <p className="text-xs text-[var(--color-muted)]">倍率</p>
                          <p className="mt-1 font-bold">{station.multiplier}</p>
                        </div>
                      </div>

                      {/* Status + Note */}
                      <div className="mt-3">
                        <p className="text-xs text-[var(--color-muted)]">状态</p>
                        <p className="mt-1 font-bold">{station.status}</p>
                        {station.note && (
                          <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                            {station.note}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-line)] pt-3">
                        {stationHref ? (
                          <a
                            href={stationHref}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="text-sm font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                          >
                            打开站点 →
                          </a>
                        ) : (
                          <span className="text-sm text-[var(--color-muted)]">
                            {station.entry || station.groupName || "待补"}
                          </span>
                        )}
                        {/* Discussion button */}
                        <button
                          className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                          onClick={() => setDiscussionStation(station)}
                          title="查看站点讨论"
                          type="button"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          讨论
                        </button>
                        <div className="ml-auto flex items-center gap-3">
                          {isConnected && (
                            <button
                              className="text-sm text-[var(--color-muted)] hover:text-[var(--color-brand-deep)] transition"
                              onClick={() => startEdit(station)}
                              title="编辑此站点"
                              type="button"
                            >
                              编辑
                            </button>
                          )}
                          <button
                            className="text-sm text-[var(--color-muted)] hover:text-[var(--color-brand-deep)] transition underline underline-offset-2"
                            onClick={() => toggleHistory(station.id)}
                            type="button"
                          >
                            {isShowingHistory ? "收起历史" : "历史"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Edit panel */}
                    {isEditing && renderEditPanel()}

                    {/* History panel */}
                    {isShowingHistory && renderHistoryPanel(station)}
                  </div>
                );
              })
            )}

            {/* Add-new button */}
            {isConnected && !addingNew && (
              <button
                className="w-full rounded-full border border-dashed border-[var(--color-brand-soft)] bg-[var(--color-soft)] px-5 py-3 text-sm font-bold text-[var(--color-brand-deep)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                onClick={startAdd}
                type="button"
              >
                + 添加新站点
              </button>
            )}

            {/* Create panel */}
            {addingNew && renderCreatePanel()}
          </div>

          <div className="hidden overflow-x-auto lg:block">
            <div className="min-w-[1220px]">
              {/* Column headers */}
              <div className="grid grid-cols-[0.48fr_1.32fr_0.78fr_0.96fr_0.82fr_0.68fr_1.28fr] bg-[var(--color-soft)] px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                <span>排序</span>
                <span>站点</span>
                <span>入口 / 地址</span>
                <span>收费方式</span>
                <span>标称价格</span>
                <span>倍率</span>
                <span>状态与备注摘要</span>
              </div>

              {/* Rows */}
              {visibleRows.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  {stations.length === 0 ? (
                    <>
                      <p className="text-lg font-bold text-[var(--color-muted)]">暂无站点数据</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        站点数据需要通过 Supabase 初始化。详见 README 的 Supabase 配置说明。
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold text-[var(--color-muted)]">没有匹配的站点</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        试试调整搜索关键词或切换筛选标签
                      </p>
                      <button
                        className="mt-4 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] transition hover:border-[var(--color-brand)]"
                        onClick={() => { setQuery(""); setDebouncedQuery(""); setActiveFilter("all"); }}
                        type="button"
                      >
                        清除所有筛选
                      </button>
                    </>
                  )}
                </div>
              ) : (
                visibleRows.map((station, index) => {
                const isEditing = editingId === station.id;
                const isShowingHistory = historyStationId === station.id;
                const stationHref = getSafeExternalHref(station.url);

                return (
                  <div key={station.id}>
                    <article
                      className="grid grid-cols-[0.48fr_1.32fr_0.78fr_0.96fr_0.82fr_0.68fr_1.28fr] items-start gap-x-3 border-l-2 border-l-transparent px-5 py-4 transition-all duration-300 hover:border-l-[var(--color-brand)] hover:bg-[var(--color-hover)]"
                    >
                      {/* 排序 */}
                      <div className="font-bold text-[var(--color-muted)]">
                        {rankingBadge(index)}
                      </div>

                      {/* 站点 */}
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            className="cursor-pointer font-bold transition hover:text-[var(--color-brand)]"
                            onClick={() => setDetailStation(station)}
                            type="button"
                          >
                            {station.name}
                          </button>
                          <span className="rounded-full bg-[var(--color-brand-soft)] px-2.5 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                            {station.badge}
                          </span>
                          {(() => {
                            const fi = freshnessInfo(station.lastEditAt);
                            if (!fi) return null;
                            return (
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] ${
                                  fi.isRecent
                                    ? "text-[var(--color-brand-deep)]"
                                    : "text-[var(--color-muted)]"
                                }`}
                              >
                                <span
                                  className={`inline-block h-1.5 w-1.5 rounded-full ${
                                    fi.isRecent ? "bg-green-500" : "bg-[var(--color-muted)]"
                                  }`}
                                />
                                {fi.label}
                              </span>
                            );
                          })()}
                        </div>
                        {stationHref ? (
                          <a
                            href={stationHref}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="mt-2 inline-block line-clamp-2 text-sm leading-6 font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                          >
                            {station.entry || stationHref}
                          </a>
                        ) : (
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">
                            {station.groupName || station.entry}
                          </p>
                        )}
                      </div>

                      {/* 入口 / 地址 */}
                      <div className="text-sm leading-6 text-[var(--color-muted)]">
                        {stationHref ? (
                          <a
                            href={stationHref}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                          >
                            打开 →
                          </a>
                        ) : (
                          <span className="text-[var(--color-muted)]">待补</span>
                        )}
                        {/* Discussion button */}
                        <button
                          className="mt-2 flex items-center gap-1.5 text-xs text-[var(--color-muted)] transition hover:text-[var(--color-brand-deep)]"
                          onClick={() => setDiscussionStation(station)}
                          title="查看站点讨论"
                          type="button"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                          讨论区
                        </button>
                      </div>

                      {/* 收费方式 */}
                      <div>
                        <p className="font-bold">{station.packageType}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">
                          {station.models}
                        </p>
                      </div>

                      {/* 标称价格 */}
                      <div className="font-bold">{station.price}</div>

                      {/* 倍率 */}
                      <div className="font-bold">{station.multiplier}</div>

                      {/* 状态与社区备注 */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold">{station.status}</p>
                            <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--color-muted)]">
                              {station.note}
                            </p>
                          </div>
                          {isConnected && (
                            <button
                              className="shrink-0 text-[var(--color-muted)] hover:text-[var(--color-brand-deep)] transition"
                              onClick={() => startEdit(station)}
                              title="编辑此站点"
                              type="button"
                            >
                              ✎
                            </button>
                          )}
                        </div>
                        <button
                          className="mt-2 text-xs text-[var(--color-muted)] hover:text-[var(--color-brand-deep)] transition underline underline-offset-2"
                          onClick={() => toggleHistory(station.id)}
                          type="button"
                        >
                          {isShowingHistory ? "收起历史" : "历史"}
                        </button>
                      </div>
                    </article>

                    {/* Edit panel (below row) */}
                    {isEditing && renderEditPanel()}

                    {/* History panel (below row) */}
                    {isShowingHistory && renderHistoryPanel(station)}
                  </div>
                );
              })
              )}

              {/* Add-new button */}
              {isConnected && !addingNew && (
                <div className="px-6 py-4 border-t border-dashed border-[var(--color-line)]">
                  <button
                    className="rounded-full border border-dashed border-[var(--color-brand-soft)] bg-[var(--color-soft)] px-5 py-2.5 text-sm font-bold text-[var(--color-brand-deep)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                    onClick={startAdd}
                    type="button"
                  >
                    + 添加新站点
                  </button>
                </div>
              )}

              {/* Create panel (below all rows) */}
              {addingNew && renderCreatePanel()}
            </div>
          </div>

          {/* Table footer */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line)] px-5 py-4">
            <p className="text-sm leading-7 text-[var(--color-muted)]">
              {filteredRows.length === 0
                ? "没有匹配的站点，试试调整筛选条件。"
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

          <aside className="hidden xl:block">
            <div className="surface-in sticky top-24 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-4 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">右侧协作栏</p>
              <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
                这里只保留看表时最常用的辅助动作，不和总表抢视觉重心。
              </p>

              <div className="mt-4 grid gap-2.5">
                <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    当前显示
                  </p>
                  <p className="mt-2 text-lg font-black text-[var(--color-ink)]">
                    {visibleRows.length} / {filteredRows.length} 条
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    先把眼前这一批看完，再决定要不要展开更多样本。
                  </p>
                </div>

                <div className="rounded-[18px] bg-[var(--color-soft)] px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                    判断顺序
                  </p>
                  <p className="mt-2 text-sm font-black text-[var(--color-ink)]">倍率和门槛先看，备注后看</p>
                  <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                    详细口径更适合进历史或讨论区，不要把总表当长文看。
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-[var(--color-line)] pt-4">
                <Link
                  href="/community"
                  className="block rounded-full bg-[var(--color-brand)] px-5 py-3 text-center text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                >
                  进入站内讨论区
                </Link>
                <a
                  href="https://github.com/hfeng620-cmd/timin_api_test_and_forum/discussions"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-center text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                >
                  GitHub Discussions
                </a>
              </div>

              <div className="mt-4 space-y-2.5 border-t border-[var(--color-line)] pt-4 text-sm">
                <a
                  href="https://huhuai.xyz/register?aff=BCPA5AKW3KHX"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-[18px] bg-[var(--color-soft)] px-4 py-3 leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  虎虎注册链接：直接送额度
                </a>
                <a
                  href="https://www.kdocs.cn/l/cj84YbmlJswN"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-[18px] bg-[var(--color-soft)] px-4 py-3 leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  历史填表记录：以前群里有过填表送额度
                </a>
                <a
                  href="https://www.kdocs.cn/l/cr2932V6f6bH"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="block rounded-[18px] bg-[var(--color-soft)] px-4 py-3 leading-6 transition hover:text-[var(--color-brand-deep)]"
                >
                  API 中转站集合统计表：继续补更多站点
                </a>
              </div>

              <div className="mt-5 rounded-[18px] bg-[var(--color-soft)] px-4 py-3 text-sm leading-7 text-[var(--color-muted)]">
                <p className="font-semibold text-[var(--color-ink)]">QQ群 602190132</p>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ---- Submission ---- */}
      <section className="mx-auto max-w-[1680px] px-5 pb-16 lg:px-8">
        <SubmissionPanel />
      </section>

      {/* ---- Station Detail Modal ---- */}
      <StationDetailModal
        station={detailStation}
        open={detailStation !== null}
        onClose={() => setDetailStation(null)}
      />

      {/* ---- Station Discussion Modal ---- */}
      {discussionStation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="relative flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_20px_60px_rgba(0,0,0,0.3)]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--color-line)] px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-soft)]">
                  <svg className="h-5 w-5 text-[var(--color-brand-deep)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-[var(--color-ink)]">{discussionStation.name} 讨论区</h2>
                  <p className="text-xs text-[var(--color-muted)]">站点专属讨论空间</p>
                </div>
              </div>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                onClick={() => setDiscussionStation(null)}
                type="button"
                aria-label="关闭"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <DiscussionFeed
                  hideComposer={false}
                  title={`${discussionStation.name} 讨论`}
                  stationFilter={discussionStation.name}
                  showSyncButton={true}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick action FAB — bottom-right */}
      {isConnected && (
        <div className="fixed bottom-20 right-4 z-[60] lg:bottom-6">
          {quickMenuOpen && (
            <div className="surface-in mb-3 flex flex-col gap-2 rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel)] p-3 shadow-[0_12px_40px_rgba(15,23,42,0.14)]">
              <button
                className="whitespace-nowrap rounded-[12px] px-4 py-2.5 text-left text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
                onClick={() => { setQuickMenuOpen(false); setAddingNew(true); }}
                type="button"
              >
                ＋ 添加中转站
              </button>
              <button
                className="whitespace-nowrap rounded-[12px] px-4 py-2.5 text-left text-sm font-semibold text-[var(--color-ink)] transition hover:bg-[var(--color-soft)]"
                onClick={() => { setQuickMenuOpen(false); document.getElementById("station-search")?.focus(); }}
                type="button"
              >
                ✎ 编辑已有站点
              </button>
            </div>
          )}
          <button
            aria-label="站点操作"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-brand)] text-xl font-bold text-[var(--color-on-brand)] shadow-[0_8px_28px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)]"
            onClick={() => setQuickMenuOpen((v) => !v)}
            type="button"
          >
            {quickMenuOpen ? "✕" : "＋"}
          </button>
        </div>
      )}
    </>
  );
}
