"use client";

import { useEffect, useState } from "react";

export const THEME_MODES = [
  {
    id: "signal",
    label: "信号板",
    description: "网格、数据线、桌面感。",
    accent: "linear-gradient(135deg, rgba(37,99,235,0.24), rgba(255,255,255,0.92))",
  },
  {
    id: "starfield",
    label: "星幕",
    description: "星点、雾光、深空感。",
    accent: "radial-gradient(circle at 24% 26%, rgba(255,255,255,0.96) 0 10%, transparent 12%), radial-gradient(circle at 72% 34%, rgba(255,255,255,0.7) 0 8%, transparent 10%), linear-gradient(135deg, rgba(15,23,42,0.86), rgba(37,99,235,0.22))",
  },
  {
    id: "bubble",
    label: "气泡层",
    description: "漂浮圆泡、玻璃感、柔和。",
    accent: "radial-gradient(circle at 28% 30%, rgba(255,255,255,0.88) 0 16%, transparent 18%), radial-gradient(circle at 74% 70%, rgba(255,255,255,0.52) 0 12%, transparent 14%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(148,163,184,0.18))",
  },
  {
    id: "orbit",
    label: "轨道场",
    description: "环轨、雷达、轻 3D。",
    accent: "radial-gradient(circle at 74% 26%, transparent 0 18%, rgba(255,255,255,0.48) 19% 20%, transparent 21% 33%, rgba(255,255,255,0.28) 34% 35%, transparent 36%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(37,99,235,0.18))",
  },
  {
    id: "aurora",
    label: "流幕",
    description: "层幕、光带、官网感。",
    accent: "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(125,211,252,0.22)), radial-gradient(circle at 18% 72%, rgba(255,255,255,0.62), transparent 20%), linear-gradient(115deg, rgba(37,99,235,0.14), rgba(16,185,129,0.18), rgba(255,255,255,0))",
  },
  {
    id: "paper",
    label: "纸感板",
    description: "纸纹、暖线、编辑稿感。",
    accent: "linear-gradient(135deg, rgba(255,248,237,0.96), rgba(224,197,161,0.3)), repeating-linear-gradient(0deg, rgba(172,122,73,0.08) 0 1px, transparent 1px 8px)",
  },
] as const;

export const PALETTES = [
  { id: "blue", label: "白蓝", note: "清爽默认", swatch: "linear-gradient(135deg, #f7fbff, #2563eb)" },
  { id: "green", label: "苹果绿", note: "轻亮冷静", swatch: "linear-gradient(135deg, #f6fbf8, #30d158)" },
  { id: "stone", label: "岩茶", note: "暖白琥珀", swatch: "linear-gradient(135deg, #fbf7ef, #ff9500)" },
  { id: "midnight", label: "深夜蓝", note: "深色克制", swatch: "linear-gradient(135deg, #081120, #0a84ff)" },
  { id: "cyber", label: "终端绿", note: "黑绿信号", swatch: "linear-gradient(135deg, #07120d, #30d158)" },
  { id: "ocean", label: "海雾青", note: "高级冷感", swatch: "linear-gradient(135deg, #f3fbfb, #0f8b8d)" },
  { id: "sage", label: "雾松绿", note: "柔和产品感", swatch: "linear-gradient(135deg, #f3f7f2, #567c6d)" },
  { id: "ember", label: "余烬橙", note: "暖调品牌感", swatch: "linear-gradient(135deg, #fbf4ee, #c96a3d)" },
  { id: "pearl", label: "珍珠灰粉", note: "轻奢柔亮", swatch: "linear-gradient(135deg, #fbf7fa, #b7797f)" },
] as const;

export type ThemeModeId = (typeof THEME_MODES)[number]["id"];
export type PaletteId = (typeof PALETTES)[number]["id"];

const THEME_MODE_KEY = "relay-theme-mode-v1";
const THEME_PALETTE_KEY = "relay-theme-palette-v1";
const DEFAULT_THEME_MODE: ThemeModeId = "signal";
const DEFAULT_PALETTE: PaletteId = "blue";

