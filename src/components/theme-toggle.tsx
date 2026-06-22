"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "blue", label: "白蓝" },
  { id: "green", label: "白绿" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function readSavedTheme(): ThemeId {
  if (typeof window === "undefined") {
    return "blue";
  }

  return window.localStorage.getItem("relay-theme") === "green"
    ? "green"
    : "blue";
}

function syncTheme(theme: ThemeId) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem("relay-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeId>(readSavedTheme);

  useEffect(() => {
    syncTheme(theme);
  }, [theme]);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-white p-1 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      {THEMES.map((item) => (
        <button
          key={item.id}
          className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
            theme === item.id
              ? "bg-[var(--color-ink)] text-white"
              : "text-[var(--color-muted)] hover:bg-[var(--color-soft)]"
          }`}
          onClick={() => setTheme(item.id)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
