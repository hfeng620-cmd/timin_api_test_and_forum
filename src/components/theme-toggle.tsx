"use client";

import { useEffect, useState } from "react";

export const THEME_MODES = [
  {
    id: "signal",
    label: "信号板",
    description: "网格、数据线、桌面感。",
    response: "会随配色微调线条硬度与发光锐度。",
    accent: "linear-gradient(135deg, rgba(37,99,235,0.24), rgba(255,255,255,0.92))",
  },
  {
    id: "starfield",
    label: "星幕",
    description: "星点、雾光、深空感。",
    response: "会随配色微调星雾冷暖与高光密度。",
    accent: "radial-gradient(circle at 24% 26%, rgba(255,255,255,0.96) 0 10%, transparent 12%), radial-gradient(circle at 72% 34%, rgba(255,255,255,0.7) 0 8%, transparent 10%), linear-gradient(135deg, rgba(15,23,42,0.86), rgba(37,99,235,0.22))",
  },
  {
    id: "bubble",
    label: "气泡层",
    description: "漂浮圆泡、玻璃感、柔和。",
    response: "会随配色微调玻璃白度与浮层折射感。",
    accent: "radial-gradient(circle at 28% 30%, rgba(255,255,255,0.88) 0 16%, transparent 18%), radial-gradient(circle at 74% 70%, rgba(255,255,255,0.52) 0 12%, transparent 14%), linear-gradient(135deg, rgba(255,255,255,0.96), rgba(148,163,184,0.18))",
  },
  {
    id: "orbit",
    label: "轨道场",
    description: "环轨、雷达、轻 3D。",
    response: "会随配色微调结构感和轨道压迫度。",
    accent: "radial-gradient(circle at 74% 26%, transparent 0 18%, rgba(255,255,255,0.48) 19% 20%, transparent 21% 33%, rgba(255,255,255,0.28) 34% 35%, transparent 36%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(37,99,235,0.18))",
  },
  {
    id: "aurora",
    label: "流幕",
    description: "层幕、光带、官网感。",
    response: "会随配色微调幕光温度和边缘雾感。",
    accent: "linear-gradient(135deg, rgba(255,255,255,0.94), rgba(125,211,252,0.22)), radial-gradient(circle at 18% 72%, rgba(255,255,255,0.62), transparent 20%), linear-gradient(115deg, rgba(37,99,235,0.14), rgba(16,185,129,0.18), rgba(255,255,255,0))",
  },
  {
    id: "mist",
    label: "雾幕",
    description: "薄雾、留白、长内容页友好。",
    response: "会随配色微调雾层厚度与高光温度。",
    accent: "radial-gradient(circle at 20% 28%, rgba(255,255,255,0.9) 0 18%, transparent 24%), radial-gradient(circle at 78% 36%, rgba(255,255,255,0.54) 0 14%, transparent 22%), linear-gradient(135deg, rgba(255,255,255,0.95), rgba(148,163,184,0.14))",
  },
  {
    id: "linen",
    label: "亚麻纹",
    description: "纤维、织感、克制高级。",
    response: "会随配色微调纸纹冷暖与纹理颗粒。",
    accent: "linear-gradient(135deg, rgba(255,252,246,0.96), rgba(214,197,172,0.28)), repeating-linear-gradient(0deg, rgba(150,124,92,0.08) 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, rgba(255,255,255,0.22) 0 1px, transparent 1px 9px)",
  },
  {
    id: "paper",
    label: "纸感板",
    description: "纸纹、暖线、编辑稿感。",
    response: "会随配色微调纸张类型与压印暖度。",
    accent: "linear-gradient(135deg, rgba(255,248,237,0.96), rgba(224,197,161,0.3)), repeating-linear-gradient(0deg, rgba(172,122,73,0.08) 0 1px, transparent 1px 8px)",
  },
  {
    id: "velvet",
    label: "丝绒幕",
    description: "聚光、暗边、展陈感。",
    response: "会随配色微调边缘压暗与聚光柔顺度。",
    accent: "radial-gradient(circle at 50% 40%, rgba(255,255,255,0.62) 0 22%, transparent 44%), linear-gradient(135deg, rgba(15,23,42,0.16), rgba(255,255,255,0.12), rgba(15,23,42,0.36))",
  },
] as const;

