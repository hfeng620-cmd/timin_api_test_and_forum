"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
    { id: string; display_name: string; avatar_url: string | null; created_at: string; isAdmin: boolean }[]
  >([]);
  const [userListLoading, setUserListLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Load users + admin status
  const loadUsers = useCallback(async () => {
    setUserListLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [profilesRes, adminsRes] = await Promise.all([
        supabase.from("forum_profiles").select("id, display_name, avatar_url, created_at").order("created_at", { ascending: false }).limit(100),
        supabase.from("forum_admins").select("user_id"),
      ]);
      const adminIds = new Set(((adminsRes.data ?? []) as { user_id: string }[]).map((a: { user_id: string }) => a.user_id));
      const users = ((profilesRes.data ?? []) as any[]).map((u: any) => ({
        id: u.id,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        created_at: u.created_at,
        isAdmin: adminIds.has(u.id),
      }));
      setUserList(users);
    } catch { /* ignore */ }
    setUserListLoading(false);
  }, []);

  // Promote/demote user
  async function toggleAdmin(userId: string, makeAdmin: boolean) {
    try {
      if (makeAdmin) {
        await getSupabaseClient().from("forum_admins").insert({ user_id: userId });
      } else {
        await getSupabaseClient().from("forum_admins").delete().eq("user_id", userId);
      }
      loadUsers();
    } catch { /* ignore */ }
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
  useEffect(() => {
    if (!adminOk) return;
    let cancelled = false;
    getForumStats()
      .then((s) => { if (!cancelled) setStats(s); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStatsLoading(false); });
    return () => { cancelled = true; };
  }, [adminOk]);

  // ---- Load approved posts (existing logic preserved) ----
  useEffect(() => {
    if (!isConnected || !adminOk || forumHistoryLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getSupabaseClient()
          .from("forum_posts")
          .select("id, body, created_at")
          .eq("is_hidden", false)
          .order("created_at", { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (data) {
          setForumHistory(
            (data as { id: string; body: string; created_at: string }[]).map(
              (row) => ({
                id: row.id,
                body: row.body,
                status: "approved" as const,
                time: row.created_at,
              }),
            ),
          );
        }
      } catch {
        if (!cancelled) setForumHistoryError(true);
      } finally {
        if (!cancelled) setForumHistoryLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isConnected, adminOk, forumHistoryLoaded]);

  // ---- Load pending news ----
  useEffect(() => {
    if (!adminOk) return;
    let cancelled = false;
    setPendingNewsLoading(true);
    (async () => {
      try {
        const { data } = await getSupabaseClient()
          .from("ai_news")
          .select("id, title, summary, source, author, body, created_at")
          .eq("is_approved", false)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        setPendingNews((data as any[]) ?? []);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setPendingNewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminOk]);

  // ---- Load approved news ----
  useEffect(() => {
    if (!adminOk) return;
    let cancelled = false;
    setApprovedNewsLoading(true);
    (async () => {
      try {
        const { data } = await getSupabaseClient()
          .from("ai_news")
          .select("id, title, summary, source, author, body, created_at, is_hidden")
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(50);
        if (cancelled) return;
        setApprovedNews((data as any[]) ?? []);
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setApprovedNewsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adminOk]);

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
    try {
      await deleteDiscussionPost(postId);
      setForumHistory((prev) => prev.filter((p) => p.id !== postId));
      setStatus("帖子已删除（隐藏）。");
      addAudit("删除帖子", postId);
    } catch {
      setStatus("删除失败，请确认管理员权限。");
    }
  }

  // ---- New: publish announcement ----
  async function handlePublishAnnouncement() {
    if (!announceBody.trim()) {
      setAnnounceStatus("公告内容不能为空。");
      return;
    }
    setAnnounceSending(true);
    setAnnounceStatus("");
    try {
      const authorId = (await getSupabaseClient().auth.getUser()).data.user?.id;
      await getSupabaseClient()
        .from("forum_posts")
        .insert({
          author_id: authorId,
          title: "【公告】" + (announceStation.trim() || "管理员公告"),
          body: announceBody.trim(),
          station: announceStation.trim() || null,
          tags: ["公告"],
          is_hidden: false,
          is_pinned: true,
        });
      setAnnounceBody("");
      setAnnounceStation("");
      setAnnounceStatus("公告已发布并置顶。");
      addAudit("发布公告", announceStation.trim() || "管理员公告");
    } catch {
      setAnnounceStatus("发布失败，请重试。");
    } finally {
      setAnnounceSending(false);
    }
  }

  // ---- News handlers ----
  async function handleApproveNews(newsId: string) {
    try {
      await getSupabaseClient()
        .from("ai_news")
        .update({ is_approved: true })
        .eq("id", newsId);
      const item = pendingNews.find((n) => n.id === newsId);
      setPendingNews((prev) => prev.filter((n) => n.id !== newsId));
      addAudit("通过新闻", item?.title ?? newsId);
    } catch {
      setStatus("操作失败，请重试。");
    }
    // Refresh approved list
    setApprovedNewsLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .from("ai_news")
        .select("id, title, summary, source, author, body, created_at, is_hidden")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      setApprovedNews((data as any[]) ?? []);
    } catch {
      // ignore
    } finally {
      setApprovedNewsLoading(false);
    }
  }

  async function handleRejectNews(newsId: string) {
    try {
      await getSupabaseClient()
        .from("ai_news")
        .delete()
        .eq("id", newsId);
      const item = pendingNews.find((n) => n.id === newsId);
      setPendingNews((prev) => prev.filter((n) => n.id !== newsId));
      addAudit("驳回新闻", item?.title ?? newsId);
    } catch {
      setStatus("操作失败，请重试。");
    }
  }

  async function handleToggleHideNews(newsId: string, currentHidden: boolean) {
    try {
      const newHidden = !currentHidden;
      await getSupabaseClient()
        .from("ai_news")
        .update({ is_hidden: newHidden })
        .eq("id", newsId);
      setApprovedNews((prev) =>
        prev.map((n) => (n.id === newsId ? { ...n, is_hidden: newHidden } : n)),
      );
      const item = approvedNews.find((n) => n.id === newsId);
      addAudit(newHidden ? "隐藏新闻" : "显示新闻", item?.title ?? newsId);
    } catch {
      setStatus("操作失败，请重试。");
    }
  }

  async function handlePublishNews() {
    if (!newsForm.title.trim() || !newsForm.summary.trim()) {
      setNewsFormStatus("标题和摘要不能为空。");
      return;
    }
    setNewsFormSending(true);
    setNewsFormStatus("");
    try {
      const authorId = (await getSupabaseClient().auth.getUser()).data.user?.id;
      await getSupabaseClient()
        .from("ai_news")
        .insert({
          title: newsForm.title.trim(),
          summary: newsForm.summary.trim(),
          source: newsForm.source.trim() || null,
          author: newsForm.author.trim() || (email ?? "管理员"),
          body: newsForm.body.trim() || null,
          author_id: authorId,
          is_approved: true,
          is_hidden: false,
        });
      setNewsForm({ title: "", summary: "", source: "", author: "", body: "" });
      setNewsFormStatus("新闻已发布。");
      addAudit("发布新闻", newsForm.title.trim());
      // Refresh approved list
      setApprovedNewsLoading(true);
      try {
        const { data } = await getSupabaseClient()
          .from("ai_news")
          .select("id, title, summary, source, author, body, created_at, is_hidden")
          .eq("is_approved", true)
          .order("created_at", { ascending: false })
          .limit(50);
        setApprovedNews((data as any[]) ?? []);
      } catch {
        // ignore
      } finally {
        setApprovedNewsLoading(false);
      }
    } catch {
      setNewsFormStatus("发布失败，请重试。");
    } finally {
      setNewsFormSending(false);
    }
  }

  // ---- Owner: admin management handlers ----
  async function loadAdminList() {
    setAdminListLoading(true);
    try {
      const { data } = await getSupabaseClient()
        .rpc("get_admin_list");
      setAdminList((data as any[]) ?? []);
    } catch {
      setAdminList([]);
    } finally {
      setAdminListLoading(false);
    }
  }

  async function handleAddAdmin() {
    const emailTrimmed = newAdminEmail.trim().toLowerCase();
    if (!emailTrimmed) {
      setAddAdminStatus("请输入邮箱地址。");
      return;
    }
    setAddAdminLoading(true);
    setAddAdminStatus("");
    try {
      const { data: ok } = await getSupabaseClient()
        .rpc("add_admin_by_email", { target_email: emailTrimmed });
      if (ok) {
        setNewAdminEmail("");
        setAddAdminStatus("已添加管理员。");
        addAudit("添加管理员", emailTrimmed);
        void loadAdminList();
      } else {
        setAddAdminStatus("添加失败：未找到该邮箱对应的用户，或用户尚未注册。");
      }
    } catch {
      setAddAdminStatus("添加失败，请重试。");
    } finally {
      setAddAdminLoading(false);
    }
  }

  async function handleRemoveAdmin(userId: string, adminEmail: string) {
    try {
      const { data: ok } = await getSupabaseClient()
        .rpc("remove_admin", { target_user_id: userId });
      if (ok) {
        setAddAdminStatus("已移除管理员。");
        addAudit("移除管理员", adminEmail);
        void loadAdminList();
      } else {
        setAddAdminStatus("移除失败：不能移除站主。");
      }
    } catch {
      setAddAdminStatus("移除失败，请重试。");
    }
  }

  // Load admin list when the admins tab becomes active
  useEffect(() => {
    if (!isOwner || activeTab !== "admins") return;
    void loadAdminList();
     
  }, [isOwner, activeTab]);

  const pendingSubmissions = submissions.filter((item) => item.status === "pending");
  const reviewedSubmissions = submissions.filter((item) => item.status !== "pending");
  const totalStations = 14; // from stationLinkMap

  // ---- Permission gate ----
  if (!isConnected && adminChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-10 text-center shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
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
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] text-[var(--color-ink)]">
        <div className="rounded-[34px] border border-[var(--color-line)] bg-white p-10 text-center shadow-[0_18px_60px_rgba(13,25,48,0.07)] max-w-lg">
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
              insert into public.site_owners (user_id) select id from auth.users where lower(email) = lower('{email ?? "your@email.com"}') on conflict (user_id) do nothing;
            </code>
          </div>
        </div>
      </main>
    );
  }

  if (adminLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <p className="text-sm text-[var(--color-muted)]">验证管理员权限中...</p>
      </main>
    );
  }

  // ---- Full admin dashboard ----
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
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
          <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              待审核帖子
            </p>
            <p className="mt-2 text-3xl font-black">
              {statsLoading ? "..." : stats?.pending_posts ?? 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              已发布帖子
            </p>
            <p className="mt-2 text-3xl font-black">
              {statsLoading ? "..." : stats?.visible_posts ?? 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-muted)]">
              活跃用户
            </p>
            <p className="mt-2 text-3xl font-black">
              {statsLoading ? "..." : stats?.active_authors ?? 0}
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-5 shadow-[0_8px_30px_rgba(13,25,48,0.05)]">
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
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  发布公告
                </p>
                <h2 className="mt-2 text-2xl font-black">创建置顶公告帖</h2>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">关联站点 (可选)</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    onChange={(e) => setAnnounceStation(e.target.value)}
                    placeholder="例如：虎虎"
                    value={announceStation}
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">公告内容</span>
                  <textarea
                    className="min-h-28 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    onChange={(e) => setAnnounceBody(e.target.value)}
                    placeholder="输入公告正文..."
                    value={announceBody}
                  />
                </label>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <button
                    className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
                    disabled={announceSending}
                    onClick={() => void handlePublishAnnouncement()}
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
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                    已审核论坛帖子
                  </p>
                  <button
                    className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                    onClick={() => {
                      setForumHistory([]);
                      setForumHistoryLoaded(false);
                    }}
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
                              className="rounded-full border border-[var(--color-line)] bg-white px-2 py-0.5 text-[10px] font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
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
                            className="rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-bold text-[#be123c] transition hover:bg-[#ffe4e6]"
                            onClick={() => {
                              if (window.confirm("确定要删除这条帖子吗？此操作不可撤销。")) {
                                void handleDeletePost(item.id);
                              }
                            }}
                            type="button"
                          >
                            删除
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>

              {/* Audit log */}
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
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
                      className="rounded-full border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-bold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
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
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      待审核新闻
                    </p>
                    <h2 className="mt-2 text-2xl font-black">审核 AI 新闻投稿</h2>
                  </div>
                  <button
                    className="rounded-full bg-[var(--color-soft)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                    onClick={async () => {
                      setPendingNewsLoading(true);
                      setApprovedNewsLoading(true);
                      try {
                        const { data: pdata } = await getSupabaseClient()
                          .from("ai_news")
                          .select("id, title, summary, source, author, body, created_at")
                          .eq("is_approved", false)
                          .order("created_at", { ascending: false });
                        setPendingNews((pdata as any[]) ?? []);
                      } catch { /* ignore */ }
                      setPendingNewsLoading(false);
                      try {
                        const { data: adata } = await getSupabaseClient()
                          .from("ai_news")
                          .select("id, title, summary, source, author, body, created_at, is_hidden")
                          .eq("is_approved", true)
                          .order("created_at", { ascending: false })
                          .limit(50);
                        setApprovedNews((adata as any[]) ?? []);
                      } catch { /* ignore */ }
                      setApprovedNewsLoading(false);
                    }}
                    type="button"
                  >
                    刷新
                  </button>
                </div>
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
                          <p className="mt-2 rounded-2xl bg-white p-3 text-sm leading-6 text-[var(--color-muted)]">
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
                            className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                            onClick={() => void handleApproveNews(item.id)}
                            type="button"
                          >
                            通过
                          </button>
                          <button
                            className="rounded-full bg-[#fff1f2] px-5 py-3 text-sm font-bold text-[#be123c] transition hover:bg-[#ffe4e6]"
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
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  发布新闻
                </p>
                <h2 className="mt-2 text-2xl font-black">管理员直接发布（免审核）</h2>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">标题 *</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    onChange={(e) => setNewsForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="新闻标题"
                    value={newsForm.title}
                  />
                </label>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">摘要 *</span>
                  <textarea
                    className="min-h-20 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                    onChange={(e) => setNewsForm((prev) => ({ ...prev, summary: e.target.value }))}
                    placeholder="新闻摘要"
                    value={newsForm.summary}
                  />
                </label>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">来源</span>
                    <input
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(e) => setNewsForm((prev) => ({ ...prev, source: e.target.value }))}
                      placeholder="例如：TechCrunch"
                      value={newsForm.source}
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-[var(--color-muted)]">作者</span>
                    <input
                      className="w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(e) => setNewsForm((prev) => ({ ...prev, author: e.target.value }))}
                      placeholder="作者名"
                      value={newsForm.author}
                    />
                  </label>
                </div>
                <label className="mt-4 block space-y-2">
                  <span className="text-sm font-semibold text-[var(--color-muted)]">正文 (可选)</span>
                  <textarea
                    className="min-h-32 w-full rounded-2xl border border-[var(--color-line)] bg-white px-4 py-3 outline-none transition focus:border-[var(--color-brand)]"
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
              <div className="rounded-[24px] border border-[var(--color-line)] bg-white p-6 shadow-[0_18px_60px_rgba(13,25,48,0.07)]">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  已审核新闻
                </p>
                <h2 className="mt-2 text-2xl font-black">管理已发布的新闻</h2>
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
                            className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                              item.is_hidden
                                ? "bg-[var(--color-soft)] text-[var(--color-brand-deep)] hover:bg-[var(--color-brand-soft)]"
                                : "bg-[#fff1f2] text-[#be123c] hover:bg-[#ffe4e6]"
                            }`}
                            onClick={() => void handleToggleHideNews(item.id, item.is_hidden)}
                            type="button"
                          >
                            {item.is_hidden ? "取消隐藏" : "隐藏"}
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
              placeholder="搜索用户..."
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
            ) : userList.filter((u) => !userSearch || u.display_name.includes(userSearch)).length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-muted)]">暂无匹配用户</p>
            ) : (
              userList
                .filter((u) => !userSearch || u.display_name.includes(userSearch))
                .map((user) => (
                  <div key={user.id} className="flex items-center gap-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-soft)] text-sm font-bold text-[var(--color-muted)]">
                      {user.avatar_url ? <img alt="" className="h-full w-full rounded-full object-cover" src={user.avatar_url} /> : user.display_name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[var(--color-ink)]">{user.display_name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{new Date(user.created_at).toLocaleDateString("zh-CN")} 加入</p>
                    </div>
                    {user.isAdmin && (
                      <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">管理员</span>
                    )}
                    {isOwner && (
                      <button
                        className="rounded-full border border-[var(--color-line)] px-3 py-1 text-[10px] font-bold text-[var(--color-brand-deep)] transition hover:bg-[var(--color-brand-soft)]"
                        onClick={() => toggleAdmin(user.id, !user.isAdmin)}
                        type="button"
                      >
                        {user.isAdmin ? "取消管理员" : "升级为管理员"}
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        </div>
      )}

    </main>
  );
}
