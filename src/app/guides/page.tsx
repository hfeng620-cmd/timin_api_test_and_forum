"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { AuthButton } from "@/components/auth-button";
import { NotificationBell } from "@/components/notification-bell";
import { useForumAuth } from "@/lib/forum-auth";
import {
  collaborationChannels,
  faqEntries,
  guideCards,
  guideSteps,
  resourceLinks,
} from "@/lib/site-data";
import {
  CATEGORIES,
  loadApprovedGuides,
  submitGuide,
  type CreateGuideInput,
  type GuideCategory,
  type UserGuide,
} from "@/lib/guide-storage";

const quickGuideRoutes = [
  {
    title: "第一次来",
    description: "先看倍率、备注和试用入口，不要直接被最低价带走。",
    href: "#guide-flow",
  },
  {
    title: "我想先试用",
    description: "优先去看低门槛入口，再决定要不要长期用。",
    href: "#guide-resources",
  },
  {
    title: "我想参与共建",
    description: "分清 QQ 群、Discussions 和 Issues 各自该发什么。",
    href: "#guide-collaboration",
  },
  {
    title: "我只想快速找答案",
    description: "直接跳到 FAQ，把常见误区一次看完。",
    href: "#guide-faq",
  },
];

export default function GuidesPage() {
  const { isConnected, showAuthModal } = useForumAuth();
  const [userGuides, setUserGuides] = useState<UserGuide[]>([]);
  const [guidesLoading, setGuidesLoading] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");
  const [form, setForm] = useState<CreateGuideInput>({
    title: "",
    summary: "",
    body: "",
    category: "入门指南",
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  const loadGuides = useCallback(async () => {
    setGuidesLoading(true);
    try {
      const guides = await loadApprovedGuides();
      setUserGuides(guides);
    } catch {
      // ignore
    } finally {
      setGuidesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  async function handleSubmit() {
    if (!isConnected) {
      showAuthModal();
      return;
    }
    if (!form.title.trim() || !form.summary.trim() || !form.body.trim()) {
      setSubmitStatus("请填写完整信息。");
      return;
    }
    setSubmitting(true);
    setSubmitStatus("");
    try {
      await submitGuide(form);
      setSubmitStatus("投稿成功！指南已立即发布。");
      setForm({ title: "", summary: "", body: "", category: "入门指南", tags: [] });
      setShowSubmitForm(false);
    } catch (err) {
      setSubmitStatus(err instanceof Error ? err.message : "投稿失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && form.tags && form.tags.length < 5 && !form.tags.includes(tag)) {
      setForm({ ...form, tags: [...(form.tags ?? []), tag] });
      setTagInput("");
    }
  }

  function removeTag(index: number) {
    setForm({ ...form, tags: form.tags?.filter((_, i) => i !== index) ?? [] });
  }
  return (
    <main className="theme-stage min-h-screen bg-transparent text-[var(--color-ink)]">
      <section className="border-b border-[var(--color-line)] bg-[var(--color-header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4 lg:px-10">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand)] text-xl font-black text-[var(--color-on-brand)] shadow-[0_10px_30px_var(--color-panel-glow)]">
              T
            </div>
            <div>
              <p className="text-2xl font-black tracking-tight">Timix观察站</p>
              <p className="text-sm text-[var(--color-muted)]">常见问题与更多指南</p>
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
              <span className="rounded-full bg-[var(--color-brand)] px-4 py-2 text-sm font-semibold text-[var(--color-on-brand)] shadow-[0_10px_24px_var(--color-panel-glow)]">
                更多指南
              </span>
            </nav>
            <NotificationBell />
            <AuthButton />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div data-reveal className="surface-in mb-6 overflow-hidden rounded-[34px] border border-[var(--color-line)] bg-[var(--surface-gradient)] shadow-[var(--shadow-card)] backdrop-blur">
          <div className="grid gap-5 px-6 py-7 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-brand-deep)]">
                入门导航
              </p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                别从最杂的地方开始，先按你现在想解决的事进入。
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                这一页不只是 FAQ。它更像 Timix观察站 的使用地图，帮你判断先看榜单、先试用、先看社区反馈，还是先补一条纠错更划算。
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  className="rounded-full bg-[var(--color-brand)] px-5 py-3 text-sm font-bold text-[var(--color-on-brand)] shadow-[0_12px_24px_var(--color-panel-glow)]"
                  href="/stations"
                >
                  先去看榜单
                </Link>
                <Link
                  className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel)] px-5 py-3 text-sm font-bold text-[var(--color-ink)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-deep)]"
                  href="/community"
                >
                  去看社区反馈
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {quickGuideRoutes.map((item) => (
                <a
                  key={item.title}
                  className="stagger-in card-lift rounded-[22px] border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-[var(--color-brand)]"
                  href={item.href}
                >
                  <p className="text-base font-black text-[var(--color-ink)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{item.description}</p>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div id="guide-flow" data-reveal className="surface-in scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                先看这几个
              </p>
              <h1 className="mt-2 text-4xl font-black tracking-tight">
                先把第一次最容易问错的事讲清楚
              </h1>
              <p className="mt-4 text-sm leading-7 text-[var(--color-muted)]">
                首页先负责给你看榜单，这里负责把倍率怎么看、同站不同模型怎么拆、免费入口怎么判断，以及 QQ 群和 GitHub 共建入口分别拿来做什么说清楚。
              </p>
            </div>

            <div data-reveal className="surface-in rounded-[32px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                先按这个顺序看
              </p>
              <div className="mt-5 grid gap-4">
                {guideSteps.map((step) => (
                  <article
                    key={step.index}
                    className="stagger-in card-lift rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                      {step.index}
                    </p>
                    <h2 className="mt-2 text-xl font-bold">{step.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {step.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div data-reveal className="surface-in rounded-[32px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                新手指南
              </p>
              <div className="mt-5 grid gap-4">
                {guideCards.map((card) => (
                  <article
                    key={card.title}
                    className="stagger-in card-lift rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <h2 className="text-xl font-bold">{card.title}</h2>
                    <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div id="guide-resources" data-reveal className="surface-in scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-soft)] p-6 shadow-[var(--shadow-card)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                试用入口
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                这几条入口更适合先试水，再结合群友反馈判断要不要长期用。
              </p>
              <div className="mt-4 grid gap-3">
                {resourceLinks.map((item) => (
                  item.href.startsWith("http") ? (
                    <a
                      key={item.title}
                      className="stagger-in card-lift rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 transition hover:border-[var(--color-brand)]"
                      href={item.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <p className="font-bold text-[var(--color-brand-deep)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                    </a>
                  ) : (
                    <Link
                      key={item.title}
                      className="stagger-in card-lift rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-4 transition hover:border-[var(--color-brand)]"
                      href={item.href}
                    >
                      <p className="font-bold text-[var(--color-brand-deep)]">
                        {item.title}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                        {item.note}
                      </p>
                    </Link>
                  )
                ))}
              </div>
            </div>

            <div id="guide-collaboration" data-reveal className="surface-in scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
                共建入口
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                这站不是只读榜单。QQ 群负责第一时间发线索，Discussions 负责沉淀经验讨论，Issues 负责提交明确纠错，管理员审核后再把正式口径收进榜单。
              </p>
              <div className="mt-4 grid gap-3">
                {collaborationChannels.map((item) => (
                  <a
                    key={item.title}
                    className="stagger-in card-lift rounded-2xl border border-[var(--color-line)] bg-[var(--color-soft)] px-4 py-4 transition hover:border-[var(--color-brand)]"
                    href={item.href}
                    rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                  >
                    <p className="font-bold text-[var(--color-brand-deep)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                      {item.note}
                    </p>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div id="guide-faq" data-reveal className="surface-in scroll-mt-24 rounded-[32px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
              常见问题
            </p>
            <div className="mt-5 space-y-4">
              {faqEntries.map((item) => (
                <article
                  key={item.question}
                  className="stagger-in card-lift rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                >
                  <h2 className="text-lg font-bold">{item.question}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--color-muted)]">
                    {item.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* ---- User-submitted guides ---- */}
        <div className="mt-10">
          <div data-reveal className="surface-in rounded-[32px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-brand-deep)]">
                  社区指南
                </p>
                <h2 className="mt-2 text-2xl font-black">用户投稿的指南</h2>
                <p className="mt-2 text-sm text-[var(--color-muted)]">
                  这里展示社区用户投稿的指南，分享你的使用经验和避坑技巧。
                </p>
              </div>
              <button
                className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)]"
                onClick={() => {
                  if (!isConnected) {
                    showAuthModal();
                    return;
                  }
                  setShowSubmitForm(!showSubmitForm);
                }}
                type="button"
              >
                {showSubmitForm ? "取消投稿" : "投稿指南"}
              </button>
            </div>

            {/* Submit form */}
            {showSubmitForm && (
              <div className="mt-6 rounded-[24px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5">
                <h3 className="text-lg font-bold text-[var(--color-ink)]">投稿新指南</h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--color-muted)]">标题</label>
                    <input
                      className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      maxLength={200}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="指南标题（3-200字）"
                      value={form.title}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--color-muted)]">摘要</label>
                    <input
                      className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      maxLength={500}
                      onChange={(e) => setForm({ ...form, summary: e.target.value })}
                      placeholder="一句话概括（10-500字）"
                      value={form.summary}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--color-muted)]">分类</label>
                    <select
                      className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2.5 text-sm outline-none transition focus:border-[var(--color-brand)]"
                      onChange={(e) => setForm({ ...form, category: e.target.value as GuideCategory })}
                      value={form.category}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--color-muted)]">正文</label>
                    <textarea
                      className="w-full resize-none rounded-xl border border-[var(--color-line)] bg-[var(--color-input)] px-4 py-2.5 text-sm leading-6 outline-none transition focus:border-[var(--color-brand)]"
                      maxLength={10000}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="详细内容（20-10000字）"
                      rows={6}
                      value={form.body}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-[var(--color-muted)]">标签（最多5个）</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {form.tags?.map((tag, index) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full bg-[var(--color-brand)]/10 px-3 py-1 text-xs font-bold text-[var(--color-brand-deep)]"
                        >
                          {tag}
                          <button
                            className="ml-0.5 text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                            onClick={() => removeTag(index)}
                            type="button"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                      {(form.tags?.length ?? 0) < 5 ? (
                        <input
                          className="w-32 rounded-full border border-[var(--color-line)] bg-[var(--color-input)] px-3 py-1 text-xs outline-none transition focus:border-[var(--color-brand)]"
                          maxLength={20}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addTag();
                            }
                          }}
                          placeholder="回车添加"
                          value={tagInput}
                        />
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      className="rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-bold text-[var(--color-on-brand)] transition hover:bg-[var(--color-brand-deep)] disabled:opacity-50"
                      disabled={submitting}
                      onClick={handleSubmit}
                      type="button"
                    >
                      {submitting ? "发布中..." : "发布指南"}
                    </button>
                    {submitStatus && (
                      <span className="text-sm text-[var(--color-muted)]">{submitStatus}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* User guides list */}
            <div className="mt-6 space-y-4">
              {guidesLoading ? (
                <p className="text-sm text-[var(--color-muted)]">加载中...</p>
              ) : userGuides.length === 0 ? (
                <div className="rounded-[24px] bg-[var(--color-soft)] px-4 py-5 text-sm leading-7 text-[var(--color-muted)]">
                  还没有用户投稿的指南。点击上面的"投稿指南"按钮成为第一个贡献者！
                </div>
              ) : (
                userGuides.map((guide) => (
                  <article
                    key={guide.id}
                    className="stagger-in card-lift rounded-[26px] border border-[var(--color-line)] bg-[var(--color-soft)] p-5"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                      <span className="rounded-full bg-[var(--color-brand)]/10 px-2.5 py-1 font-bold text-[var(--color-brand-deep)]">
                        {guide.category}
                      </span>
                      <span>·</span>
                      <span className="font-semibold">{guide.authorName}</span>
                      <span>·</span>
                      <span>{new Date(guide.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-[var(--color-ink)]">{guide.title}</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{guide.summary}</p>
                    {guide.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {guide.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[var(--color-panel)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-muted)]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-brand-deep)] hover:text-[var(--color-brand)]">
                        查看完整指南
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--color-ink)]">
                        {guide.body}
                      </p>
                    </details>
                  </article>
                ))
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
