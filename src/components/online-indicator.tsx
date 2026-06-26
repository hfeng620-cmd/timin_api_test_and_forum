"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useForumAuth } from "@/lib/forum-auth";

interface OnlineUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface PresenceRow {
  user_id: string;
  last_seen: string;
}

interface ProfileRow {
  id: string;
  display_name: string | null;
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

  // Fetch online users (for everyone, not just logged-in users)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();

    async function fetchOnline() {
      try {
        const cutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();

        // First get the count
        const { count: totalCount, error: countError } = await supabase
          .from("user_presence")
          .select("*", { count: "exact", head: true })
          .gt("last_seen", cutoff);

        if (countError) {
          console.error("[OnlineIndicator] Count error:", countError);
          return;
        }

        setCount(totalCount ?? 0);

        // Then get the recent presence rows
        const { data, error: queryError } = await supabase
          .from("user_presence")
          .select("user_id, last_seen")
          .gt("last_seen", cutoff)
          .order("last_seen", { ascending: false })
          .limit(20);

        if (queryError) {
          console.error("[OnlineIndicator] Query error:", queryError);
          return;
        }

        const presenceRows = (data ?? []) as PresenceRow[];

        if (presenceRows.length === 0) {
          setOnlineUsers([]);
          return;
        }

        const latestPresenceByUser = new Map<string, PresenceRow>();
        for (const row of presenceRows) {
          if (!row.user_id || latestPresenceByUser.has(row.user_id)) continue;
          latestPresenceByUser.set(row.user_id, row);
        }

        const userIds = Array.from(latestPresenceByUser.keys());

        if (userIds.length === 0) {
          setOnlineUsers([]);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("forum_profiles")
          .select("id, display_name, avatar_url")
          .in("id", userIds);

        if (profileError) {
          console.error("[OnlineIndicator] Profile query error:", profileError);
          return;
        }

        const profilesById = new Map<string, ProfileRow>();
        for (const profile of (profileData ?? []) as ProfileRow[]) {
          profilesById.set(profile.id, profile);
        }

        const users: OnlineUser[] = userIds.map((userId) => {
          const profile = profilesById.get(userId);
          return {
            id: userId,
            display_name: profile?.display_name || "用户",
            avatar_url: profile?.avatar_url || null,
          };
        });

        setOnlineUsers(users);
      } catch (err) {
        console.error("[OnlineIndicator] Fetch error:", err);
      }
    }

    fetchOnline();
    const interval = setInterval(fetchOnline, 15_000); // 每15秒刷新，更及时显示在线状态
    return () => clearInterval(interval);
  }, []);

  // Heartbeat ping (only for logged-in users)
  useEffect(() => {
    if (!isSupabaseConfigured() || !isConnected || !user) return;

    const supabase = getSupabaseClient();
    let retryCount = 0;
    const maxRetries = 3;

    async function ping() {
      try {
        const now = new Date().toISOString();

        // Use upsert directly - simpler and more reliable
        const { error } = await supabase
          .from("user_presence")
          .upsert(
            { user_id: user!.id, last_seen: now },
            { onConflict: "user_id" }
          );

        if (error) {
          console.error("[OnlineIndicator] Ping error:", error);
          retryCount++;
          if (retryCount < maxRetries) {
            // Retry after 2 seconds
            setTimeout(ping, 2000);
          }
        } else {
          retryCount = 0; // Reset on success
        }
      } catch (err) {
        console.error("[OnlineIndicator] Ping exception:", err);
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(ping, 2000);
        }
      }
    }

    // Ping immediately, then every 20 seconds (more frequent for better accuracy)
    ping();
    const interval = setInterval(ping, 20_000);
    return () => clearInterval(interval);
  }, [isConnected, user]);

  // Always show, even when no one's online
  return (
    <div className="flex items-center gap-2">
      {/* Avatar flow */}
      <div className="flex items-center -space-x-2">
        {onlineUsers.slice(0, 6).map((u) => (
          <div
            key={u.id}
            className={`flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 text-[10px] font-bold text-white ${
              user && u.id === user.id
                ? "border-[var(--color-brand)] ring-2 ring-[var(--color-brand)]/30"
                : "border-[var(--color-panel)]"
            }`}
            style={{ backgroundColor: getColor(u.display_name) }}
            title={user && u.id === user.id ? `${u.display_name} (我)` : u.display_name}
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
      {/* Count with status indicator */}
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <span className="text-[11px] font-semibold text-[var(--color-muted)] whitespace-nowrap">
          {count} 人在线
        </span>
      </div>
    </div>
  );
}