export const PALETTES = [
  { id: "blue", label: "白蓝", note: "清爽默认", mood: "冷锐轻盈", swatch: "linear-gradient(135deg, #f7fbff, #2563eb)" },
  { id: "green", label: "苹果绿", note: "轻亮冷静", mood: "清透自然", swatch: "linear-gradient(135deg, #f6fbf8, #30d158)" },
  { id: "stone", label: "岩茶", note: "暖白琥珀", mood: "暖纸质感", swatch: "linear-gradient(135deg, #fbf7ef, #ff9500)" },
  { id: "sand", label: "香槟沙", note: "米金柔亮", mood: "展陈暖雾", swatch: "linear-gradient(135deg, #fcf7ef, #b28a54)" },
  { id: "graphite", label: "石墨灰", note: "中性专业", mood: "理性克制", swatch: "linear-gradient(135deg, #f4f6f9, #58657a)" },
  { id: "midnight", label: "深夜蓝", note: "深色克制", mood: "冷夜专注", swatch: "linear-gradient(135deg, #081120, #0a84ff)" },
  { id: "cyber", label: "终端绿", note: "黑绿信号", mood: "电子压强", swatch: "linear-gradient(135deg, #07120d, #30d158)" },
  { id: "ocean", label: "海雾青", note: "高级冷感", mood: "雾面海风", swatch: "linear-gradient(135deg, #f3fbfb, #0f8b8d)" },
  { id: "sage", label: "雾松绿", note: "柔和产品感", mood: "有机柔静", swatch: "linear-gradient(135deg, #f3f7f2, #567c6d)" },
  { id: "ember", label: "余烬橙", note: "暖调品牌感", mood: "暖光展厅", swatch: "linear-gradient(135deg, #fbf4ee, #c96a3d)" },
  { id: "pearl", label: "珍珠灰粉", note: "轻奢柔亮", mood: "柔雾轻奢", swatch: "linear-gradient(135deg, #fbf7fa, #b7797f)" },
] as const;