const themeModeIds = new Set<string>(THEME_MODES.map((mode) => mode.id));
const paletteIds = new Set<string>(PALETTES.map((palette) => palette.id));

function resolveStoredThemeMode(): ThemeModeId {
  if (typeof window === "undefined") return DEFAULT_THEME_MODE;

  const stored = window.localStorage.getItem(THEME_MODE_KEY);
  if (stored === "night") {
    return "starfield";
  }
  if (stored && themeModeIds.has(stored)) {
    return stored as ThemeModeId;
  }

  const fromDataset = document.documentElement.dataset.themeMode;
  if (fromDataset === "night") {
    return "starfield";
  }
  if (fromDataset && themeModeIds.has(fromDataset)) {
    return fromDataset as ThemeModeId;
  }

  return DEFAULT_THEME_MODE;
}

function resolveStoredPalette(): PaletteId {
  if (typeof window === "undefined") return DEFAULT_PALETTE;

  const stored = window.localStorage.getItem(THEME_PALETTE_KEY);
  if (stored && paletteIds.has(stored)) {
    return stored as PaletteId;
  }

  const fromDataset = document.documentElement.dataset.theme;
  if (fromDataset && paletteIds.has(fromDataset)) {
    return fromDataset as PaletteId;
  }

  return DEFAULT_PALETTE;
}

function syncTheme(mode: ThemeModeId, palette: PaletteId) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.dataset.theme = palette;

  window.localStorage.setItem(THEME_MODE_KEY, mode);
  window.localStorage.setItem(THEME_PALETTE_KEY, palette);
}

export function ThemeToggleInline() {
  const [mode, setMode] = useState<ThemeModeId>(DEFAULT_THEME_MODE);
  const [palette, setPalette] = useState<PaletteId>(DEFAULT_PALETTE);

  useEffect(() => {
    const nextMode = resolveStoredThemeMode();
    const nextPalette = resolveStoredPalette();

    setMode(nextMode);
    setPalette(nextPalette);
    syncTheme(nextMode, nextPalette);
  }, []);

  function handleModeChange(nextMode: ThemeModeId) {
    setMode(nextMode);
    syncTheme(nextMode, palette);
  }

  function handlePaletteChange(nextPalette: PaletteId) {
    setPalette(nextPalette);
    syncTheme(mode, nextPalette);
  }

  return (
    <div className="rounded-[18px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_82%,white)] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--color-ink)]">外观中心</p>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
            主题控制背景板氛围，配色控制整站色系，两者独立组合。
          </p>
        </div>
        <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
          Live
        </span>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          主题
        </p>
        <div className="mt-2 grid gap-2">
          {THEME_MODES.map((item) => {
            const active = item.id === mode;

            return (
              <button
                key={item.id}
                className={`flex items-center gap-3 rounded-[16px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_10px_26px_var(--color-panel-glow)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel-strong)] hover:border-[var(--color-brand)] hover:bg-[var(--color-soft)]"
                }`}
                onClick={() => handleModeChange(item.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="h-11 w-11 shrink-0 rounded-[14px] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                  style={{ background: item.accent }}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-bold text-[var(--color-ink)]">{item.label}</span>
                    {active ? (
                      <span className="rounded-full bg-[var(--color-brand)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-on-brand)]">
                        当前
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          配色
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {PALETTES.map((item) => {
            const active = item.id === palette;

            return (
              <button
                key={item.id}
                className={`rounded-[16px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_10px_26px_var(--color-panel-glow)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel-strong)] hover:border-[var(--color-brand)] hover:bg-[var(--color-soft)]"
                }`}
                onClick={() => handlePaletteChange(item.id)}
                type="button"
              >
                <span
                  aria-hidden="true"
                  className="block h-9 rounded-[12px] border border-white/40"
                  style={{ background: item.swatch }}
                />
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-bold text-[var(--color-ink)]">{item.label}</span>
                  {active ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--color-brand)]" />
                  ) : null}
                </span>
                <span className="mt-1 block text-[11px] leading-5 text-[var(--color-muted)]">{item.note}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const ThemeToggle = ThemeToggleInline;
