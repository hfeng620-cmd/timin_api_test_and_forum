"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

type GiscusMapping = "pathname" | "url" | "title" | "og:title" | "specific" | "number";
type GiscusInputPosition = "top" | "bottom";
type GiscusLoading = "lazy" | "eager";
type GiscusTheme =
  | "light"
  | "light_high_contrast"
  | "light_protanopia"
  | "dark"
  | "dark_high_contrast"
  | "dark_protanopia"
  | "dark_dimmed"
  | "transparent_dark"
  | "preferred_color_scheme"
  | `https://${string}`;

type GiscusFlag = boolean | "0" | "1";

export type GitHubDiscussionsEmbedProps = {
  repo?: string;
  repoId?: string;
  category?: string;
  categoryId?: string;
  mapping?: GiscusMapping;
  term?: string;
  strict?: GiscusFlag;
  reactionsEnabled?: GiscusFlag;
  emitMetadata?: GiscusFlag;
  inputPosition?: GiscusInputPosition;
  lang?: string;
  loading?: GiscusLoading;
  title?: string;
  eyebrow?: string;
  description?: string;
  signInNote?: string;
  className?: string;
  giscusScriptSrc?: string;
  theme?: GiscusTheme;
  lightTheme?: GiscusTheme;
  darkTheme?: GiscusTheme;
};

const defaultRepo = process.env.NEXT_PUBLIC_GISCUS_REPO ?? "";
const defaultRepoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID ?? "";
const defaultCategory = process.env.NEXT_PUBLIC_GISCUS_CATEGORY ?? "";
const defaultCategoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID ?? "";
const defaultTerm = process.env.NEXT_PUBLIC_GISCUS_TERM ?? "";

const darkSiteThemes = new Set(["cyber", "midnight"]);

function toGiscusFlag(value: GiscusFlag) {
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }

  return value;
}

function resolveGiscusTheme(lightTheme: GiscusTheme, darkTheme: GiscusTheme) {
  if (typeof document === "undefined") {
    return lightTheme;
  }

  const siteTheme = document.documentElement.dataset.theme;
  if (siteTheme && darkSiteThemes.has(siteTheme)) {
    return darkTheme;
  }

  if (!siteTheme && window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
    return darkTheme;
  }

  return lightTheme;
}

export function GitHubDiscussionsEmbed({
  repo = defaultRepo,
  repoId = defaultRepoId,
  category = defaultCategory,
  categoryId = defaultCategoryId,
  mapping = "pathname",
  term = defaultTerm,
  strict = "0",
  reactionsEnabled = "1",
  emitMetadata = "0",
  inputPosition = "bottom",
  lang = "zh-CN",
  loading = "lazy",
  title = "多人可见讨论区",
  eyebrow = "GitHub Discussions",
  description = "公开留言、反馈和补充会同步到 GitHub Discussions，适合静态页面长期展示。",
  signInNote = "使用 GitHub 账号登录后即可参与讨论。",
  className = "",
  giscusScriptSrc = "https://giscus.app/client.js",
  theme,
  lightTheme = "light",
  darkTheme = "transparent_dark",
}: GitHubDiscussionsEmbedProps) {
  const headingId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [resolvedTheme, setResolvedTheme] = useState<GiscusTheme>(theme ?? lightTheme);

  const isConfigured = Boolean(repo && repoId && category && categoryId);
  const discussionsUrl = repo ? `https://github.com/${repo}/discussions` : "";

  const scriptAttributes = useMemo(
    () => ({
      repo,
      repoId,
      category,
      categoryId,
      mapping,
      term,
      strict: toGiscusFlag(strict),
      reactionsEnabled: toGiscusFlag(reactionsEnabled),
      emitMetadata: toGiscusFlag(emitMetadata),
      inputPosition,
      lang,
      loading,
      theme: theme ?? resolvedTheme,
    }),
    [
      category,
      categoryId,
      emitMetadata,
      inputPosition,
      lang,
      loading,
      mapping,
      reactionsEnabled,
      repo,
      repoId,
      resolvedTheme,
      strict,
      term,
      theme,
    ],
  );

  useEffect(() => {
    if (theme) return;

    const syncTheme = () => setResolvedTheme(resolveGiscusTheme(lightTheme, darkTheme));
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const observer = new MutationObserver(syncTheme);

    syncTheme();
    observer.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });
    media?.addEventListener("change", syncTheme);

    return () => {
      observer.disconnect();
      media?.removeEventListener("change", syncTheme);
    };
  }, [darkTheme, lightTheme, theme]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !isConfigured) {
      return;
    }

    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = giscusScriptSrc;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", scriptAttributes.repo);
    script.setAttribute("data-repo-id", scriptAttributes.repoId);
    script.setAttribute("data-category", scriptAttributes.category);
    script.setAttribute("data-category-id", scriptAttributes.categoryId);
    script.setAttribute("data-mapping", scriptAttributes.mapping);
    script.setAttribute("data-strict", scriptAttributes.strict);
    script.setAttribute("data-reactions-enabled", scriptAttributes.reactionsEnabled);
    script.setAttribute("data-emit-metadata", scriptAttributes.emitMetadata);
    script.setAttribute("data-input-position", scriptAttributes.inputPosition);
    script.setAttribute("data-theme", scriptAttributes.theme);
    script.setAttribute("data-lang", scriptAttributes.lang);
    script.setAttribute("data-loading", scriptAttributes.loading);

    if (scriptAttributes.term) {
      script.setAttribute("data-term", scriptAttributes.term);
    }

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [giscusScriptSrc, isConfigured, scriptAttributes]);

  return (
    <section
      aria-labelledby={headingId}
      className={`rounded-[18px] border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
            {eyebrow}
          </p>
          <h2 id={headingId} className="mt-2 text-2xl font-black text-[var(--color-ink)]">
            {title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{description}</p>
        </div>

        {discussionsUrl ? (
          <a
            className="rounded-full border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-4 py-2 text-sm font-bold text-[var(--color-brand-deep)] transition hover:border-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
            href={discussionsUrl}
            rel="noreferrer"
            target="_blank"
          >
            打开 GitHub
          </a>
        ) : null}
      </div>

      {isConfigured ? (
        <div className="mt-6 overflow-hidden rounded-[14px] border border-[var(--color-line)] bg-[var(--color-panel-strong)]">
          <div
            className="min-h-[280px] px-3 py-4 sm:px-5 [&_.giscus]:min-h-[240px]"
            ref={containerRef}
          />
        </div>
      ) : (
        <div className="mt-6 rounded-[14px] border border-dashed border-[var(--color-line)] bg-[var(--color-soft)] px-5 py-6">
          <p className="text-sm font-bold text-[var(--color-ink)]">等待接入 GitHub Discussions</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            传入 repo、repoId、category 和 categoryId 后，这里会显示公开讨论区。
          </p>
        </div>
      )}

      {signInNote ? <p className="mt-4 text-xs leading-5 text-[var(--color-muted)]">{signInNote}</p> : null}
    </section>
  );
}

export default GitHubDiscussionsEmbed;
