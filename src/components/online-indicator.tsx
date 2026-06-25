"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useForumAuth } from "@/lib/forum-auth";

interface OnlineUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

const COLORS = ["#6366f1","#0ea5e9","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#14b8a6","#f97316","#84cc16","#06b6d4","#a855f7"];

function getColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

export function OnlineIndicator() {
  const { user, isConnected } = useForumAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [count, setCount] = useState(0);

  // Heartbeat ping + fetch online users
  useEffect(() => {
    if (!isSupabaseConfigured() || !isConnected || !user) return;

    const supabase = getSupabaseClient();

    async function ping() {
      try {
        // Upsert presence — use .update + .insert fallback for Supabase
        const now = new Date().toISOString();
        const { error: updateError } = await supabase
          .from("user_presence")
          .update({ last_seen: now })
          .eq("user_id", user!.id);

        // If update failed (row doesn't exist), insert
        if (updateError) {
          await supabase
            .from("user_presence")
            .upsert({ user_id: user!.id, last_seen: now }, { onConflict: "user_id" });
        }
      } catch { /* table may not exist yet */ }
    }

    async function fetchOnline() {
      try {
        const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data } = await supabase
          .from("user_presence")
          .select("user_id, last_seen, forum_profiles!inner(display_name, avatar_url)")
          .gt("last_seen", cutoff)
          .order("last_seen", { ascending: false })
          .limit(20);

        if (data) {
          const users: OnlineUser[] = (data as any[]).map((row: any) => ({
            id: row.user_id,
            display_name: row.forum_profiles?.display_name || "噜噜",
            avatar_url: row.forum_profiles?.avatar_url || null,
          }));
          setOnlineUsers(users);

          // Also get total count
          const { count: totalCount } = await supabase
            .from("user_presence")
            .select("*", { count: "exact", head: true })
            .gt("last_seen", cutoff);
          setCount(totalCount ?? users.length);
        }
      } catch { /* table may not exist yet */ }
    }

    ping();
    fetchOnline();
    const interval = setInterval(() => { ping(); fetchOnline(); }, 60_000);
    return () => clearInterval(interval);
  }, [isConnected, user]);

  // Always show, even when no one's online
  if (!isConnected || !user) {
    return (
      <span className="text-[11px] font-semibold text-[var(--color-muted)]">— 人在线</span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Avatar flow */}
      <div className="flex items-center -space-x-2">
        {onlineUsers.slice(0, 6).map((u) => (
          <div
            key={u.id}
            className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--color-panel)] text-[10px] font-bold text-white"
            style={{ backgroundColor: getColor(u.display_name) }}
            title={u.display_name}
          >
            {u.avatar_url ? (
              <img alt={u.display_name} className="h-full w-full object-cover" src={u.avatar_url} />
            ) : (
              u.display_name.charAt(0)
            )}
          </div>
        ))}
        {onlineUsers.length > 6 && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--color-panel)] bg-[var(--color-soft)] text-[10px] font-bold text-[var(--color-muted)]">
            +{Math.min(onlineUsers.length - 6, 99)}
          </div>
        )}
      </div>
      {/* Count */}
      <span className="text-[11px] font-semibold text-[var(--color-muted)] whitespace-nowrap">
        {count} 人在线
      </span>
    </div>
  );
}
