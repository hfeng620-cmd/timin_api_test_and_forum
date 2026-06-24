"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { StationDetailModal } from "@/components/station-detail-modal";
import { SubmissionPanel } from "@/components/submission-panel";
import { useForumAuth } from "@/lib/forum-auth";
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
  const { isConnected, displayName } = useForumAuth();

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

  // ---- detail modal -------------------------------------------------------
  const [detailStation, setDetailStation] = useState<Station | null>(null);

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
    // 10s fallback — don't hang forever if Supabase is unreachable
    const timeout = setTimeout(() => {
      if (!cancelled && loading) {
        setError("加载超时，请刷新页面重试。");
        setLoading(false);
      }
    }, 10_000);
    loadStations()
      .then((data) => {
        clearTimeout(timeout);
        if (!cancelled) { setStations(data); setLoading(false); }
      })
      .catch(() => {
        clearTimeout(timeout);
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <button
            className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
            onClick={() => editingId && handleDelete(editingId)}
            type="button"
          >
            删除站点
          </button>
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

            {/* Featured hero cards */}
            {featuredStations.length > 0 && (
              <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {featuredStations.map((station, index) => {
                  const cardContent = (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                            {rankingBadge(index)}
                          </p>
                          <h2 className="mt-2 text-2xl font-black">{station.name}</h2>
                        </div>
                        <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                          {station.badge}
                        </span>
                      </div>

                      <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">{station.note}</p>

                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--color-line)] pt-4 text-sm">
                        <div>
                          <p className="text-[var(--color-muted)]">价格</p>
                          <p className="mt-1 font-black">{station.price}</p>
                        </div>
                        <div>
                          <p className="text-[var(--color-muted)]">倍率</p>
                          <p className="mt-1 font-black">{station.multiplier}</p>
                        </div>
                      </div>

                      {station.url && (
                        <div className="mt-5 inline-flex items-center text-sm font-bold text-[var(--color-brand-deep)]">
                          打开站点入口
                          <span className="ml-2 transition-all duration-300 group-hover:translate-x-1.5">→</span>
                        </div>
                      )}
                    </>
                  );

                  if (station.url) {
                    return (
                      <a
                        key={`${station.id}-hero`}
                        href={station.url}
                        rel="noreferrer"
                        target="_blank"
                        className="stagger-in card-lift group min-h-[238px] rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-[4px] hover:border-[var(--color-brand)] hover:shadow-[0_28px_72px_rgba(15,23,42,0.10)]"
                      >
                        {cardContent}
                      </a>
                    );
                  }

                  return (
                    <div
                      key={`${station.id}-hero`}
                      className="stagger-in card-lift group min-h-[238px] rounded-[20px] border border-[var(--color-line)] bg-[var(--surface-gradient)] p-6 shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-[4px] hover:border-[var(--color-brand)] hover:shadow-[0_28px_72px_rgba(15,23,42,0.10)]"
                    >
                      {cardContent}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Search / filter panel */}
            <div className="surface-in mt-8 rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    快速查找
                  </p>
                  <h2 className="mt-2 text-2xl font-black">搜索 / 筛选</h2>
                </div>
                <p className="text-sm text-[var(--color-muted)]">
                  找到 <span className="font-bold text-[var(--color-ink)]">{filteredRows.length}</span> 个站点
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[280px]">
                  <input
                    ref={searchInputRef}
                    className="w-full rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] pl-5 pr-[88px] py-3.5 text-sm outline-none transition focus:border-[var(--color-brand)] focus:bg-white"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜站点名、倍率、试用、免费、Claude、Grok、入口域名都可以"
                    value={query}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {query && (
                      <button
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-[var(--color-line)] hover:text-[var(--color-ink)] transition"
                        onClick={() => { setQuery(""); setDebouncedQuery(""); }}
                        type="button"
                        aria-label="清除搜索"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                    <span className="text-[11px] text-[var(--color-muted)] border border-[var(--color-line)] rounded-md px-1.5 py-0.5 select-none leading-tight">
                      Ctrl+K
                    </span>
                  </div>
                </div>
                <select
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3.5 text-sm outline-none transition focus:border-[var(--color-brand)] cursor-pointer appearance-none text-[var(--color-ink)]"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right 14px center",
                    paddingRight: "36px",
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
                        ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] pill-pulse"
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

          {/* ---- Sidebar ---- */}
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

      {/* ---- Table ---- */}
      <section className="mx-auto max-w-7xl px-6 pb-14 lg:px-10">
        <div className="surface-in overflow-hidden rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
          {/* Table header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--color-line)] px-6 py-5">
            <div>
              <h2 className="text-3xl font-black">中转站总表</h2>
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
                        {station.url ? (
                          <a
                            href={station.url}
                            rel="noreferrer"
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
            <div className="min-w-[1180px]">
              {/* Column headers */}
              <div className="grid grid-cols-[0.8fr_1.05fr_1fr_0.92fr_0.9fr_0.8fr_1.3fr] bg-[var(--color-soft)] px-6 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                <span>排序</span>
                <span>站点</span>
                <span>入口 / 地址</span>
                <span>收费方式</span>
                <span>标称价格</span>
                <span>倍率</span>
                <span>状态与社区备注</span>
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

                return (
                  <div key={station.id}>
                    <article
                      className="grid grid-cols-[0.8fr_1.05fr_1fr_0.92fr_0.9fr_0.8fr_1.3fr] items-start border-l-2 border-l-transparent px-6 py-5 transition-all duration-300 hover:border-l-[var(--color-brand)] hover:bg-[var(--color-hover)]"
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
                        {station.url ? (
                          <a
                            href={station.url}
                            rel="noreferrer"
                            target="_blank"
                            className="mt-2 inline-block text-sm leading-6 font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                          >
                            {station.entry || station.url}
                          </a>
                        ) : (
                          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                            {station.groupName || station.entry}
                          </p>
                        )}
                      </div>

                      {/* 入口 / 地址 */}
                      <div className="text-sm leading-6 text-[var(--color-muted)]">
                        {station.url ? (
                          <a
                            href={station.url}
                            rel="noreferrer"
                            target="_blank"
                            className="font-semibold text-[var(--color-brand-deep)] transition hover:text-[var(--color-brand)]"
                          >
                            打开 →
                          </a>
                        ) : (
                          <span className="text-[var(--color-muted)]">待补</span>
                        )}
                      </div>

                      {/* 收费方式 */}
                      <div>
                        <p className="font-bold">{station.packageType}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
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
                            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
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
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-line)] px-6 py-5">
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
      </section>

      {/* ---- Submission ---- */}
      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <SubmissionPanel />
      </section>

      {/* ---- Station Detail Modal ---- */}
      <StationDetailModal
        station={detailStation}
        open={detailStation !== null}
        onClose={() => setDetailStation(null)}
      />
    </>
  );
}
