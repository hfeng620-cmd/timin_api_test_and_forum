"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

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

type ActivityEmptyState = {
  eyebrow: string;
  title: string;
  detail: string;
  primaryAction: { href: string; label: string };
  secondaryAction: { href: string; label: string };
};

type EmptyStateMetric = {
  label: string;
  value: string;
  hint: string;
};

type ShowcaseRow = {
  label: string;
  value: string;
  hint: string;
};

const activityTabs: { key: ActivityTab; label: string }[] = [
  { key: "posts", label: "发帖" },
  { key: "replies", label: "回复" },
  { key: "likes", label: "点赞" },
];

function ActivityEmptyCard({
  state,
  metrics,
  style,
}: {
  state: ActivityEmptyState;
  metrics: EmptyStateMetric[];
  style?: CSSProperties;
}) {
  return (
    <div
      className="mx-auto max-w-2xl rounded-[26px] border border-[var(--color-line)] bg-[linear-gradient(135deg,var(--color-brand-soft),var(--color-panel-strong))] px-4 py-7 text-center shadow-[var(--shadow-card)] sm:px-6 sm:py-8"
      style={style}
    >
      <span className="inline-flex rounded-full bg-[var(--color-panel)] px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-line)]">
        {state.eyebrow}
      </span>
      <h3 className="mt-4 text-2xl font-black tracking-tight text-[var(--color-ink)]">{state.title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-muted)]">{state.detail}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 text-left"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              {metric.label}
            </p>
            <p className="mt-2 text-sm font-black text-[var(--color-ink)]">{metric.value}</p>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{metric.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        <Link
          className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)]"
          href={state.primaryAction.href}
        >
          {state.primaryAction.label}
        </Link>
        <Link
          className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-2.5 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
          href={state.secondaryAction.href}
        >
          {state.secondaryAction.label}
        </Link>
      </div>
    </div>
  );
}

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

function formatProfileJoinDate(value?: string | null) {
  if (!value) return "加入时间未知";

  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch {
    return "加入时间未知";
  }
}

function createArchiveId(value?: string | null) {
  if (!value) return "PF-UNSET";
  return `PF-${value.slice(0, 8).toUpperCase()}`;
}

function normalizeTagList(value: string[]) {
  return Array.from(
    new Set(value.map((item) => item.trim()).filter((item) => item.length > 0)),
  ).slice(0, 5);
}

function useRevealInView<T extends HTMLElement>(threshold = 0.18) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible || typeof window === "undefined") return;
    const node = ref.current;
    if (!node) {
      setIsVisible(true);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsVisible(true);
      return;
    }

    // Immediately reveal if already in viewport
    const bounds = node.getBoundingClientRect();
    if (bounds.top < window.innerHeight && bounds.bottom > 0) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -5% 0px",
      },
    );

    observer.observe(node);

    // Safety fallback: reveal after 800ms
    const fallbackTimer = setTimeout(() => {
      setIsVisible(true);
    }, 800);

    return () => {
      observer.disconnect();
      clearTimeout(fallbackTimer);
    };
  }, [isVisible, threshold]);

  return { ref, isVisible };
}

