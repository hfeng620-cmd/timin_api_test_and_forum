"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

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
import {
  deleteDiscussionPost,
  getForumStats,
  type ForumStats,
} from "@/lib/discussion-storage";

type AdminTab = "posts" | "stations" | "import" | "news" | "admins" | "users";

const ANNOUNCEMENT_LIMITS = {
  station: 120,
  body: 2000,
} as const;

const NEWS_LIMITS = {
  title: 200,
  summary: 1000,
  source: 100,
  author: 100,
  body: 6000,
} as const;

async function isForumAdmin(): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user?.id) return false;
    // Use security-definer RPC that checks both forum_admins and site_owners
    const { data } = await supabase.rpc("is_forum_admin", { check_user_id: userData.user.id });
    return Boolean(data);
  } catch {
    return false;
  }
}

type AuditEntry = {
  id: string;
  action: string;
  target: string;
  time: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }
  return fallback;
}

function formatLastSeen(lastSeen: string): string {
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export default function AdminPage() {
  const { isConnected, isAdmin, isOwner, email, showAuthModal } = useForumAuth();
  const [adminChecked, setAdminChecked] = useState(false);
  const [adminOk, setAdminOk] = useState(false);
  const [adminLoading, setAdminLoading] = useState(!isConnected);

  // Existing state — fully preserved
  const [stations, setStations] = useState<HomeFeaturedStation[]>(
    () => loadFeaturedStationDrafts() ?? homeFeaturedStations,
  );
  const [importText, setImportText] = useState(() =>
    JSON.stringify(loadFeaturedStationDrafts() ?? homeFeaturedStations, null, 2),
  );
  const [status, setStatus] = useState("管理员面板就绪。可在此审核帖子、管理站点数据和导入导出配置。");
  const [submissions, setSubmissions] = useState<StationSubmission[]>(() =>
    loadStationSubmissions(),
  );
  const [forumHistory, setForumHistory] = useState<
    { id: string; body: string; status: "approved" | "rejected"; time: string }[]
  >([]);
  const [forumHistoryLoaded, setForumHistoryLoaded] = useState(false);
  const [forumHistoryError, setForumHistoryError] = useState(false);

  // New state
  const [activeTab, setActiveTab] = useState<AdminTab>("posts");
  const [stats, setStats] = useState<ForumStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [announceBody, setAnnounceBody] = useState("");
  const [announceStation, setAnnounceStation] = useState("");
  const [announceSending, setAnnounceSending] = useState(false);
  const [announceStatus, setAnnounceStatus] = useState("");
  const [announceConfirmOpen, setAnnounceConfirmOpen] = useState(false);
  const [announcePopupChecked, setAnnouncePopupChecked] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // ---- News state ----
  const [pendingNews, setPendingNews] = useState<
    { id: string; title: string; summary: string; source: string; author: string; body?: string; created_at: string }[]
  >([]);
  const [pendingNewsLoading, setPendingNewsLoading] = useState(false);
  const [approvedNews, setApprovedNews] = useState<
    { id: string; title: string; summary: string; source: string; author: string; body?: string; created_at: string; is_hidden: boolean }[]
  >([]);
  const [approvedNewsLoading, setApprovedNewsLoading] = useState(false);
  const [newsForm, setNewsForm] = useState({ title: "", summary: "", source: "", author: "", body: "" });
  const [newsFormSending, setNewsFormSending] = useState(false);
  const [newsFormStatus, setNewsFormStatus] = useState("");
  const [newsStatus, setNewsStatus] = useState("");
  const [newsActionId, setNewsActionId] = useState<string | null>(null);

  // ---- Owner: admin management state ----
  const [adminList, setAdminList] = useState<
    { user_id: string; email: string; display_name: string; created_at: string }[]
  >([]);
  const [adminListLoading, setAdminListLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addAdminLoading, setAddAdminLoading] = useState(false);
  const [addAdminStatus, setAddAdminStatus] = useState("");

  // ---- User management state ----
  const [userList, setUserList] = useState<
    { id: string; display_name: string; avatar_url: string | null; created_at: string; isAdmin: boolean; email: string; last_seen: string | null; is_online: boolean }[]
  >([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userActionStatus, setUserActionStatus] = useState("");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const statsRequestRef = useRef(0);
  const forumHistoryRequestRef = useRef(0);
  const pendingNewsRequestRef = useRef(0);
  const approvedNewsRequestRef = useRef(0);
  const adminListRequestRef = useRef(0);
  const userListRequestRef = useRef(0);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load users + admin status + online presence
  const loadUsers = useCallback(async () => {
    const requestId = ++userListRequestRef.current;
    setUserListLoading(true);
    try {
      const supabase = getSupabaseClient();

      // Try the enhanced RPC first (includes email, last_seen, is_online)
      let rpcUsers: { id: string; display_name: string; avatar_url: string | null; created_at: string; isAdmin: boolean; email: string; last_seen: string | null; is_online: boolean }[] | null = null;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_admin_user_list");
        if (rpcError) throw rpcError;
        if (rpcData && (rpcData as any[]).length > 0) {
          // Need admin IDs for the isAdmin flag
          const adminsRes = await supabase.from("forum_admins").select("user_id");
          if (adminsRes.error) throw adminsRes.error;
          const adminIds = new Set(((adminsRes.data ?? []) as { user_id: string }[]).map((a) => a.user_id));
          rpcUsers = (rpcData as any[]).map((u: any) => ({
            id: u.user_id,
            display_name: u.display_name,
            avatar_url: u.avatar_url,
            created_at: u.created_at ?? "",
            isAdmin: adminIds.has(u.user_id),
            email: u.email || "—",
            last_seen: u.last_seen ?? null,
            is_online: Boolean(u.is_online),
          }));
        }
      } catch {
        // RPC may not exist; fall back to current behavior
      }

      if (rpcUsers) {
        if (!isMountedRef.current || requestId !== userListRequestRef.current) return;
        setUserList(rpcUsers);
        setUserActionStatus("");
      } else {
        // Fallback: original behavior without online status
        const [profilesRes, adminsRes] = await Promise.all([
          supabase.from("forum_profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(100),
          supabase.from("forum_admins").select("user_id"),
        ]);
        if (profilesRes.error) throw profilesRes.error;
        if (adminsRes.error) throw adminsRes.error;
        const adminIds = new Set(((adminsRes.data ?? []) as { user_id: string }[]).map((a) => a.user_id));
        // Try to get emails via RPC
        const emailMap: Record<string, string> = {};
        try {
          const { data: emailData, error } = await supabase.rpc("get_admin_list");
          if (error) throw error;
          if (emailData) {
            for (const row of (emailData as any[])) {
              emailMap[row.user_id] = row.email || "";
            }
          }
        } catch {
          // RPC may not exist; user list can still render without emails
        }
        const users = ((profilesRes.data ?? []) as any[]).map((u: any) => ({
          id: u.id,
          display_name: u.display_name,
          avatar_url: u.avatar_url,
          created_at: u.created_at,
          isAdmin: adminIds.has(u.id),
          email: emailMap[u.id] || "—",
          last_seen: null as string | null,
          is_online: false,
        }));
        if (!isMountedRef.current || requestId !== userListRequestRef.current) return;
        setUserList(users);
        setUserActionStatus("");
      }
    } catch (error) {
      if (!isMountedRef.current || requestId !== userListRequestRef.current) return;
      setUserActionStatus(`用户列表加载失败：${getErrorMessage(error, "请稍后重试。")}`);
    } finally {
      if (!isMountedRef.current || requestId !== userListRequestRef.current) return;
      setUserListLoading(false);
    }
  }, []);

  // Promote/demote user
  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    setTogglingUserId(userId);
    setUserActionStatus("");
    try {
      if (makeAdmin) {
        const { error } = await getSupabaseClient().from("forum_admins").insert({ user_id: userId });
        if (error) throw error;
      } else {
        const { error } = await getSupabaseClient().from("forum_admins").delete().eq("user_id", userId);
        if (error) throw error;
      }
      await loadUsers();
      setUserActionStatus(makeAdmin ? "已授予管理员权限。" : "已取消管理员权限。");
    } catch (error) {
      setUserActionStatus(`操作失败：${getErrorMessage(error, "未知错误")}`);
    } finally {
      setTogglingUserId(null);
    }
  }

  useEffect(() => {
    if (adminOk && activeTab === "users") loadUsers();
  }, [adminOk, activeTab, loadUsers]);

  // ---- Admin check (context-driven; fall back to RPC for belt-and-suspenders) ----
  useEffect(() => {
    if (!isConnected) {
      setAdminChecked(true);
      setAdminOk(false);
      setAdminLoading(false);
      return;
    }
    // If context already says admin/owner we can short-circuit
    if (isAdmin || isOwner) {
      setAdminOk(true);
      setAdminChecked(true);
      setAdminLoading(false);
      return;
    }
    let cancelled = false;
    isForumAdmin()
      .then((ok) => {
        if (cancelled) return;
        setAdminOk(ok);
        setAdminChecked(true);
        setAdminLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAdminOk(false);
        setAdminChecked(true);
        setAdminLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, isAdmin, isOwner]);

  // ---- Load forum stats ----
  const refreshStats = useCallback(async () => {
    const requestId = ++statsRequestRef.current;
    setStatsLoading(true);
    try {
      const nextStats = await getForumStats();
      if (!isMountedRef.current || requestId !== statsRequestRef.current) return;
      setStats(nextStats);
    } catch (error) {
      if (!isMountedRef.current || requestId !== statsRequestRef.current) return;
      setStatus(`论坛统计加载失败：${getErrorMessage(error, "请稍后刷新重试。")}`);
    } finally {
      if (!isMountedRef.current || requestId !== statsRequestRef.current) return;
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!adminOk) return;
    void refreshStats();
  }, [adminOk, refreshStats]);

  // ---- Load approved posts (existing logic preserved) ----
  const refreshForumHistory = useCallback(async () => {
    if (!isConnected || !adminOk) return;
    const requestId = ++forumHistoryRequestRef.current;
    setForumHistoryLoaded(false);
    setForumHistoryError(false);
    try {
      const { data, error } = await getSupabaseClient()
        .from("forum_posts")
        .select("id, body, created_at")
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      if (!isMountedRef.current || requestId !== forumHistoryRequestRef.current) return;
      setForumHistory(
        ((data ?? []) as { id: string; body: string; created_at: string }[]).map((row) => ({
          id: row.id,
          body: row.body,
          status: "approved" as const,
          time: row.created_at,
        })),
      );
    } catch (error) {
      if (!isMountedRef.current || requestId !== forumHistoryRequestRef.current) return;
      setForumHistoryError(true);
      setStatus(`论坛帖子加载失败：${getErrorMessage(error, "请确认管理员权限。")}`);
    } finally {
      if (!isMountedRef.current || requestId !== forumHistoryRequestRef.current) return;
      setForumHistoryLoaded(true);
    }
  }, [adminOk, isConnected]);

  useEffect(() => {
    if (!isConnected || !adminOk) return;
    void refreshForumHistory();
  }, [isConnected, adminOk, refreshForumHistory]);

  useEffect(() => {
    if (!announceConfirmOpen) return;
    function handleDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAnnounceConfirmOpen(false);
      }
    }
    window.addEventListener("keydown", handleDialogKeyDown);
    return () => window.removeEventListener("keydown", handleDialogKeyDown);
  }, [announceConfirmOpen]);

  // ---- Load pending news ----
  const refreshPendingNews = useCallback(async () => {
    if (!adminOk) return;
    const requestId = ++pendingNewsRequestRef.current;
    setPendingNewsLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from("ai_news")
        .select("id, title, summary, source, author, body, created_at")
        .eq("is_approved", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!isMountedRef.current || requestId !== pendingNewsRequestRef.current) return;
      setPendingNews((data as any[]) ?? []);
    } catch (error) {
      if (!isMountedRef.current || requestId !== pendingNewsRequestRef.current) return;
      setNewsStatus(`待审核新闻加载失败：${getErrorMessage(error, "请稍后刷新重试。")}`);
    } finally {
      if (!isMountedRef.current || requestId !== pendingNewsRequestRef.current) return;
      setPendingNewsLoading(false);
    }
  }, [adminOk]);

  useEffect(() => {
    if (!adminOk) return;
    void refreshPendingNews();
  }, [adminOk, refreshPendingNews]);

  // ---- Load approved news ----
  const refreshApprovedNews = useCallback(async () => {
    if (!adminOk) return;
    const requestId = ++approvedNewsRequestRef.current;
    setApprovedNewsLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from("ai_news")
        .select("id, title, summary, source, author, body, created_at, is_hidden")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!isMountedRef.current || requestId !== approvedNewsRequestRef.current) return;
      setApprovedNews((data as any[]) ?? []);
    } catch (error) {
      if (!isMountedRef.current || requestId !== approvedNewsRequestRef.current) return;
      setNewsStatus(`已发布新闻加载失败：${getErrorMessage(error, "请稍后刷新重试。")}`);
    } finally {
      if (!isMountedRef.current || requestId !== approvedNewsRequestRef.current) return;
      setApprovedNewsLoading(false);
    }
  }, [adminOk]);

  useEffect(() => {
    if (!adminOk) return;
    void refreshApprovedNews();
  }, [adminOk, refreshApprovedNews]);

  function addAudit(action: string, target: string) {
    setAuditLog((prev) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action,
        target,
        time: new Date().toLocaleString("zh-CN"),
      },
      ...prev.slice(0, 49),
    ]);
  }

  // ---- Existing handlers preserved verbatim ----
  function updateStation(index: number, field: keyof HomeFeaturedStation, value: string) {
    setStations((current) =>
      current.map((station, si) =>
        si === index ? { ...station, [field]: value } : station,
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
    addAudit(
      statusValue === "approved" ? "通过站点提交" : "驳回站点提交",
      target?.stationName ?? id,
    );
  }

  // ---- New: delete approved post ----
  async function handleDeletePost(postId: string) {
    setDeletingPostId(postId);
    try {
      await deleteDiscussionPost(postId);
      setForumHistory((prev) => prev.filter((p) => p.id !== postId));
      setStatus("帖子已删除（隐藏）。");
      addAudit("删除帖子", postId);
      void refreshStats();
    } catch (error) {
      setStatus(`删除失败：${getErrorMessage(error, "请确认管理员权限。")}`);
    } finally {
      setDeletingPostId(null);
    }
  }

  // ---- New: publish announcement ----
  function handleAnnouncementClick() {
    const body = announceBody.trim();
    const station = announceStation.trim();
    setAnnounceBody(body);
    setAnnounceStation(station);
    if (station.length > ANNOUNCEMENT_LIMITS.station) {
      setAnnounceStatus(`关联站点不能超过 ${ANNOUNCEMENT_LIMITS.station} 个字符。`);
      return;
    }
    if (body.length > ANNOUNCEMENT_LIMITS.body) {
      setAnnounceStatus(`公告内容不能超过 ${ANNOUNCEMENT_LIMITS.body} 个字符。`);
      return;
    }
    if (!body) {
      setAnnounceStatus("公告内容不能为空。");
      return;
    }
    // Open confirmation dialog
    setAnnounceConfirmOpen(true);
    setAnnouncePopupChecked(false);
  }

  async function handleConfirmPublishAnnouncement() {
    const body = announceBody.trim();
    const station = announceStation.trim();
    const withPopup = announcePopupChecked;
    setAnnounceBody(body);
    setAnnounceStation(station);

    if (station.length > ANNOUNCEMENT_LIMITS.station) {
      setAnnounceStatus(`关联站点不能超过 ${ANNOUNCEMENT_LIMITS.station} 个字符。`);
      setAnnounceConfirmOpen(false);
      return;
    }
    if (!body) {
      setAnnounceStatus("公告内容不能为空。");
      setAnnounceConfirmOpen(false);
      return;
    }
    if (body.length > ANNOUNCEMENT_LIMITS.body) {
      setAnnounceStatus(`公告内容不能超过 ${ANNOUNCEMENT_LIMITS.body} 个字符。`);
      setAnnounceConfirmOpen(false);
      return;
    }

    setAnnounceConfirmOpen(false);
    setAnnounceSending(true);
    setAnnounceStatus("");
    try {
      const authorId = (await getSupabaseClient().auth.getUser()).data.user?.id;
      if (!authorId) {
        throw new Error("当前登录状态无效，请重新登录后再发布公告。");
      }

      // Use "弹窗公告" tag when popup is enabled, otherwise just "公告"
      const tags = withPopup ? ["公告", "弹窗公告"] : ["公告"];
      const title = "【公告】" + (station || "管理员公告");

      const { error } = await getSupabaseClient()
        .from("forum_posts")
        .insert({
          author_id: authorId,
          title,
          body,
          station: station || null,
          tags,
          is_hidden: false,
          is_pinned: true,
        });
      if (error) throw error;

      // If popup enabled, broadcast notifications to all users
      if (withPopup) {
        const { error: rpcError } = await getSupabaseClient()
          .rpc("broadcast_notification", {
            p_content: title,
            p_link_url: null,
          });
        if (rpcError) {
          // Non-fatal: post was already created, just log the broadcast failure
          console.error("Broadcast notification failed:", rpcError);
          setAnnounceStatus("公告已发布并置顶，但弹窗通知发送失败（请检查 broadcast_notification 函数是否已部署）。");
          setAnnounceBody("");
          setAnnounceStation("");
          setStatus("公告已发布并置顶，弹窗通知发送失败。");
          addAudit("发布公告（通知失败）", station || "管理员公告");
          void Promise.all([refreshForumHistory(), refreshStats()]);
          return;
        }
      }

      setAnnounceBody("");
      setAnnounceStation("");
      const msg = withPopup
        ? "公告已发布并置顶，已向所有用户发送弹窗通知。"
        : "公告已发布并置顶。";
      setAnnounceStatus(msg);
      setStatus(msg);
      addAudit(withPopup ? "发布公告（含弹窗通知）" : "发布公告", station || "管理员公告");
      void Promise.all([refreshForumHistory(), refreshStats()]);
    } catch (error) {
      setAnnounceStatus(`发布失败：${getErrorMessage(error, "请重试。")}`);
    } finally {
      setAnnounceSending(false);
    }
  }

  // ---- News handlers ----
  async function handleApproveNews(newsId: string) {
    setNewsActionId(newsId);
    try {
      const { error } = await getSupabaseClient()
        .from("ai_news")
        .update({ is_approved: true })
        .eq("id", newsId);
      if (error) throw error;
      const item = pendingNews.find((n) => n.id === newsId);
      setPendingNews((prev) => prev.filter((n) => n.id !== newsId));
      setNewsStatus(`已通过新闻：${item?.title ?? newsId}`);
      addAudit("通过新闻", item?.title ?? newsId);
      await Promise.all([refreshPendingNews(), refreshApprovedNews()]);
    } catch (error) {
      setNewsStatus(`操作失败：${getErrorMessage(error, "请重试。")}`);
    } finally {
      setNewsActionId(null);
    }
  }

  async function handleRejectNews(newsId: string) {
    setNewsActionId(newsId);
    try {
      const { error } = await getSupabaseClient()
        .from("ai_news")
        .delete()
        .eq("id", newsId);
      if (error) throw error;
      const item = pendingNews.find((n) => n.id === newsId);
      setPendingNews((prev) => prev.filter((n) => n.id !== newsId));
      setNewsStatus(`已驳回新闻：${item?.title ?? newsId}`);
      addAudit("驳回新闻", item?.title ?? newsId);
      await refreshPendingNews();
    } catch (error) {
      setNewsStatus(`操作失败：${getErrorMessage(error, "请重试。")}`);
    } finally {
      setNewsActionId(null);
    }
  }

  async function handleToggleHideNews(newsId: string, currentHidden: boolean) {
    setNewsActionId(newsId);
    try {
      const newHidden = !currentHidden;
      const { error } = await getSupabaseClient()
        .from("ai_news")
        .update({ is_hidden: newHidden })
        .eq("id", newsId);
      if (error) throw error;
      setApprovedNews((prev) =>
        prev.map((n) => (n.id === newsId ? { ...n, is_hidden: newHidden } : n)),
      );
      const item = approvedNews.find((n) => n.id === newsId);
      setNewsStatus(`${newHidden ? "已隐藏" : "已显示"}新闻：${item?.title ?? newsId}`);
      addAudit(newHidden ? "隐藏新闻" : "显示新闻", item?.title ?? newsId);
    } catch (error) {
      setNewsStatus(`操作失败：${getErrorMessage(error, "请重试。")}`);
    } finally {
      setNewsActionId(null);
    }
  }

  async function handlePublishNews() {
    const title = newsForm.title.trim();
    const summary = newsForm.summary.trim();
    const source = newsForm.source.trim();
    const author = newsForm.author.trim();
    const body = newsForm.body.trim();
    setNewsForm({ title, summary, source, author, body });
    if (!title || !summary) {
      setNewsFormStatus("标题和摘要不能为空。");
      return;
    }
    if (title.length > NEWS_LIMITS.title) {
      setNewsFormStatus(`标题不能超过 ${NEWS_LIMITS.title} 个字符。`);
      return;
    }
    if (summary.length > NEWS_LIMITS.summary) {
      setNewsFormStatus(`摘要不能超过 ${NEWS_LIMITS.summary} 个字符。`);
      return;
    }
    if (source.length > NEWS_LIMITS.source) {
      setNewsFormStatus(`来源不能超过 ${NEWS_LIMITS.source} 个字符。`);
      return;
    }
    if (author.length > NEWS_LIMITS.author) {
      setNewsFormStatus(`作者不能超过 ${NEWS_LIMITS.author} 个字符。`);
      return;
    }
    if (body.length > NEWS_LIMITS.body) {
      setNewsFormStatus(`正文不能超过 ${NEWS_LIMITS.body} 个字符。`);
      return;
    }
    setNewsFormSending(true);
    setNewsFormStatus("");
    try {
      const authorId = (await getSupabaseClient().auth.getUser()).data.user?.id;
      if (!authorId) {
        throw new Error("当前登录状态无效，请重新登录后再发布新闻。");
      }
      const { error } = await getSupabaseClient()
        .from("ai_news")
        .insert({
          title,
          summary,
          source: source || null,
          author: author || (email ?? "管理员"),
          body: body || null,
          author_id: authorId,
          is_approved: true,
          is_hidden: false,
        });
      if (error) throw error;
      setNewsForm({ title: "", summary: "", source: "", author: "", body: "" });
      setNewsFormStatus("新闻已发布。");
      setNewsStatus(`已发布新闻：${title}`);
      addAudit("发布新闻", title);
      await refreshApprovedNews();
    } catch (error) {
      setNewsFormStatus(`发布失败：${getErrorMessage(error, "请重试。")}`);
    } finally {
      setNewsFormSending(false);
    }
  }

  // ---- Owner: admin management handlers ----
  const loadAdminList = useCallback(async () => {
    const requestId = ++adminListRequestRef.current;
    setAdminListLoading(true);
    try {
      const { data, error } = await getSupabaseClient()
        .rpc("get_admin_list");
      if (error) throw error;
      if (!isMountedRef.current || requestId !== adminListRequestRef.current) return;
      setAdminList((data as any[]) ?? []);
    } catch (error) {
      if (!isMountedRef.current || requestId !== adminListRequestRef.current) return;
      setAdminList([]);
      setAddAdminStatus(`管理员列表加载失败：${getErrorMessage(error, "请稍后重试。")}`);
    } finally {
      if (!isMountedRef.current || requestId !== adminListRequestRef.current) return;
      setAdminListLoading(false);
    }
  }, []);

  async function handleAddAdmin() {
    const emailTrimmed = newAdminEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setAddAdminStatus("请输入邮箱地址。");
      return;
    }
    setAddAdminLoading(true);
    setAddAdminStatus("");
    try {
      const { data: ok, error } = await getSupabaseClient()
        .rpc("add_admin_by_email", { target_email: emailTrimmed });
      if (error) throw error;
      if (ok) {
        setNewAdminEmail("");
        setAddAdminStatus("已添加管理员。");
        addAudit("添加管理员", emailTrimmed);
        await Promise.all([loadAdminList(), loadUsers()]);
      } else {
        setAddAdminStatus("添加失败：未找到该邮箱对应的用户，或用户尚未注册。");
      }
    } catch (error) {
      setAddAdminStatus(`添加失败：${getErrorMessage(error, "请重试。")}`);
    } finally {
      setAddAdminLoading(false);
    }
  }

  async function handleRemoveAdmin(userId: string, adminEmail: string) {
    try {
      const { data: ok, error } = await getSupabaseClient()
        .rpc("remove_admin", { target_user_id: userId });
      if (error) throw error;
      if (ok) {
        setAddAdminStatus("已移除管理员。");
        addAudit("移除管理员", adminEmail);
        await Promise.all([loadAdminList(), loadUsers()]);
      } else {
        setAddAdminStatus("移除失败：不能移除站主。");
      }
    } catch (error) {
      setAddAdminStatus(`移除失败：${getErrorMessage(error, "请重试。")}`);
    }
  }

  // Load admin list when the admins tab becomes active
  useEffect(() => {
    if (!isOwner || activeTab !== "admins") return;
    void loadAdminList();
     
  }, [isOwner, activeTab, loadAdminList]);

  const pendingSubmissions = submissions.filter((item) => item.status === "pending");
  const reviewedSubmissions = submissions.filter((item) => item.status !== "pending");
  const totalStations = stations.length;

  // ---- Permission gate ----
  if (!isConnected && adminChecked) {
    return (
      <main className="theme-stage flex min-h-screen items-center justify-center bg-transparent text-[var(--color-ink)]">
        <div className="rounded-[34px] border border-[var(--color-line)] bg-[var(--color-panel)] p-10 text-center shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
          <p className="text-2xl font-black">需要管理员权限</p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            请先登录管理员邮箱。
          </p>
          <button
            className="mt-6 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)]"
            onClick={showAuthModal}
            type="button"
          >
            登录邮箱
          </button>
        </div>
      </main>
    );
  }

  if (!adminOk && adminChecked) {
    return (
      <main className="theme-stage flex min-h-screen items-center justify-center bg-transparent text-[var(--color-ink)]">
        <div className="rounded-[34px] border border-[var(--color-line)] bg-[var(--color-panel)] p-10 text-center shadow-[0_18px_60px_rgba(13,25,48,0.07)] max-w-lg">
          <p className="text-2xl font-black">需要管理员权限</p>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            当前邮箱 {email ?? "未设置"} 暂无管理员权限。
          </p>
          <div className="mt-6 rounded-[20px] bg-[var(--color-soft)] p-5 text-left text-sm leading-7 text-[var(--color-muted)]">
            <p className="font-bold text-[var(--color-ink)]">初始化站主（首次使用）</p>
            <p className="mt-2">
              在 Supabase 仪表盘 → SQL Editor 中运行下面这条 SQL，刷新页面即可获得管理员权限：
            </p>
            <code className="mt-3 block rounded-[12px] bg-[var(--color-panel)] p-3 text-xs leading-relaxed text-[var(--color-brand-deep)] break-all select-all">
              {`insert into public.site_owners (user_id) select id from auth.users where lower(email) = lower('${email ?? "your@email.com"}') on conflict (user_id) do nothing;`}
            </code>
          </div>
        </div>
      </main>
    );
  }

  if (adminLoading) {
    return (
      <main className="theme-stage flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-sm text-[var(--color-muted)]">验证管理员权限中...</p>
      </main>
    );
  }

  // ---- Full admin dashboard ----
  return (
    <main className="theme-stage min-h-screen bg-transparent text-[var(--color-ink)]">
      {/* ---- Top bar with admin branding ---- */}
      <header className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]">
              A
            </div>
            <div>
              <p className="text-xl font-black tracking-tight">
                {isOwner ? "站主面板" : "管理员面板"}
              </p>
              <p className="text-xs text-[var(--color-muted)]">{email ?? "管理员"}</p>
            </div>
          </div>
          <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 lg:flex">
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
            <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
              管理员页
            </span>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        {/* ---- Dashboard stats ---- */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              待审核帖子
            </p>
            <p className="mt-2 text-3xl font-black">
              {statsLoading ? "..." : stats?.pending_posts ?? 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              已发布帖子
            </p>
            <p className="mt-2 text-3xl font-black">
              {statsLoading ? "..." : stats?.visible_posts ?? 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              活跃用户
            </p>
            <p className="mt-2 text-3xl font-black">
              {statsLoading ? "..." : stats?.active_authors ?? 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              收录站点
            </p>
            <p className="mt-2 text-3xl font-black">{totalStations}</p>
          </div>
        </section>

        {/* ---- Tab navigation ---- */}
        <nav className="mb-6 flex gap-2 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-1.5 w-fit flex-wrap">
          {(
            [
              ["posts", `帖子审核${stats && stats.pending_posts > 0 ? ` (${stats.pending_posts})` : ""}`],
              ["news", `新闻审核${pendingNews.length > 0 ? ` (${pendingNews.length})` : ""}`],
              ["stations", "站点管理"],
              ["import", "数据导入导出"],
              ...(isOwner ? [["admins", "管理员管理"] as const] : []),
              ["users", "用户管理"],
            ] as readonly (readonly [string, string])[]
          ).map(([key, label]) => (
            <button
              key={key}
              className={`rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                activeTab === key
                  ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_4px_16px_var(--color-panel-glow)]"
                  : "text-[var(--color-muted)] hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
              }`}
              onClick={() => setActiveTab(key as AdminTab)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* ---- Tab: 帖子审核 ---- */}
        {activeTab === "posts" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            {/* Left: review panel */}
            <div className="space-y-6">
              <GithubIssueReviewPanel />

              {/* Announcement publisher */}
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  发布公告
                </p>
                <h2 className="mt-2 text-2xl font-black">创建置顶公告帖</h2>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">关联站点 (可选)</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    maxLength={ANNOUNCEMENT_LIMITS.station}
                    onChange={(e) => setAnnounceStation(e.target.value)}
                    placeholder="例如：虎虎"
                    value={announceStation}
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">公告内容</span>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    maxLength={ANNOUNCEMENT_LIMITS.body}
                    onChange={(e) => setAnnounceBody(e.target.value)}
                    placeholder="输入公告正文..."
                    value={announceBody}
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
                    disabled={announceSending}
                    onClick={handleAnnouncementClick}
                    type="button"
                  >
                    {announceSending ? "发布中..." : "发布公告"}
                  </button>
                  {announceStatus && (
                    <span className="text-sm text-[var(--color-muted)]">{announceStatus}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: approved posts + audit log */}
            <div className="space-y-6">
              {/* Approved posts with delete */}
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    已审核论坛帖子
                  </p>
                  <button
                    className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                    onClick={() => void refreshForumHistory()}
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
                  ) : forumHistoryError ? (
                    <div className="rounded-[24px] bg-red-50 px-4 py-5 text-sm leading-7 text-red-600">
                      论坛数据加载失败，请确认管理员权限后刷新重试。
                    </div>
                  ) : !forumHistoryLoaded ? (
                    <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                      加载中...
                    </div>
                  ) : forumHistory.length === 0 ? (
                    <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                      暂无已审核论坛帖子。在「帖子审核」中通过帖子后，会显示在这里。
                    </div>
                  ) : (
                    forumHistory.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm leading-6 text-[var(--color-muted)] line-clamp-2">
                            {item.body.length > 100
                              ? item.body.slice(0, 100) + "..."
                              : item.body}
                          </p>
                          <span className="shrink-0 rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-bold text-[#15803d]">
                            已通过
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                            <span className="font-mono">{item.id}</span>
                            <button
                              className="rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                              onClick={() => {
                                void navigator.clipboard.writeText(item.id);
                              }}
                              title="复制帖子 ID"
                              type="button"
                            >
                              复制
                            </button>
                          </p>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-[var(--color-muted)]">
                            {new Date(item.time).toLocaleString("zh-CN")}
                          </p>
                          <button
                            className="rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-bold text-[#be123c] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={deletingPostId === item.id}
                            onClick={() => {
                              if (window.confirm("确定要删除这条帖子吗？此操作不可撤销。")) {
                                void handleDeletePost(item.id);
                              }
                            }}
                            type="button"
                          >
                            {deletingPostId === item.id ? "删除中..." : "删除"}
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              {/* Audit log */}
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  操作日志
                </p>
                <div className="mt-4 space-y-2">
                  {auditLog.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted)]">暂无操作记录。</p>
                  ) : (
                    auditLog.slice(0, 15).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-xl bg-[var(--color-soft)] px-4 py-2.5 text-sm"
                      >
                        <span className="font-semibold">{entry.action}</span>
                        <span className="text-xs text-[var(--color-muted)]">
                          {entry.target} · {entry.time}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                {auditLog.length > 0 && (
                  <div className="mt-4">
                    <button
                      className="rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2 text-xs font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                      onClick={() => {
                        if (window.confirm("确定要清空所有操作日志吗？")) {
                          setAuditLog([]);
                        }
                      }}
                      type="button"
                    >
                      清空审计日志
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ---- Tab: 新闻审核 ---- */}
        {activeTab === "news" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            {/* Left: pending news review + publish form */}
            <div className="space-y-6">
              {/* Pending news review */}
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      待审核新闻
                    </p>
                    <h2 className="mt-2 text-2xl font-black">审核 AI 新闻投稿</h2>
                  </div>
                  <button
                    className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                    onClick={() => void Promise.all([refreshPendingNews(), refreshApprovedNews()])}
                    type="button"
                  >
                    刷新
                  </button>
                </div>
                {newsStatus && (
                  <p className="mt-4 text-sm text-[var(--color-muted)]">{newsStatus}</p>
                )}
                <div className="mt-5 space-y-4">
                  {pendingNewsLoading ? (
                    <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                      加载中...
                    </div>
                  ) : pendingNews.length === 0 ? (
                    <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                      暂无待审核新闻投稿
                    </div>
                  ) : (
                    pendingNews.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                      >
                        <h3 className="text-lg font-black">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          {item.summary}
                        </p>
                        {item.body && (
                          <p className="mt-2 rounded-2xl bg-[var(--color-input)] p-3 text-sm leading-6 text-[var(--color-muted)]">
                            {item.body.length > 200 ? item.body.slice(0, 200) + "..." : item.body}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--color-muted)]">
                          {item.source && <span>来源：{item.source}</span>}
                          {item.author && <span>作者：{item.author}</span>}
                          <span>提交时间：{new Date(item.created_at).toLocaleString("zh-CN")}</span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={newsActionId === item.id}
                            onClick={() => void handleApproveNews(item.id)}
                            type="button"
                          >
                            {newsActionId === item.id ? "处理中..." : "通过"}
                          </button>
                          <button
                            className="rounded-full bg-[#fff1f2] px-5 py-3 text-sm font-bold text-[#be123c] transition hover:bg-[#ffe4e6] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={newsActionId === item.id}
                            onClick={() => {
                              if (window.confirm("确定要驳回这条新闻吗？它将从数据库中删除。")) {
                                void handleRejectNews(item.id);
                              }
                            }}
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

              {/* Publish news form */}
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  发布新闻
                </p>
                <h2 className="mt-2 text-2xl font-black">管理员直接发布（免审核）</h2>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">标题 *</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    maxLength={NEWS_LIMITS.title}
                    onChange={(e) => setNewsForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="新闻标题"
                    value={newsForm.title}
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">摘要 *</span>
                  <textarea
                    className="min-h-20 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    maxLength={NEWS_LIMITS.summary}
                    onChange={(e) => setNewsForm((prev) => ({ ...prev, summary: e.target.value }))}
                    placeholder="新闻摘要"
                    value={newsForm.summary}
                  />
                </label>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">来源</span>
                    <input
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                      maxLength={NEWS_LIMITS.source}
                      onChange={(e) => setNewsForm((prev) => ({ ...prev, source: e.target.value }))}
                      placeholder="例如：TechCrunch"
                      value={newsForm.source}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">作者</span>
                    <input
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                      maxLength={NEWS_LIMITS.author}
                      onChange={(e) => setNewsForm((prev) => ({ ...prev, author: e.target.value }))}
                      placeholder="作者名"
                      value={newsForm.author}
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">正文 (可选)</span>
                  <textarea
                    className="min-h-32 w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    maxLength={NEWS_LIMITS.body}
                    onChange={(e) => setNewsForm((prev) => ({ ...prev, body: e.target.value }))}
                    placeholder="新闻正文内容..."
                    value={newsForm.body}
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
                    disabled={newsFormSending}
                    onClick={() => void handlePublishNews()}
                    type="button"
                  >
                    {newsFormSending ? "发布中..." : "发布新闻"}
                  </button>
                  {newsFormStatus && (
                    <span className="text-sm text-[var(--color-muted)]">{newsFormStatus}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: approved news list */}
            <div className="space-y-6">
              <div className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  已审核新闻
                </p>
                <h2 className="mt-2 text-2xl font-black">管理已发布的新闻</h2>
                {newsStatus && (
                  <p className="mt-4 text-sm text-[var(--color-muted)]">{newsStatus}</p>
                )}
                <div className="mt-5 space-y-3">
                  {approvedNewsLoading ? (
                    <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                      加载中...
                    </div>
                  ) : approvedNews.length === 0 ? (
                    <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                      暂无已审核的新闻。
                    </div>
                  ) : (
                    approvedNews.map((item) => (
                      <article
                        key={item.id}
                        className={`rounded-[24px] border p-4 transition ${
                          item.is_hidden
                            ? "border-[var(--color-line)] bg-[var(--color-soft)] opacity-60"
                            : "border-[var(--color-line)] bg-[var(--color-soft)]"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <h3 className="font-bold">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {item.is_hidden && (
                              <span className="rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-bold text-[#be123c]">
                                已隐藏
                              </span>
                            )}
                            <span className="rounded-full bg-[#ecfdf3] px-3 py-1 text-xs font-bold text-[#15803d]">
                              已通过
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)] line-clamp-2">
                          {item.summary}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-[var(--color-muted)]">
                          {item.source && <span>来源：{item.source}</span>}
                          {item.author && <span>作者：{item.author}</span>}
                          <span>{new Date(item.created_at).toLocaleString("zh-CN")}</span>
                        </div>
                        <div className="mt-3">
                          <button
                            className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              item.is_hidden
                                ? "bg-[var(--color-soft)] text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-soft)]"
                                : "bg-[#fff1f2] text-[#be123c] hover:bg-[#ffe4e6]"
                            }`}
                            disabled={newsActionId === item.id}
                            onClick={() => void handleToggleHideNews(item.id, item.is_hidden)}
                            type="button"
                          >
                            {newsActionId === item.id ? "处理中..." : item.is_hidden ? "取消隐藏" : "隐藏"}
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---- Tab: 站点管理 ---- */}
        {activeTab === "stations" && (
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            {/* Station editing */}
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
                    className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
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
                          onChange={(e) => updateStation(index, "price", e.target.value)}
                          value={station.price}
                        />
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm font-semibold text-[var(--color-muted)]">倍率</span>
                        <input
                          className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                          onChange={(e) => updateStation(index, "multiplier", e.target.value)}
                          value={station.multiplier}
                        />
                      </label>
                    </div>
                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-semibold text-[var(--color-muted)]">首页简介</span>
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(e) => updateStation(index, "summary", e.target.value)}
                        value={station.summary}
                      />
                    </label>
                    <label className="mt-4 block space-y-2">
                      <span className="text-sm font-semibold text-[var(--color-muted)]">推荐理由</span>
                      <textarea
                        className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                        onChange={(e) => updateStation(index, "reason", e.target.value)}
                        value={station.reason}
                      />
                    </label>
                  </article>
                ))}
              </div>
            </div>

            {/* Submissions + status */}
            <div className="space-y-6">
              {/* Pending submissions */}
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
                      现在还没有新的待审核提交。用户在中转站榜单页点「提交给管理员审核」后，会先进入这里。
                    </div>
                  ) : (
                    pendingSubmissions.map((item) => (
                      <article
                        key={item.id}
                        className="rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[var(--color-brand-deep)]">{item.kind}</p>
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
                              onChange={(e) => updateSubmissionField(item.id, "stationName", e.target.value)}
                              value={item.stationName}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold text-[var(--color-muted)]">地址或入口</span>
                            <input
                              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                              onChange={(e) => updateSubmissionField(item.id, "url", e.target.value)}
                              value={item.url}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold text-[var(--color-muted)]">倍率或价格</span>
                            <input
                              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                              onChange={(e) => updateSubmissionField(item.id, "priceOrRate", e.target.value)}
                              value={item.priceOrRate}
                            />
                          </label>
                          <label className="space-y-2">
                            <span className="text-sm font-semibold text-[var(--color-muted)]">来源或联系方式</span>
                            <input
                              className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                              onChange={(e) => updateSubmissionField(item.id, "contact", e.target.value)}
                              value={item.contact}
                            />
                          </label>
                        </div>
                        <label className="mt-4 block space-y-2">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">用户提交说明</span>
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                            onChange={(e) => updateSubmissionField(item.id, "note", e.target.value)}
                            value={item.note}
                          />
                        </label>
                        <label className="mt-4 block space-y-2">
                          <span className="text-sm font-semibold text-[var(--color-muted)]">管理员备注</span>
                          <textarea
                            className="min-h-24 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                            onChange={(e) => updateSubmissionField(item.id, "adminNote", e.target.value)}
                            placeholder="你可以先改内容，再备注为什么通过，或者写驳回原因。"
                            value={item.adminNote}
                          />
                        </label>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button
                            className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
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

              {/* Reviewed records */}
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
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.note}</p>
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

              {/* Status */}
              <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  当前状态
                </p>
                <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">{status}</p>
              </div>
            </div>
          </div>
        )}

        {/* ---- Tab: 数据导入导出 ---- */}
        {activeTab === "import" && (
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
              onChange={(e) => setImportText(e.target.value)}
              value={importText}
            />
            <p className="mt-4 text-sm text-[var(--color-muted)]">{status}</p>
          </div>
        )}

        {/* ---- Tab: 管理员管理 (site owner only) ---- */}
        {activeTab === "admins" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
            {/* Left: add admin form */}
            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                添加管理员
              </p>
              <h2 className="mt-2 text-2xl font-black">输入邮箱添加为管理员</h2>
              <p className="mt-2 text-sm text-[var(--color-muted)]">
                该用户需要先在站点注册账号。添加后，管理员可以审核帖子、管理站点数据和新闻。
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <input
                  className="min-w-[260px] rounded-2xl border border-[var(--color-line)] bg-white px-5 py-3 outline-none transition focus:border-[var(--color-brand)]"
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleAddAdmin(); }}
                  placeholder="输入用户邮箱地址"
                  value={newAdminEmail}
                />
                <button
                  className="rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
                  disabled={addAdminLoading}
                  onClick={() => void handleAddAdmin()}
                  type="button"
                >
                  {addAdminLoading ? "添加中..." : "添加管理员"}
                </button>
              </div>
              {addAdminStatus && (
                <p className="mt-4 text-sm text-[var(--color-muted)]">{addAdminStatus}</p>
              )}
            </div>

            {/* Right: current admin list */}
            <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    当前管理员列表
                  </p>
                  <h2 className="mt-2 text-2xl font-black">管理现有管理员权限</h2>
                </div>
                <button
                  className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                  onClick={() => void loadAdminList()}
                  type="button"
                >
                  刷新
                </button>
              </div>
              <div className="mt-5 space-y-3">
                {adminListLoading ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    加载中...
                  </div>
                ) : adminList.length === 0 ? (
                  <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                    暂无管理员。
                  </div>
                ) : (
                  adminList.map((admin) => (
                    <article
                      key={admin.user_id}
                      className="rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{admin.email}</p>
                          <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                            {admin.display_name}
                            {" · "}
                            {new Date(admin.created_at).toLocaleString("zh-CN")}
                          </p>
                        </div>
                        <button
                          className="shrink-0 rounded-full bg-[#fff1f2] px-4 py-2 text-xs font-bold text-[#be123c] transition hover:bg-[#ffe4e6]"
                          onClick={() => {
                            if (window.confirm(`确定要移除管理员 ${admin.email} 吗？`)) {
                              void handleRemoveAdmin(admin.user_id, admin.email);
                            }
                          }}
                          type="button"
                        >
                          移除
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Users tab ── */}
      {activeTab === "users" && (
        <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">用户管理</p>
          <h2 className="mt-2 text-2xl font-black">社区用户</h2>

          <div className="mt-4 flex items-center gap-3">
            <input
              className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm outline-none transition focus:border-[var(--color-brand)]"
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="搜索邮箱或昵称..."
              value={userSearch}
            />
            <button
              className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
              onClick={loadUsers}
              type="button"
            >
              刷新
            </button>
            <span className="text-sm text-[var(--color-muted)]">{userList.length} 位用户</span>
          </div>

          <div className="mt-5 divide-y divide-[var(--color-line)]">
            {userListLoading ? (
              <p className="py-10 text-center text-sm text-[var(--color-muted)]">加载中...</p>
            ) : userList.filter((u) => {
                if (!userSearch) return true;
                const q = userSearch.toLowerCase();
                return u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
              }).length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-muted)]">暂无匹配用户</p>
            ) : (
              userList
                .filter((u) => {
                  if (!userSearch) return true;
                  const q = userSearch.toLowerCase();
                  return u.display_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
                })
                .map((user) => (
                  <div key={user.id} className="flex items-center gap-4 py-3">
                    <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-sm font-bold text-[var(--color-muted)]">
                      {user.avatar_url ? <img alt="" className="h-full w-full rounded-full object-cover" src={user.avatar_url} /> : user.display_name.charAt(0)}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          user.is_online ? "bg-[#22c55e]" : "bg-[#d1d5db]"
                        }`}
                        title={user.is_online ? "在线" : "离线"}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[var(--color-ink)]">{user.display_name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{user.email}</p>
                      <p className="text-xs text-[var(--color-muted)]">
                        {user.is_online ? (
                          <span className="text-[#22c55e]">当前在线</span>
                        ) : user.last_seen ? (
                          `最后活跃: ${formatLastSeen(user.last_seen)}`
                        ) : (
                          `${new Date(user.created_at).toLocaleDateString("zh-CN")} 加入`
                        )}
                      </p>
                    </div>
                    {user.isAdmin && (
                      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">管理员</span>
                    )}
                    {isOwner && (
                      <button
                        className="rounded-full border border-[var(--color-line)] px-3 py-1 text-[10px] font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                        disabled={togglingUserId === user.id}
                        onClick={() => toggleAdmin(user.id, !user.isAdmin)}
                        type="button"
                      >
                        {togglingUserId === user.id ? "处理中..." : user.isAdmin ? "取消管理员" : "升级为管理员"}
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
          {userActionStatus && (
            <p className="mt-4 text-sm text-[var(--color-muted)]">{userActionStatus}</p>
          )}
        </div>
      )}

      {/* ── Announcement confirmation dialog ── */}
      {announceConfirmOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div
            aria-labelledby="announcement-confirm-title"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-[24px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            role="dialog"
          >
            <div className="border-b border-[var(--color-line)] px-6 py-4">
              <h2 id="announcement-confirm-title" className="text-lg font-bold text-[var(--color-ink)]">发布此公告？</h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm leading-7 text-[var(--color-muted)]">
                即将发布一条置顶公告。
              </p>
              <label className="mt-4 flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-5 w-5 rounded border-[var(--color-line)] accent-[var(--color-brand)]"
                  checked={announcePopupChecked}
                  onChange={(e) => setAnnouncePopupChecked(e.target.checked)}
                />
                <span className="text-sm font-semibold text-[var(--color-ink)]">
                  同时弹窗通知所有用户
                </span>
              </label>
              <p className="mt-2 ml-8 text-xs text-[var(--color-muted)]">
                勾选后，所有注册用户都会收到一条通知，并在访问站点时看到弹窗公告。
              </p>
            </div>
            <div className="border-t border-[var(--color-line)] px-6 py-4 flex justify-end gap-3">
              <button
                className="rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-5 py-2.5 text-sm font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                onClick={() => setAnnounceConfirmOpen(false)}
                type="button"
              >
                取消
              </button>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                onClick={() => void handleConfirmPublishAnnouncement()}
                type="button"
              >
                确认发布
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
