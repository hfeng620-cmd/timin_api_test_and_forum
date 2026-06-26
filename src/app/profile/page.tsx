"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import {
  getUserLikedPosts,
  getUserPosts,
  getUserReplies,
  type DiscussionPost,
  type DiscussionReply,
  updateProfileAvatar,
  uploadAvatar,
} from "@/lib/discussion-storage";
import { useForumAuth } from "@/lib/forum-auth";
import { getSupabaseClient } from "@/lib/supabase";

type ActivityTab = "posts" | "replies" | "likes";
type ReplyWithPost = { reply: DiscussionReply; postTitle: string; postId: string };

type ProfileSignal = {
  label: string;
  value: string;
  hint: string;
};

type FootprintItem = {
  title: string;
  value: string;
  meta: string;
  detail: string;
};

const activityTabs: { key: ActivityTab; label: string }[] = [
  { key: "posts", label: "发帖" },
  { key: "replies", label: "回复" },
  { key: "likes", label: "点赞" },
];

function formatDateLabel(value?: string | null) {
  if (!value) return "暂无记录";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function truncateText(value?: string | null, maxLength = 72) {
  if (!value) return "";

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function pickTopStation(posts: DiscussionPost[]) {
  const stationMap = new Map<string, number>();
  for (const post of posts) {
    if (!post.station) continue;
    stationMap.set(post.station, (stationMap.get(post.station) ?? 0) + 1);
  }

  let topStation = "";
  let topCount = 0;
  for (const [station, count] of stationMap.entries()) {
    if (count > topCount) {
      topStation = station;
      topCount = count;
    }
  }

  return topStation ? { station: topStation, count: topCount } : null;
}

export default function ProfilePage() {
  const { isConnected, user, email, displayName, showAuthModal, setDisplayName } = useForumAuth();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [likedPosts, setLikedPosts] = useState<DiscussionPost[]>([]);
  const [replies, setReplies] = useState<ReplyWithPost[]>([]);
  const [activeTab, setActiveTab] = useState<ActivityTab>("posts");
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(displayName ?? "");
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [bio, setBio] = useState<string>("");
  const [newBio, setNewBio] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");

  const loadPosts = useCallback(async () => {
    if (!isConnected || !user) return;
    setLoading(true);
    try {
      const [postData, likedData, replyData] = await Promise.all([
        getUserPosts(user.id),
        getUserLikedPosts(user.id),
        getUserReplies(user.id),
      ]);
      setPosts(postData);
      setLikedPosts(likedData);
      setReplies(replyData);
    } catch {
      setPosts([]);
      setLikedPosts([]);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  }, [isConnected, user]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    if (!isConnected || !user) return;
    (async () => {
      try {
        const { data } = await getSupabaseClient()
          .from("forum_profiles")
          .select("avatar_url, bio, tags")
          .eq("id", user.id)
          .single();
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.bio) setBio(data.bio);
        if (Array.isArray(data?.tags)) setTags(data.tags);
      } catch {
        // ignore
      }
    })();
  }, [isConnected, user]);

  async function handleAvatarUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) return;
    setAvatarUploading(true);
    try {
      const url = await uploadAvatar(file);
      await updateProfileAvatar(url);
      setAvatarUrl(url);
    } catch {
      // ignore
    } finally {
      setAvatarUploading(false);
    }
  }

  const postCount = posts.length;
  const totalLikes = posts.reduce((sum, post) => sum + post.likes, 0);
  const totalReplies = posts.reduce((sum, post) => sum + post.replyCount, 0);
  const likedCount = likedPosts.length;
  const authoredReplyCount = replies.length;
  const totalContribution = postCount + authoredReplyCount;
  const uniqueStations = new Set(posts.map((post) => post.station).filter(Boolean)).size;

  const joinDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "未知";

  const name = displayName || email?.split("@")[0] || "用户";
  const initial = name.charAt(0).toUpperCase();
  const hasCustomName = Boolean(displayName?.trim());
  const profileCompleteness = [
    hasCustomName,
    Boolean(avatarUrl),
    Boolean(bio.trim()),
    tags.length > 0,
  ].filter(Boolean).length;
  const completenessPercent = Math.round((profileCompleteness / 4) * 100);
  const completionTone =
    completenessPercent >= 100
      ? "主页已完成"
      : completenessPercent >= 75
        ? "接近完整"
        : completenessPercent >= 50
          ? "还差一点"
          : "建议继续补充";
  const mostDiscussedStation = pickTopStation(posts);
  const latestPost = posts[0];
  const latestReply = replies[0];
  const latestLike = likedPosts[0];
  const latestPostDateLabel = latestPost ? formatDateLabel(latestPost.postedAt) : "暂无";
  const latestReplyDateLabel = latestReply ? formatDateLabel(latestReply.reply.postedAt) : "暂无";
  const latestLikedPostDateLabel = latestLike ? formatDateLabel(latestLike.postedAt) : "暂无";
  const profileStage =
    totalContribution >= 10 && completenessPercent >= 75
      ? "稳定贡献者"
      : totalContribution >= 4
        ? "持续参与中"
        : totalContribution > 0
          ? "刚开始发声"
          : completenessPercent >= 75
            ? "资料已就绪"
            : "待完善新成员";
  const profileStageHint =
    totalContribution >= 10 && completenessPercent >= 75
      ? "资料和互动都已形成较强辨识度。"
      : totalContribution >= 4
        ? "已经开始形成连续的公开记录。"
        : totalContribution > 0
          ? "继续补几次互动，主页会更像完整名片。"
          : completenessPercent >= 75
            ? "资料已经差不多，只差内容互动来补足真实感。"
            : "先补资料或发出第一条帖子，主页会更立得住。";
  const profileHeadline =
    totalContribution > 0
      ? mostDiscussedStation
        ? `主要关注 ${mostDiscussedStation.station}，已经留下 ${totalContribution} 次公开表达。`
        : `已经留下 ${totalContribution} 次公开表达，主页正在形成自己的观察记录。`
      : completenessPercent >= 75
        ? "资料已经差不多，只差第一条内容就能让主页真正动起来。"
        : "先补头像、简介或标签，让这张主页先有更清晰的身份感。";
  const profileMeta = [
    {
      label: "账号阶段",
      value: profileStage,
      hint: profileStageHint,
    },
    {
      label: "最近发声",
      value: latestPost ? latestPostDateLabel : "还没发帖",
      hint: latestPost ? "最近一次公开发帖时间" : "发出第一条帖子后会显示在这里",
    },
    {
      label: "观察方向",
      value: mostDiscussedStation ? mostDiscussedStation.station : "仍在探索",
      hint: mostDiscussedStation
        ? `已在发帖中提及 ${mostDiscussedStation.count} 次`
        : "多参与几个站点话题后会更清晰",
    },
  ];
  const activeTabDescription =
    activeTab === "posts"
      ? "这里收纳你公开发出的帖子，方便回看自己的表达与观察。"
      : activeTab === "replies"
        ? "这里整理你参与过的话题回应，形成一条个人讨论轨迹。"
        : "这里展示你点过赞的内容偏好，能快速看出近期关注重点。";

  const profileSignals: ProfileSignal[] = [
    {
      label: "主页完成度",
      value: `${completenessPercent}%`,
      hint: completionTone,
    },
    {
      label: "公开表达",
      value: `${totalContribution}`,
      hint: totalContribution > 0 ? "发帖与本人回复合计" : "还没有互动记录",
    },
    {
      label: "关注站点",
      value: `${uniqueStations}`,
      hint: mostDiscussedStation ? `最常提及 ${mostDiscussedStation.station}` : "还没有站点足迹",
    },
  ];

  const overviewCards = [
    {
      label: "发帖",
      value: postCount,
      note: latestPost ? `最近更新 ${latestPostDateLabel}` : "还没开始发帖",
    },
    {
      label: "本人回复",
      value: authoredReplyCount,
      note: latestReply ? `最近回复 ${latestReplyDateLabel}` : "还没留下回复",
    },
    {
      label: "收到回复",
      value: totalReplies,
      note: totalReplies > 0 ? "来自其他人的讨论反馈" : "还没有收到回复",
    },
    {
      label: "收到赞",
      value: totalLikes,
      note: likedCount > 0 ? `你也点赞过 ${likedCount} 条内容` : "还没有点赞记录",
    },
  ];

  const quickActions = [
    {
      title: "去讨论区发帖",
      description: "发布新的站点体验、价格变化或试用线索。",
      href: "/community",
    },
    {
      title: "继续看榜单",
      description: "把个人观察和站点榜单放到一起比较。",
      href: "/stations",
    },
    {
      title: "返回首页",
      description: "回到 Timix 首页，继续从入口页浏览内容。",
      href: "/",
    },
  ];

  const footprintItems: FootprintItem[] = [
    {
      title: "最近发帖",
      value: latestPost ? latestPostDateLabel : "暂无",
      meta: latestPost?.station ? `${latestPost.station} · 公开发帖` : "公开发帖",
      detail: latestPost
        ? truncateText(latestPost.body)
        : "发出第一条帖子后，这里会自动收纳你的最新公开表达。",
    },
    {
      title: "最近回复",
      value: latestReply ? latestReplyDateLabel : "暂无",
      meta: latestReply ? `回复话题 · ${latestReply.postTitle}` : "讨论轨迹",
      detail: latestReply
        ? truncateText(latestReply.reply.body)
        : "参与一次追问、补充或纠错后，这里会留下你的最近回应。",
    },
    {
      title: "最近点赞内容",
      value: latestLike ? `发布于 ${latestLikedPostDateLabel}` : "暂无",
      meta: latestLike?.station ? `${latestLike.station} · 兴趣记录` : "兴趣记录",
      detail: latestLike
        ? truncateText(latestLike.body)
        : "点过赞的内容会留在这里，逐步沉淀出你的关注方向。",
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <Link
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]"
              href="/"
            >
              T
            </Link>
            <div>
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
              <p className="text-sm text-[var(--color-muted)]">个人主页</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="hidden items-center gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] p-1 md:flex">
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
              <Link
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-soft)] hover:text-[var(--color-ink)]"
                href="/community"
              >
                论坛入口
              </Link>
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
                个人主页
              </span>
            </nav>

            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_34%),radial-gradient(circle_at_85%_20%,rgba(125,211,252,0.22),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.92),rgba(244,247,251,0.84))]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {!isConnected ? (
            <div className="overflow-hidden rounded-[28px] border border-white/70 bg-[var(--color-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
              <div className="border-b border-[var(--color-line)] px-6 py-8 sm:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[var(--color-brand-deep)]">
                      Personal Console
                    </p>
                    <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                      登录后，把你的观察、身份和互动记录汇成一张完整主页。
                    </h1>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                      这里会集中展示你的头像、简介、关注站点、发帖记录、回复轨迹和点赞行为，
                      让个人主页不只是账户入口，而是一份可持续积累的社区名片。
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:w-[360px]">
                    {[
                      { value: "资料", label: "头像 / 简介 / 标签" },
                      { value: "互动", label: "发帖 / 回复 / 点赞" },
                      { value: "足迹", label: "站点兴趣与活动记录" },
                    ].map((item) => (
                      <div
                        key={item.value}
                        className="rounded-[20px] border border-white/70 bg-white/82 px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.06)]"
                      >
                        <p className="text-lg font-black text-[var(--color-ink)]">{item.value}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-8 text-center sm:px-8">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-soft)] text-3xl font-black text-[var(--color-muted)]">
                  ?
                </div>
                <h2 className="mt-6 text-2xl font-black tracking-tight">请先登录查看个人主页</h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  登录后可管理资料、查看互动统计，并把个人主页逐步补完整。
                </p>
                <button
                  className="btn-press mt-6 rounded-full bg-[var(--color-brand)] px-6 py-3 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)]"
                  onClick={showAuthModal}
                  type="button"
                >
                  登录并进入主页
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="overflow-hidden rounded-[28px] border border-white/70 bg-[var(--color-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                <div className="border-b border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(37,99,235,0.08),rgba(255,255,255,0.86)_55%,rgba(191,219,254,0.42))] px-6 py-8 sm:px-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                    <button
                      className="group relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] bg-[var(--color-soft)] ring-1 ring-[var(--color-line)] transition hover:-translate-y-0.5 hover:ring-[var(--color-brand)]"
                      onClick={() => avatarInputRef.current?.click()}
                      title="点击更换头像"
                      type="button"
                    >
                      {avatarUrl ? (
                        <img alt={name} className="h-full w-full object-cover" src={avatarUrl} />
                      ) : (
                        <span className="text-4xl font-black text-[var(--color-muted)]">{initial}</span>
                      )}
                      <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">
                        {avatarUploading ? "上传中..." : "换头像"}
                      </span>
                      <input
                        ref={avatarInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) handleAvatarUpload(file);
                          if (avatarInputRef.current) avatarInputRef.current.value = "";
                        }}
                        type="file"
                      />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{name}</h1>
                            <span className="rounded-full bg-[var(--color-brand-soft)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]">
                              Timix 观察成员
                            </span>
                          </div>
                          {email ? (
                            <p className="mt-3 text-sm text-[var(--color-muted)]">{email}</p>
                          ) : null}
                          <p className="mt-2 text-sm text-[var(--color-muted)]">
                            {joinDate} 加入，已累计参与 {totalContribution} 次内容互动
                          </p>
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                            {profileHeadline}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-full border border-[var(--color-line)] bg-white/82 px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                            onClick={() => {
                              setEditingName(true);
                              setNewName(name);
                              setNewBio(bio);
                              setNewTags([...tags]);
                              setTagInput("");
                            }}
                            type="button"
                          >
                            编辑资料
                          </button>
                          <Link
                            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)]"
                            href="/community"
                          >
                            去讨论区
                          </Link>
                        </div>
                      </div>

                      <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                        {bio || "还没有留下个人简介，先补一句常用场景或关注方向会更像完整主页。"}
                      </p>

                      <div className="mt-5 flex flex-wrap gap-2">
                        {tags.length > 0 ? (
                          tags.map((tag, index) => (
                            <span
                              key={`${tag}-${index}`}
                              className="rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/20"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-dashed border-[var(--color-line)] px-3 py-1 text-xs font-semibold text-[var(--color-muted)]">
                            还没有个人标签
                          </span>
                        )}
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {profileMeta.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[20px] border border-white/80 bg-white/72 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                              {item.label}
                            </p>
                            <p className="mt-2 text-sm font-black text-[var(--color-ink)] sm:text-base">
                              {item.value}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">{item.hint}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {profileSignals.map((signal) => (
                      <div
                        key={signal.label}
                        className="rounded-[20px] border border-[var(--color-line)] bg-white/78 px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                          {signal.label}
                        </p>
                        <p className="mt-2 text-2xl font-black text-[var(--color-ink)]">{signal.value}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{signal.hint}</p>
                      </div>
                    ))}
                  </div>

                  {editingName ? (
                    <div className="mt-6 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="min-w-[220px] flex-1 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2 text-sm outline-none transition focus:border-[var(--color-brand)]"
                          maxLength={80}
                          onChange={(event) => setNewName(event.target.value)}
                          placeholder="昵称"
                          value={newName}
                        />
                        <button
                          className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-xs font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
                          disabled={
                            !newName.trim() ||
                            nameSaving ||
                            (newName === name &&
                              newBio === bio &&
                              JSON.stringify(newTags) === JSON.stringify(tags))
                          }
                          onClick={async () => {
                            if (!newName.trim()) return;
                            setNameSaving(true);
                            if (newName !== name) {
                              await setDisplayName(newName.trim());
                            }
                            try {
                              await getSupabaseClient()
                                .from("forum_profiles")
                                .upsert(
                                  { id: user!.id, bio: newBio.trim(), tags: newTags },
                                  { onConflict: "id" },
                                );
                              setBio(newBio.trim());
                              setTags([...newTags]);
                            } catch {
                              // ignore
                            }
                            setNameSaving(false);
                            setEditingName(false);
                          }}
                          type="button"
                        >
                          {nameSaving ? "保存中..." : "保存资料"}
                        </button>
                        <button
                          className="rounded-full border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-white"
                          onClick={() => setEditingName(false)}
                          type="button"
                        >
                          取消
                        </button>
                      </div>

                      <textarea
                        className="mt-4 w-full rounded-[20px] border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-3 text-sm leading-6 outline-none transition focus:border-[var(--color-brand)] resize-none"
                        maxLength={200}
                        onChange={(event) => setNewBio(event.target.value)}
                        placeholder="写一点你的使用场景、偏好模型或关注方向..."
                        rows={4}
                        value={newBio}
                      />

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {newTags.map((tag, index) => (
                          <span
                            key={`${tag}-${index}`}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/20"
                          >
                            {tag}
                            <button
                              className="ml-0.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                              onClick={() => setNewTags(newTags.filter((_, itemIndex) => itemIndex !== index))}
                              type="button"
                            >
                              x
                            </button>
                          </span>
                        ))}
                        {newTags.length < 5 ? (
                          <input
                            className="w-32 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-3 py-1 text-xs outline-none transition focus:border-[var(--color-brand)]"
                            maxLength={20}
                            onChange={(event) => setTagInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && tagInput.trim() && newTags.length < 5) {
                                event.preventDefault();
                                setNewTags([...newTags, tagInput.trim()]);
                                setTagInput("");
                              }
                            }}
                            placeholder="添加标签..."
                            value={tagInput}
                          />
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="space-y-6">
                <div className="rounded-[28px] border border-white/70 bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    行动入口
                  </p>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => (
                      <Link
                        key={action.title}
                        className="block rounded-[20px] border border-[var(--color-line)] bg-white/82 px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-brand)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                        href={action.href}
                      >
                        <p className="text-sm font-black text-[var(--color-ink)]">{action.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{action.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/70 bg-[var(--color-panel)] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    观察侧写
                  </p>
                  <div className="mt-4 space-y-4">
                    <div className="rounded-[20px] border border-[var(--color-line)] bg-white/78 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        活跃画像
                      </p>
                      <p className="mt-2 text-base font-black text-[var(--color-ink)]">
                        {totalContribution > 0 ? "持续参与型用户" : "待激活的新成员"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {totalContribution > 0
                          ? "你已经开始留下可回溯的讨论足迹，主页可以进一步沉淀成个人名片。"
                          : "先补充资料、发出第一条帖子，主页就会更像一个完整个人空间。"}
                      </p>
                    </div>
                    <div className="rounded-[20px] border border-[var(--color-line)] bg-white/78 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        关注站点
                      </p>
                      <p className="mt-2 text-base font-black text-[var(--color-ink)]">
                        {mostDiscussedStation
                          ? `${mostDiscussedStation.station} · ${mostDiscussedStation.count} 次提及`
                          : "还没有形成明确偏好"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {mostDiscussedStation
                          ? "这是你发帖中提及最多的站点，可继续沉淀为个人长期观察方向。"
                          : "多参与几个站点话题后，这里会更好地显示你的关注重心。"}
                      </p>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      {isConnected ? (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-end justify-between gap-4 border-b border-[var(--color-line)] pb-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    主页概览
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">资料、互动与足迹</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {overviewCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--color-ink)]">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{card.note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[22px] border border-[var(--color-line)] bg-[linear-gradient(135deg,rgba(37,99,235,0.06),rgba(255,255,255,0.72))] px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  资料补完建议
                </p>
                <div className="mt-3 space-y-2">
                  {!avatarUrl ? (
                    <p className="text-sm leading-6 text-[var(--color-muted)]">补一个头像，主页识别度会更高。</p>
                  ) : null}
                  {!bio.trim() ? (
                    <p className="text-sm leading-6 text-[var(--color-muted)]">写一段简介，说明常用模型或关注站点。</p>
                  ) : null}
                  {tags.length === 0 ? (
                    <p className="text-sm leading-6 text-[var(--color-muted)]">补 2-3 个标签，更容易形成个人风格。</p>
                  ) : null}
                  {avatarUrl && bio.trim() && tags.length > 0 ? (
                    <p className="text-sm leading-6 text-[var(--color-muted)]">资料区已经比较完整，接下来更适合多沉淀内容。</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex items-end justify-between gap-4 border-b border-[var(--color-line)] pb-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    最近足迹
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">你在社区里的最近动作</h2>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {footprintItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-[var(--color-ink)]">{item.title}</p>
                        <p className="mt-1 text-xs font-semibold text-[var(--color-muted)]">{item.meta}</p>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-brand-deep)]">{item.value}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--color-line)] px-6 py-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    内容档案
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-tight">按类型查看你的发帖、回复和点赞</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                    {activeTabDescription}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 rounded-full border border-[var(--color-line)] bg-[var(--color-soft)] p-1">
                  {activityTabs.map((tab) => {
                    const count =
                      tab.key === "posts"
                        ? posts.length
                        : tab.key === "replies"
                          ? replies.length
                          : likedPosts.length;

                    return (
                      <button
                        key={tab.key}
                        className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                          activeTab === tab.key
                            ? "bg-[var(--color-brand)] text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]"
                            : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                        }`}
                        onClick={() => setActiveTab(tab.key)}
                        type="button"
                      >
                        {tab.label} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm text-[var(--color-muted)]">正在加载你的个人内容档案...</p>
              </div>
            ) : (
              <>
                {activeTab === "posts" ? (
                  posts.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-[var(--color-ink)]">暂无发帖。</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        你的内容档案还是空的，去
                        <Link className="mx-1 font-semibold text-[var(--color-brand-deep)]" href="/community">
                          讨论区
                        </Link>
                        发出第一条公开观察吧。
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-line)]">
                      {posts.slice(0, 10).map((post) => (
                        <Link
                          key={post.issueNumber}
                          className="block px-6 py-5 transition hover:bg-[var(--color-hover)]"
                          href="/community"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                            {post.station ? (
                              <span className="rounded-full bg-[var(--color-soft)] px-2 py-0.5 font-bold text-[var(--color-brand-deep)]">
                                {post.station}
                              </span>
                            ) : null}
                            <span>{post.postedAt}</span>
                            <span>·</span>
                            <span>{post.likes} 赞</span>
                            <span>·</span>
                            <span>{post.replyCount} 回复</span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-base font-black text-[var(--color-ink)]">
                            {post.body}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                            这是你公开档案中的一条发言记录，回到讨论区可查看完整上下文。
                          </p>
                        </Link>
                      ))}
                    </div>
                  )
                ) : null}

                {activeTab === "replies" ? (
                  replies.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-[var(--color-ink)]">暂无回复。</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        还没有形成讨论轨迹，参与一次追问、补充或纠错后就会收进这里。
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-line)]">
                      {replies.map((item) => (
                        <Link
                          key={item.reply.id}
                          className="block px-6 py-5 transition hover:bg-[var(--color-hover)]"
                          href="/community"
                        >
                          <p className="text-xs text-[var(--color-muted)]">
                            回复了
                            <span className="mx-1 font-bold text-[var(--color-brand-deep)]">{item.postTitle}</span>
                            <span>{formatDateLabel(item.reply.postedAt)}</span>
                          </p>
                          <p className="mt-3 line-clamp-2 text-base font-black text-[var(--color-ink)]">
                            {item.reply.body}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )
                ) : null}

                {activeTab === "likes" ? (
                  likedPosts.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <p className="text-sm font-bold text-[var(--color-ink)]">暂无点赞。</p>
                      <p className="mt-2 text-sm text-[var(--color-muted)]">
                        这里还没有兴趣记录，点过赞的内容之后会自动归档在这里。
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-line)]">
                      {likedPosts.map((post) => (
                        <Link
                          key={post.issueNumber}
                          className="block px-6 py-5 transition hover:bg-[var(--color-hover)]"
                          href="/community"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                            {post.station ? (
                              <span className="rounded-full bg-[var(--color-soft)] px-2 py-0.5 font-bold text-[var(--color-brand-deep)]">
                                {post.station}
                              </span>
                            ) : null}
                            <span>{post.postedAt}</span>
                            <span>·</span>
                            <span>{post.likes} 赞</span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-base font-black text-[var(--color-ink)]">
                            {post.body}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                            这条内容进入过你的点赞记录，能反映你近期关注的方向。
                          </p>
                        </Link>
                      ))}
                    </div>
                  )
                ) : null}
              </>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