function createRevealStyle(
  isVisible: boolean,
  delayMs = 0,
  distance = 24,
  scale = 0.985,
): CSSProperties {
  return {
    opacity: isVisible ? 1 : 0,
    transform: isVisible
      ? "translate3d(0, 0, 0) scale(1)"
      : `translate3d(0, ${distance}px, 0) scale(${scale})`,
    filter: isVisible ? "blur(0px)" : "blur(6px)",
    transition: [
      `opacity 560ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      `transform 560ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
      `filter 560ms cubic-bezier(0.16, 1, 0.3, 1) ${delayMs}ms`,
    ].join(", "),
    willChange: "opacity, transform, filter",
  };
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
        // Load avatar separately to avoid one failing column breaking everything
        const { data: profileData, error: profileError } = await getSupabaseClient()
          .from("forum_profiles")
          .select("avatar_url, bio")
          .eq("id", user.id)
          .single();

        if (profileError) {
          console.error("[Profile] Load avatar/bio error:", profileError.message);
        } else if (profileData) {
          if (profileData.avatar_url) setAvatarUrl(profileData.avatar_url);
          if (profileData.bio) setBio(profileData.bio);
        }

        // Try loading tags separately (column may not exist if migration not run)
        try {
          const { data: tagsData } = await getSupabaseClient()
            .from("forum_profiles")
            .select("tags")
            .eq("id", user.id)
            .single();
          if (tagsData && Array.isArray(tagsData.tags)) {
            setTags(normalizeTagList(tagsData.tags));
          }
        } catch (tagsErr) {
          console.warn("[Profile] Tags column may not exist:", tagsErr);
        }
      } catch (err) {
        console.error("[Profile] Load profile error:", err);
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
  const archiveId = createArchiveId(user?.id);
  const bioText = bio.trim();

  const joinDate = formatProfileJoinDate(user?.created_at);

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
  const introStatusLabel = bioText ? `已写 ${bioText.length} 字简介` : "简介仍待补充";
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
  const profilePresentationTone = bioText
    ? tags.length > 0
      ? "这张主页已经同时具备自我说明和标签侧写，别人进入时能更快读懂你在关注什么。"
      : "这段简介已经让主页更像个人名片，再补 2 到 3 个标签会更有辨识度。"
    : hasCustomName
      ? "昵称已经统一，但主页还缺一段能代表你的自我说明。"
      : "先统一昵称并补一句简介，主页会更像完整产品页，而不只是账户入口。";
  const identityConsistencyValue =
    hasCustomName && tags.length > 0
      ? "已统一"
      : hasCustomName || tags.length > 0
        ? "部分统一"
        : "待统一";
  const identityConsistencyHint =
    hasCustomName && tags.length > 0
      ? "昵称和标签已经开始形成稳定对外身份。"
      : hasCustomName
        ? "昵称已经固定，再补标签会更完整。"
        : tags.length > 0
          ? "标签已经有方向，再补昵称会更统一。"
          : "昵称、简介和标签补齐后，主页会更像可被识别的个人空间。";
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
  const identityFacts = [
    {
      label: "档案编号",
      value: archiveId,
    },
    {
      label: "加入 Timix",
      value: joinDate,
    },
    {
      label: "内容互动",
      value: `${totalContribution} 次`,
    },
    {
      label: "资料字段",
      value: `${profileCompleteness}/4 已填写`,
    },
  ];
  const profileCompletionItems = [
    { done: Boolean(avatarUrl), label: "头像", hint: "让主页识别度更高。" },
    { done: hasCustomName, label: "昵称", hint: "统一你的公开身份名称。" },
    { done: Boolean(bio.trim()), label: "简介", hint: "说明使用场景或关注方向。" },
    { done: tags.length > 0, label: "标签", hint: "补出个人观察风格。" },
  ];
  const showcaseRows: ShowcaseRow[] = [
    {
      label: "简介状态",
      value: bioText ? "已公开展示" : "仍待补充",
      hint: bioText ? "别人进入主页时，能先读到你的使用场景或关注方向。" : "建议补一句你常用的场景、模型偏好或观察站点。",
    },
    {
      label: "身份统一",
      value: identityConsistencyValue,
      hint: identityConsistencyHint,
    },
    {
      label: "观察焦点",
      value: mostDiscussedStation ? mostDiscussedStation.station : "仍在形成",
      hint: mostDiscussedStation
        ? `目前最常提及 ${mostDiscussedStation.station}，已经能形成对外识别点。`
        : "等你继续参与内容后，主页会逐步长出更明确的长期观察方向。",
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
  const activityEmptyStates: Record<ActivityTab, ActivityEmptyState> = {
    posts: {
      eyebrow: "公开发声",
      title: "你的发帖档案还没开始建立",
      detail:
        completenessPercent >= 75
          ? "资料已经准备得差不多了，现在只差第一条公开观察，让这张主页真正动起来。"
          : "先补头像、简介或标签，再发第一条帖子，主页会更有身份感和连续性。",
      primaryAction: { href: "/community", label: "去发第一条帖子" },
      secondaryAction: { href: "/stations", label: "先看看站点榜单" },
    },
    replies: {
      eyebrow: "讨论轨迹",
      title: "你的回复档案暂时还是空白",
      detail:
        postCount > 0
          ? "你已经开始公开发声，再参与几次追问、补充或纠错，主页会更像完整讨论档案。"
          : "先去讨论区浏览熟悉的话题，挑一条你愿意补充的内容留下回应。",
      primaryAction: { href: "/community", label: "去参与讨论" },
      secondaryAction: { href: "/stations", label: "先补充观察素材" },
    },
    likes: {
      eyebrow: "兴趣记录",
      title: "你的点赞偏好还没有沉淀出来",
      detail:
        uniqueStations > 0
          ? "你已经在一些站点话题里留下足迹，看到值得收藏的内容时点个赞，这里会开始形成兴趣侧写。"
          : "逛逛讨论区或榜单页，遇到认可的内容点个赞，这里就会逐步长出你的关注方向。",
      primaryAction: { href: "/community", label: "去逛讨论区" },
      secondaryAction: { href: "/stations", label: "看看站点榜单" },
    },
  };
  const activeEmptyState = activityEmptyStates[activeTab];
  const nextProfileSteps = profileCompletionItems
    .filter((item) => !item.done)
    .slice(0, 2)
    .map((item) => item.label);
  const activeEmptyStateMetrics: EmptyStateMetric[] =
    activeTab === "posts"
      ? [
          {
            label: "账号阶段",
            value: profileStage,
            hint: profileStageHint,
          },
          {
            label: "资料完成度",
            value: `${completenessPercent}% · ${profileCompleteness}/4`,
            hint: completionTone,
          },
        ]
      : activeTab === "replies"
        ? [
            {
              label: "已有发帖",
              value: `${postCount} 条`,
              hint: postCount > 0 ? "你已经有公开表达，可以继续补足对话层。" : "还没有发帖和回复记录。",
            },
            {
              label: "关注站点",
              value: `${uniqueStations} 个`,
              hint: mostDiscussedStation
                ? `目前最常提及 ${mostDiscussedStation.station}。`
                : "继续参与站点话题后会逐步形成焦点。",
            },
          ]
        : [
            {
              label: "点赞记录",
              value: `${likedCount} 条`,
              hint: "认可过的内容会在这里逐步沉淀成你的兴趣侧写。",
            },
            {
              label: "补完建议",
              value: `${profileCompleteness}/4 已填写`,
              hint:
                nextProfileSteps.length > 0
                  ? `优先补 ${nextProfileSteps.join("、")}，个人主页会更容易被读懂。`
                  : "资料已经完整，可以继续用点赞和互动沉淀关注方向。",
            },
          ];
  const activeArchiveCount =
    activeTab === "posts"
      ? posts.length
      : activeTab === "replies"
        ? replies.length
        : likedPosts.length;
  const archiveScopeLabel =
    activeTab === "posts"
      ? postCount > 10
        ? "当前展示最近 10 条发帖记录"
        : `当前展示 ${postCount} 条发帖记录`
      : activeTab === "replies"
        ? `当前展示 ${replies.length} 条回复记录`
        : `当前展示 ${likedPosts.length} 条点赞记录`;
  const { ref: heroSectionRef, isVisible: heroSectionVisible } = useRevealInView<HTMLDivElement>(0.12);
  const { ref: quickActionsRef, isVisible: quickActionsVisible } = useRevealInView<HTMLDivElement>(0.2);
  const { ref: showcaseAsideRef, isVisible: showcaseAsideVisible } = useRevealInView<HTMLDivElement>(0.2);
  const { ref: overviewRef, isVisible: overviewVisible } = useRevealInView<HTMLDivElement>(0.16);
  const { ref: footprintRef, isVisible: footprintVisible } = useRevealInView<HTMLDivElement>(0.16);
  const { ref: archiveRef, isVisible: archiveVisible } = useRevealInView<HTMLDivElement>(0.12);

  return (
    <main className="theme-stage min-h-screen bg-transparent text-[var(--color-ink)]">
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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--color-brand-soft),transparent_34%),radial-gradient(circle_at_85%_20%,var(--color-panel-glow),transparent_22%),linear-gradient(180deg,var(--color-panel),var(--color-soft))]" />
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {!isConnected ? (
            <div
              ref={heroSectionRef}
              className="overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
              style={createRevealStyle(heroSectionVisible, 0, 34, 0.978)}
            >
              <div className="border-b border-[var(--color-line)] px-6 py-8 sm:px-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl" style={createRevealStyle(heroSectionVisible, 90, 18, 0.992)}>
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
                        className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-4 shadow-[0_16px_34px_rgba(15,23,42,0.06)]"
                        style={createRevealStyle(heroSectionVisible, 150 + ["资料", "互动", "足迹"].indexOf(item.value) * 70, 20, 0.99)}
                      >
                        <p className="text-lg font-black text-[var(--color-ink)]">{item.value}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-6 py-8 text-center sm:px-8" style={createRevealStyle(heroSectionVisible, 260, 18, 0.992)}>
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
              <div
                ref={heroSectionRef}
                className="overflow-hidden rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-[transform,box-shadow] duration-700 hover:-translate-y-0.5 hover:shadow-[0_28px_92px_rgba(15,23,42,0.12)]"
                style={createRevealStyle(heroSectionVisible, 0, 34, 0.978)}
              >
                <div className="border-b border-[var(--color-line)] bg-[linear-gradient(135deg,var(--color-brand-soft),var(--color-panel-strong)_55%,var(--color-soft))] px-5 py-7 sm:px-8 sm:py-8">
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
                          <div className="mt-4 flex flex-wrap gap-2">
                            {identityFacts.map((item) => (
                              <div
                                key={item.label}
                                className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-1.5 text-xs text-[var(--color-muted)] shadow-[0_10px_22px_rgba(15,23,42,0.04)]"
                                style={createRevealStyle(heroSectionVisible, 120 + identityFacts.indexOf(item) * 45, 12, 0.996)}
                              >
                                <span className="font-semibold text-[var(--color-muted)]">{item.label}</span>
                                <span className="mx-1 text-[var(--color-line)]">·</span>
                                <span className="font-bold text-[var(--color-ink)]">{item.value}</span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
                            {profileHeadline}
                          </p>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                          <button
                            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
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
                            className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-center text-sm font-bold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)] transition hover:bg-[var(--color-brand-deep)]"
                            href="/community"
                          >
                            去讨论区
                          </Link>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                        <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                              个人说明
                            </p>
                            <span className="rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-[11px] font-bold text-[var(--color-brand-deep)] ring-1 ring-[var(--color-brand)]/15">
                              {introStatusLabel}
                            </span>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                            {bioText || "还没有留下个人简介，先补一句常用场景、偏好模型或关注方向，会更像完整主页。"}
                          </p>
                          <p className="mt-4 text-xs leading-6 text-[var(--color-muted)]">{profilePresentationTone}</p>
                        </div>

                        <div className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                              展示摘要
                            </p>
                            <span className="text-xs font-bold text-[var(--color-brand-deep)]">
                              {identityConsistencyValue}
                            </span>
                          </div>
                          <div className="mt-3 space-y-2">
                            {showcaseRows.map((row) => (
                              <div
                                key={row.label}
                                className="rounded-[16px] border border-[var(--color-line)] bg-[var(--color-soft)] px-3 py-3"
                                style={createRevealStyle(heroSectionVisible, 200 + showcaseRows.indexOf(row) * 55, 16, 0.994)}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                                    {row.label}
                                  </p>
                                  <span className="text-xs font-bold text-[var(--color-ink)]">{row.value}</span>
                                </div>
                                <p className="mt-2 text-xs leading-5 text-[var(--color-muted)]">{row.hint}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
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
                        </div>
                      </div>

                      <div className="mt-6 grid gap-3 sm:grid-cols-3">
                        {profileMeta.map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] backdrop-blur"
                            style={createRevealStyle(heroSectionVisible, 260 + profileMeta.indexOf(item) * 60, 18, 0.992)}
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

                      <div className="mt-4 rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)]">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                              档案完成进度
                            </p>
                            <p className="mt-2 text-sm font-black text-[var(--color-ink)]">
                              {completionTone}，已填写 {profileCompleteness}/4 项核心资料字段
                            </p>
                          </div>
                          <span className="text-sm font-black text-[var(--color-brand-deep)]">
                            {completenessPercent}%
                          </span>
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--color-soft)]">
                          <div
                            className="h-full rounded-full bg-[var(--color-brand)] transition-[width]"
                            style={{ width: `${completenessPercent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-6 sm:px-8">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {profileSignals.map((signal) => (
                      <div
                        key={signal.label}
                        className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition-transform duration-500 hover:-translate-y-0.5"
                        style={createRevealStyle(heroSectionVisible, 360 + profileSignals.indexOf(signal) * 65, 20, 0.992)}
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
                            const nextTags = normalizeTagList(newTags);
                            let saveSuccess = true;

                            if (newName !== name) {
                              await setDisplayName(newName.trim());
                            }

                            // Save bio first (always works)
                            try {
                              const { error: bioError } = await getSupabaseClient()
                                .from("forum_profiles")
                                .upsert(
                                  { id: user!.id, bio: newBio.trim() },
                                  { onConflict: "id" },
                                );
                              if (bioError) {
                                console.error("[Profile] Save bio error:", bioError.message);
                                saveSuccess = false;
                              }
                            } catch (err) {
                              console.error("[Profile] Save bio exception:", err);
                              saveSuccess = false;
                            }

                            // Try saving tags separately (column may not exist)
                            if (nextTags.length > 0) {
                              try {
                                const { error: tagsError } = await getSupabaseClient()
                                  .from("forum_profiles")
                                  .upsert(
                                    { id: user!.id, tags: nextTags },
                                    { onConflict: "id" },
                                  );
                                if (tagsError) {
                                  console.warn("[Profile] Tags save failed (column may not exist):", tagsError.message);
                                }
                              } catch (tagsErr) {
                                console.warn("[Profile] Tags column may not exist:", tagsErr);
                              }
                            }

                            if (saveSuccess) {
                              setBio(newBio.trim());
                              setTags(nextTags);
                            } else {
                              alert("保存失败，请检查网络后重试。");
                            }
                            setNameSaving(false);
                            setEditingName(false);
                          }}
                          type="button"
                        >
                          {nameSaving ? "保存中..." : "保存资料"}
                        </button>
                        <button
                          className="rounded-full border border-[var(--color-line)] px-3 py-2 text-xs font-semibold text-[var(--color-muted)] transition hover:bg-[var(--color-panel)]"
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
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                        <p>建议写使用场景、偏好模型、长期关注站点中的任意一项。</p>
                        <span>{newBio.trim().length}/200</span>
                      </div>

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
                                setNewTags(normalizeTagList([...newTags, tagInput]));
                                setTagInput("");
                              }
                            }}
                            placeholder="回车添加标签"
                            value={tagInput}
                          />
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-muted)]">
                        <p>标签越稳定，主页对外展示越统一。</p>
                        <span>{newTags.length}/5</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <aside className="space-y-6">
                <div
                  ref={quickActionsRef}
                  className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-6"
                  style={createRevealStyle(quickActionsVisible, 80, 28, 0.984)}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    行动入口
                  </p>
                  <div className="mt-4 space-y-3">
                    {quickActions.map((action) => (
                      <Link
                        key={action.title}
                        className="block rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 transition hover:-translate-y-0.5 hover:border-[var(--color-brand)] hover:bg-[var(--color-soft)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)]"
                        href={action.href}
                        style={createRevealStyle(quickActionsVisible, 140 + quickActions.indexOf(action) * 65, 18, 0.992)}
                      >
                        <p className="text-sm font-black text-[var(--color-ink)]">{action.title}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{action.description}</p>
                      </Link>
                    ))}
                  </div>
                </div>

                <div
                  ref={showcaseAsideRef}
                  className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-6"
                  style={createRevealStyle(showcaseAsideVisible, 150, 28, 0.984)}
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                    主页展示
                  </p>
                  <div className="mt-4 space-y-4">
                    <div
                      className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4"
                      style={createRevealStyle(showcaseAsideVisible, 220, 18, 0.992)}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        简介呈现
                      </p>
                      <p className="mt-2 text-base font-black text-[var(--color-ink)]">
                        {bioText ? "已经有对外自我说明" : "还缺一句能代表你的简介"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {profilePresentationTone}
                      </p>
                    </div>
                    <div
                      className="rounded-[20px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4"
                      style={createRevealStyle(showcaseAsideVisible, 290, 18, 0.992)}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                        身份统一
                      </p>
                      <p className="mt-2 text-base font-black text-[var(--color-ink)]">
                        {hasCustomName ? "昵称已统一" : "昵称仍待明确"}
                        {tags.length > 0 ? ` · ${tags.length} 个标签` : " · 暂无标签"}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {identityConsistencyHint}
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
            <div
              ref={overviewRef}
              className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-700 hover:-translate-y-0.5"
              style={createRevealStyle(overviewVisible, 0, 32, 0.982)}
            >
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
                    className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 transition-transform duration-500 hover:-translate-y-0.5"
                    style={createRevealStyle(overviewVisible, 90 + overviewCards.indexOf(card) * 60, 18, 0.992)}
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-[var(--color-ink)]">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{card.note}</p>
                  </div>
                ))}
              </div>

              <div
                className="mt-5 rounded-[22px] border border-[var(--color-line)] bg-[linear-gradient(135deg,var(--color-brand-soft),var(--color-panel))] px-4 py-4"
                style={createRevealStyle(overviewVisible, 340, 20, 0.992)}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                  资料补完建议
                </p>
                <div className="mt-3 grid gap-2">
                  {[
                    { done: Boolean(avatarUrl), label: "补一个头像", hint: "让主页识别度更高。" },
                    { done: Boolean(bio.trim()), label: "写一段简介", hint: "说明常用模型或关注站点。" },
                    { done: tags.length > 0, label: "加 2 到 3 个标签", hint: "更容易形成个人风格。" },
                    { done: totalContribution > 0, label: "留下第一条公开内容", hint: "让主页真正动起来。" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 rounded-[16px] border border-[var(--color-line)] bg-[var(--color-panel)] px-3 py-3"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                          item.done
                            ? "bg-[var(--color-brand)] text-[var(--color-on-brand)]"
                            : "bg-[var(--color-soft)] text-[var(--color-muted)]"
                        }`}
                      >
                        {item.done ? "✓" : "·"}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-[var(--color-ink)]">{item.label}</p>
                        <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{item.hint}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div
              ref={footprintRef}
              className="rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-700 hover:-translate-y-0.5"
              style={createRevealStyle(footprintVisible, 70, 32, 0.982)}
            >
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
                    className="rounded-[22px] border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 transition-transform duration-500 hover:-translate-y-0.5"
                    style={createRevealStyle(footprintVisible, 150 + footprintItems.indexOf(item) * 65, 18, 0.992)}
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

          <div
            ref={archiveRef}
            className="mt-6 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-panel)] shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-700 hover:-translate-y-0.5"
            style={createRevealStyle(archiveVisible, 60, 36, 0.98)}
          >
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
                  {activeArchiveCount > 0 ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                      {archiveScopeLabel}
                    </p>
                  ) : null}
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
                    <div className="px-4 py-8 sm:px-6 sm:py-10">
                      <ActivityEmptyCard
                        metrics={activeEmptyStateMetrics}
                        state={activeEmptyState}
                        style={createRevealStyle(archiveVisible, 120, 22, 0.992)}
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-line)]">
                      {posts.slice(0, 10).map((post) => (
                        <Link
                          key={post.issueNumber}
                          className="block px-6 py-5 transition hover:bg-[var(--color-hover)]"
                          href="/community"
                          style={createRevealStyle(archiveVisible, 100 + posts.slice(0, 10).indexOf(post) * 45, 18, 0.994)}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                            {post.station ? (
                              <span className="rounded-full bg-[var(--color-soft)] px-2 py-0.5 font-bold text-[var(--color-brand-deep)]">
                                {post.station}
                              </span>
                            ) : null}
                            <span>{formatDateLabel(post.postedAt)}</span>
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
                    <div className="px-4 py-8 sm:px-6 sm:py-10">
                      <ActivityEmptyCard
                        metrics={activeEmptyStateMetrics}
                        state={activeEmptyState}
                        style={createRevealStyle(archiveVisible, 120, 22, 0.992)}
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-line)]">
                      {replies.map((item) => (
                        <Link
                          key={item.reply.id}
                          className="block px-6 py-5 transition hover:bg-[var(--color-hover)]"
                          href="/community"
                          style={createRevealStyle(archiveVisible, 100 + replies.indexOf(item) * 45, 18, 0.994)}
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
                    <div className="px-4 py-8 sm:px-6 sm:py-10">
                      <ActivityEmptyCard
                        metrics={activeEmptyStateMetrics}
                        state={activeEmptyState}
                        style={createRevealStyle(archiveVisible, 120, 22, 0.992)}
                      />
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--color-line)]">
                      {likedPosts.map((post) => (
                        <Link
                          key={post.issueNumber}
                          className="block px-6 py-5 transition hover:bg-[var(--color-hover)]"
                          href="/community"
                          style={createRevealStyle(archiveVisible, 100 + likedPosts.indexOf(post) * 45, 18, 0.994)}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                            {post.station ? (
                              <span className="rounded-full bg-[var(--color-soft)] px-2 py-0.5 font-bold text-[var(--color-brand-deep)]">
                                {post.station}
                              </span>
                            ) : null}
                            <span>{formatDateLabel(post.postedAt)}</span>
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