const APPEARANCE_PRESETS = [
  {
    id: "focus",
    label: "专注默认",
    description: "信息清楚、对比明确，适合日常浏览。",
    mode: "signal",
    palette: "blue",
  },
  {
    id: "night",
    label: "深夜观察",
    description: "更沉浸，适合夜间和长时间阅读。",
    mode: "starfield",
    palette: "midnight",
  },
  {
    id: "reading",
    label: "雾面阅读",
    description: "更适合资料页、榜单页和长内容阅读。",
    mode: "mist",
    palette: "graphite",
  },
  {
    id: "product",
    label: "柔和产品",
    description: "更像产品首页，适合轻氛围展示。",
    mode: "aurora",
    palette: "sage",
  },
  {
    id: "studio",
    label: "理性桌面",
    description: "更专业克制，适合工具页和信息密集页面。",
    mode: "signal",
    palette: "graphite",
  },
  {
    id: "editorial",
    label: "编辑稿面",
    description: "更克制的纸感和纤维纹理，适合长内容页。",
    mode: "linen",
    palette: "sand",
  },
  {
    id: "console",
    label: "终端监听",
    description: "更强的信号压感，适合深色技术氛围。",
    mode: "signal",
    palette: "cyber",
  },
  {
    id: "gallery",
    label: "展陈聚焦",
    description: "更强的聚焦感，适合做展示型页面。",
    mode: "velvet",
    palette: "pearl",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  mode: ThemeModeId;
  palette: PaletteId;
}>;

export type ThemeModeId = (typeof THEME_MODES)[number]["id"];
export type PaletteId = (typeof PALETTES)[number]["id"];
export type ThemeToggleView = "all" | "theme" | "palette";

type ThemeToggleInlineProps = {
  view?: ThemeToggleView;
  compact?: boolean;
};

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

export function ThemeToggleInline({ view = "all", compact = false }: ThemeToggleInlineProps) {
  const [mode, setMode] = useState<ThemeModeId>(DEFAULT_THEME_MODE);
  const [palette, setPalette] = useState<PaletteId>(DEFAULT_PALETTE);
  const activeMode = THEME_MODES.find((item) => item.id === mode) ?? THEME_MODES[0];
  const activePalette = PALETTES.find((item) => item.id === palette) ?? PALETTES[0];
  const darkPalette = palette === "midnight" || palette === "cyber";
  const showAll = view === "all";
  const showTheme = showAll || view === "theme";
  const showPalette = showAll || view === "palette";

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

  function handlePresetChange(nextMode: ThemeModeId, nextPalette: PaletteId) {
    setMode(nextMode);
    setPalette(nextPalette);
    syncTheme(nextMode, nextPalette);
  }

  return (
    <div
      className={
        compact
          ? ""
          : "rounded-[18px] border border-[var(--color-line)] bg-[color:color-mix(in_srgb,var(--color-panel)_82%,white)] p-3.5"
      }
    >
      {showAll ? (
        <>
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

          <div className="mt-4" id="appearance-summary">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              当前组合
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  主题
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-ink)]">{THEME_MODES.length} 套</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  配色
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-ink)]">{PALETTES.length} 组</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  预设
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-ink)]">{APPEARANCE_PRESETS.length} 组</p>
              </div>
              <div className="rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  方向
                </p>
                <p className="mt-1 text-sm font-black text-[var(--color-ink)]">{darkPalette ? "深层" : "明亮"}</p>
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <div className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  主题
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-10 w-10 shrink-0 rounded-[12px] border border-white/40"
                    style={{ background: activeMode.accent }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-ink)]">{activeMode.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                      决定背景板与整体氛围。
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  配色
                </p>
                <div className="mt-2 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-10 w-10 shrink-0 rounded-[12px] border border-white/40"
                    style={{ background: activePalette.swatch }}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[var(--color-ink)]">{activePalette.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                      决定按钮、描边与强调色。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4" id="appearance-presets">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            一键切整套
          </p>
          <span className="text-[10px] leading-5 text-[var(--color-muted)]">
            先选风格，再细调
          </span>
        </div>
        <div className="mt-2 grid gap-2">
          {APPEARANCE_PRESETS.map((item) => {
            const active = item.mode === mode && item.palette === palette;
            const presetMode = THEME_MODES.find((modeItem) => modeItem.id === item.mode) ?? THEME_MODES[0];
            const presetPalette =
              PALETTES.find((paletteItem) => paletteItem.id === item.palette) ?? PALETTES[0];

            return (
              <button
                key={item.id}
                className={`rounded-[16px] border px-3 py-3 text-left transition ${
                  active
                    ? "border-[var(--color-brand)] bg-[var(--color-brand-soft)] shadow-[0_10px_26px_var(--color-panel-glow)]"
                    : "border-[var(--color-line)] bg-[var(--color-panel-strong)] hover:border-[var(--color-brand)] hover:bg-[var(--color-soft)]"
                }`}
                onClick={() => handlePresetChange(item.mode, item.palette)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--color-ink)]">{item.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
                      {item.description}
                    </p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-muted)]">
                      {presetMode.label} x {presetPalette.label}
                    </p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="h-11 w-11 shrink-0 rounded-[14px] border border-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]"
                    style={{ background: `${presetMode.accent}, ${presetPalette.swatch}` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
          </div>
        </>
      ) : null}

      {showTheme ? (
      <div className={showAll ? "mt-4" : ""} id="appearance-theme-section">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          主题
        </p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
          换背景结构和气质，不动整站主色。
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
      ) : null}

      {showPalette ? (
      <div className={showAll ? "mt-4" : ""} id="appearance-palette-section">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          配色
        </p>
        <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
          换按钮、描边和强调色，不动背景层次。
        </p>
        <div className={`mt-2 grid grid-cols-2 gap-2 ${showAll ? "" : "sm:grid-cols-3"}`}>
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
      ) : null}

      {showAll ? (
      <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel-strong)]">
        <div
          aria-hidden="true"
          className="h-20 border-b border-[var(--color-line)]"
          style={{
            background: `${activeMode.accent}, ${activePalette.swatch}`,
          }}
        />
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--color-ink)]">
              {activeMode.label} x {activePalette.label}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
              主题继续负责背景板氛围，配色继续负责全站主色与面板倾向。
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-muted)]">
              {activePalette.mood} · {activeMode.response}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-deep)]">
            Preview
          </span>
        </div>
      </div>
      ) : null}
    </div>
  );
}

export const ThemeToggle = ThemeToggleInline;
