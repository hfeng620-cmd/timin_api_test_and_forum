"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";

const MONTH_NAMES = [
  "1月","2月","3月","4月","5月","6月",
  "7月","8月","9月","10月","11月","12月",
];

export function RegisterCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseClient();
    const run = async () => {
      const { count: c } = await supabase
        .from("forum_profiles")
        .select("*", { count: "exact", head: true });
      if (c !== null) setCount(c);
    };
    run().catch(() => {});
  }, []);

  if (count === null) return null;

  const now = new Date();
  const month = MONTH_NAMES[now.getMonth()];
  const day = now.getDate();

  return (
    <div className="fixed bottom-4 right-4 z-[60] pointer-events-none select-none">
      <div className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)]/95 px-4 py-2 text-xs font-semibold text-[var(--color-muted)] shadow-[var(--shadow-card)] backdrop-blur-sm">
        截止{month}{day}日 · 站内已累计注册 {count} 人
      </div>
    </div>
  );
}
